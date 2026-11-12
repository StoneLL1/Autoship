import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { lock } from './state.mjs';
import { loadRun, taskChecks, finishState } from './runner.mjs';
import { repository, git, verifyWorkspace } from './git.mjs';
import { invoke, rememberSession, persist, runDir } from './invoke.mjs';
import { taskState } from './protocol.mjs';
import { AgentUnavailable } from './adapters/common.mjs';

export async function configureRun(initial, update) {
  const release = await lock(join(initial.common, 'autoship', 'run.lock'));
  try { const state = await loadRun(initial.repo, initial.id); update(state); await persist(state, 'configuration'); return state; }
  finally { await release(); }
}

export async function listRuns(cwd) {
  const { common } = await repository(cwd);
  let ids;
  try { ids = await readdir(join(common, 'autoship', 'runs')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return Promise.all(ids.filter(id => /^[a-f0-9-]{36}$/.test(id)).map(async id => {
    try { const state = await loadRun(cwd, id); return { id, status: state.status, agent: state.agent, updatedAt: state.updatedAt, workspace: state.workspace }; }
    catch (error) { return { id, error: error.message }; }
  }));
}

export async function retryTask(cwd, id, taskId, message) {
  const initial = await loadRun(cwd, id);
  const release = await lock(join(initial.common, 'autoship', 'run.lock'));
  try {
    const state = await loadRun(cwd, id), task = state.tasks.find(item => item.id === taskId);
    if (!task || !['paused', 'waiting'].includes(task.status)) throw new Error('Choose a paused or waiting task.');
    if (state.current) throw new Error('Finish or resume the current task before retrying another one.');
    if (task.status === 'paused' || task.budgetExhausted) {
      task.sessionLimit = task.attempts + state.limits.maxSessions;
      if (task.status === 'paused') { task.attempts++; task.repairs = 0; task.status = 'queued'; task.sessionId = null; }
      else task.retryAt = 0;
      task.budgetExhausted = false;
    } else task.retryAt = 0;
    task.userMessage = message ?? 'The user explicitly requested another attempt; use the preserved failure evidence.';
    task.reason = null; state.status = 'ready';
    await persist(state, `user-retry:${task.id}`);
    return state;
  } finally { await release(); }
}

export async function verifyRun(initial, adapters, options = {}) {
  const release = await lock(join(initial.common, 'autoship', 'run.lock'));
  try {
    const state = await loadRun(initial.repo, initial.id);
    await verifyWorkspace(state);
    if (state.current || await git(state.workspace, ['status', '--porcelain'])) throw new Error('Resume the current work before verifying accepted tasks.');
    const candidates = state.tasks.filter(task => ['done', 'deferred'].includes(task.status) && (!options.taskId || task.id === options.taskId));
    if (options.taskId && !candidates.length) throw new Error('Choose a done or deferred task to verify.');
    for (const task of candidates) {
      const actor = { id: `${task.id}-verify`, spec: task.spec, phase: 'verify', attempts: 1, repairs: 0, baseline: await git(state.workspace, ['rev-parse', 'HEAD']),
        deferred: task.deferred, issues: [], sessionId: null, review: null, pending: null };
      const dir = join(runDir(state), 'verification', task.id, randomUUID());
      const checked = await taskChecks(state, task, dir, options.signal);
      let result = { status: 'ok', summary: 'Executable checks passed.', findings: [], deferred: checked.unavailable };
      if (task.deferred.length) {
        try {
          const outcome = await invoke(state, actor, adapters, { ...options, context: `Executable check evidence: ${dir}. Return only conditions that remain unverified. Leave product files unchanged.` });
          rememberSession(actor, outcome); result = outcome.result;
        } catch (error) {
          if (!(error instanceof AgentUnavailable) || error.kind === 'busy' || options.signal?.aborted) throw error;
          result = { status: 'waiting', summary: error.message, findings: [], deferred: [...task.deferred] };
        }
      }
      const issues = [...checked.failures, ...result.findings];
      if (result.status === 'issues' && !issues.length) issues.push(result.summary);
      task.deferred = [...new Set([...checked.unavailable, ...result.deferred, ...(result.status === 'waiting' ? [result.summary] : [])])];
      task.verificationEvidence = dir;
      if (issues.length) {
        let index = 1;
        while (state.tasks.some(item => item.id === `${task.id}-fix${index}`)) index++;
        const repair = taskState({ ...task, id: `${task.id}-fix${index}`, dependsOn: [] });
        repair.recoveryOf = task.id; repair.issues = issues; repair.deferred = [...task.deferred]; repair.previousEvidence = dir;
        state.tasks.push(repair);
        task.status = 'regressed'; task.issues = issues; task.repairTask = repair.id;
      } else { task.status = task.deferred.length ? 'deferred' : 'done'; task.issues = []; }
      await persist(state, `verified:${task.id}`);
    }
    state.status = state.tasks.some(task => task.status === 'queued') ? 'ready' : state.status;
    if (state.workflow && state.status === 'ready') state.workflow.stage = 'execute';
    if (state.status === 'ready') await persist(state, 'verification-finished');
    else await finishState(state);
    return state;
  } finally { await release(); }
}
