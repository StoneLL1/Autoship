import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { command } from './process.mjs';
import { atomicJson, readJson, lock } from './state.mjs';
import { repository, git, prepareWorkspaceRoot, createWorktree, verifyWorkspace, assertHead, tree, rollback, commit, park, clearParkedWork, restoreParked } from './git.mjs';
import { validatePlan, taskState, taskDefinition } from './protocol.mjs';
import { AgentUnavailable } from './adapters/common.mjs';
import { invoke, rememberSession, persist, runDir } from './invoke.mjs';
import { workflowStep, readManifest, digest } from './workflow.mjs';

const accepted = task => task && ['done', 'deferred'].includes(task.status);

export async function createRun({ cwd, plan, workflow, manifest = null, agent = 'codex', agentConfig = {}, fallbacks = [],
  maxRepairs = 2, maxSessions = 3, fromHead = false, recovery = {} }) {
  for (const [name, value, min] of [['maxRepairs', maxRepairs, 0], ['maxSessions', maxSessions, 1]]) {
    if (!Number.isSafeInteger(value) || value < min) throw new Error(`Invalid ${name}.`);
  }
  const { root, common } = await repository(cwd);
  if (plan) await validatePlan(plan, root);
  else if (!workflow) throw new Error('Supply a confirmed plan or a new/feature workflow.');
  const release = await lock(join(common, 'autoship', 'run.lock'));
  try {
    const workspaceRoot = await prepareWorkspaceRoot(common);
    if (!fromHead && await git(root, ['status', '--porcelain'])) throw new Error('The source repository has uncommitted changes. Commit the intended baseline, or use --from-head to explicitly leave those changes out.');
    const id = randomUUID();
    const state = {
      version: 2, id, agent, agentConfig, fallbacks, simulation: agent === 'fake', repo: root, common,
      branch: `autoship/${id}`, workspaceRoot, workspace: join(workspaceRoot, id),
      base: await git(root, ['rev-parse', 'HEAD']), status: 'ready', revision: 0,
      limits: { maxRepairs, maxSessions }, recovery: { retries: 2, retryMs: 10_000, waitMs: 0, ...recovery }, current: null,
      tasks: plan?.tasks.map(taskState) ?? [], manifest,
    };
    if (workflow) {
      state.manifest = `docs/autoship/${id}/execution.json`;
      state.workflow = { ...workflow, stage: 'clarify', answers: [], brief: `docs/autoship/${id}/brief.md`,
        actor: { id: 'workflow', attempts: 1, repairs: 0, baseline: state.base, issues: [], deferred: [], sessionId: null, pending: null, review: null } };
    }
    await persist(state, 'created');
    await createWorktree(state);
    return state;
  } finally { await release(); }
}

export async function loadRun(cwd, id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid run ID.');
  const { common } = await repository(cwd);
  const state = await readJson(join(common, 'autoship', 'runs', id, 'state.json'));
  if (![1, 2].includes(state.version) || state.id !== id || resolve(state.common) !== resolve(common)) throw new Error('Run identity does not match this repository.');
  return state;
}

export async function taskChecks(state, task, dir, signal) {
  const failures = [], unavailable = [];
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < task.checks.length; i++) {
    const check = task.checks[i];
    const result = await command(check.command, check.args, { cwd: state.workspace, timeoutMs: check.timeoutMs, signal, log: join(dir, `check-${i}`) });
    if (result.error) unavailable.push(`Check ${i + 1} unavailable: ${result.error}`);
    else if (result.code !== 0 || result.timedOut) failures.push(`Check ${i + 1} failed: ${result.stderr.trim() || result.stdout.trim() || result.code}${result.timedOut ? ' (timeout)' : ''}`);
  }
  task.verifiedTree = failures.length || unavailable.length ? null : await tree(state);
  await atomicJson(join(dir, 'checks.json'), { failures, unavailable, tree: task.verifiedTree });
  return { failures, unavailable };
}

function repairOrRollback(state, task) {
  if (task.repairs < state.limits.maxRepairs) { task.repairs++; task.phase = 'repair'; }
  else task.phase = 'rollback';
}

async function parkTask(state, task, reason, kind) {
  const dir = join(runDir(state), 'evidence', task.id, String(task.attempts), `park-${randomUUID()}`);
  await park(state, task, dir);
  task.reason = reason; task.blocked = kind; task.previousEvidence = dir;
  task.status = 'parking';
  task.retryAt = kind === 'host' ? Date.now() + (state.recovery?.retryMs ?? 10_000) : null;
  await persist(state, `parking:${task.id}`);
  await clearParkedWork(state, task);
  task.status = 'waiting'; state.current = null; state.implementationContext = null;
  await persist(state, `parked:${task.id}`);
}

async function adoptPlan(state, active) {
  if (!state.manifest) return;
  const plan = await readManifest(state);
  const hash = digest(plan);
  if (hash === state.planHash) return;
  const definitions = new Map(plan.tasks.map(task => [task.id, task]));
  for (const old of state.tasks) {
    if (old.recoveryOf) continue;
    if (!definitions.has(old.id)) throw new Error(`Keep task ID ${old.id} in the manifest; removing or renaming it cannot erase its history.`);
    const next = taskDefinition(definitions.get(old.id));
    if (accepted(old) && digest(taskDefinition(old)) !== digest(next)) throw new Error(`Accepted task ${old.id} cannot be rewritten; add a new task for changed scope.`);
  }
  const repairs = state.tasks.filter(task => task.recoveryOf && !definitions.has(task.id));
  state.tasks = plan.tasks.map(definition => {
    const existing = state.tasks.find(task => task.id === definition.id);
    if (existing) { Object.assign(existing, taskDefinition(definition)); return existing; }
    return taskState(definition);
  }).concat(repairs);
  state.planHash = hash;
  active.planChanged = true;
}

export async function finishState(state) {
  const waiting = state.tasks.some(task => task.status === 'waiting');
  state.status = state.tasks.every(accepted) ? (state.tasks.some(task => task.status === 'deferred') ? 'completed_with_pending' : 'completed') : waiting ? 'waiting' : 'needs_attention';
  if (state.workflow && state.tasks.every(accepted)) state.workflow.stage = 'complete';
  const report = [`# Autoship ${state.simulation ? 'simulation ' : ''}${state.id}`, '', `Status: ${state.status}`, `Workspace: ${state.workspace}`, `Branch: ${state.branch}`, '',
    ...state.tasks.flatMap(task => [`## ${task.id}: ${task.status}`, task.commitSha ? `Commit: ${task.commitSha}` : task.reason ?? '',
      `Implementation attempts: ${task.attempts}; review rounds: ${task.review ? 1 : 0}.`,
      ...task.deferred.map(item => `- Pending verification: ${item}`), ...task.issues.map(item => `- Issue: ${item}`), '']),
    'See the project README for usage. Evidence and state remain in this run directory.', ''].join('\n');
  await writeFile(join(runDir(state), 'report.md'), report);
  await persist(state, state.status);
}

async function step(state, adapters, options) {
  const { signal } = options;
  if (state.workflow && !['execute', 'complete'].includes(state.workflow.stage)) return workflowStep(state, adapters, options);
  let task = state.tasks.find(item => item.id === state.current);
  if (!task) {
    task = state.tasks.find(item => item.status === 'queued' && item.dependsOn.every(id => accepted(state.tasks.find(dep => dep.id === id))))
      ?? state.tasks.find(item => item.status === 'waiting' && item.retryAt !== null && item.retryAt <= Date.now()
        && (!item.retriedThisRun || Date.now() < (options.waitUntil ?? 0)));
    if (!task) {
      const retryAt = Math.min(...state.tasks.filter(item => item.status === 'waiting' && item.retryAt !== null).map(item => item.retryAt));
      options.waitUntil ??= Date.now() + (state.recovery?.waitMs ?? 0);
      if (Number.isFinite(retryAt) && Date.now() < options.waitUntil) {
        await delay(Math.min(10_000, Math.max(10, retryAt - Date.now()), options.waitUntil - Date.now()), undefined, { signal });
        return true;
      }
      const inputTask = state.tasks.find(item => item.status === 'waiting' && item.blocked === 'user' && !item.budgetExhausted);
      if (inputTask && options.onInput) {
        const answer = await options.onInput(`${inputTask.id}: ${inputTask.reason}\n说明已解决的条件或补充决定：`);
        signal?.throwIfAborted();
        if (answer !== null && answer !== undefined) { inputTask.userMessage = answer; inputTask.retryAt = 0; delete inputTask.retriedThisRun; await persist(state, `user-answer:${inputTask.id}`); return true; }
      }
      await finishState(state); return false;
    }
    state.current = task.id;
    if (task.status === 'waiting') task.retriedThisRun = true;
    if (task.parked) { task.status = 'restoring'; await persist(state, `restoring:${task.id}`); }
    else {
      const prior = state.implementationContext;
      const sameGroup = task.sessionGroup && task.sessionGroup === prior?.group;
      const reuse = prior && prior.choice !== 'fresh' && (sameGroup || !task.sessionGroup && prior.choice === 'reuse');
      Object.assign(task, { status: 'running', phase: 'implement', attempts: task.attempts || 1, repairs: 0,
        baseline: await git(state.workspace, ['rev-parse', 'HEAD']), sessionId: reuse ? prior.sessionId : null,
        sessionAgent: reuse ? prior.agent : undefined });
      await persist(state, `started:${task.id}`);
    }
  }
  if (task.status === 'parking') {
    await clearParkedWork(state, task);
    task.status = 'waiting'; state.current = null;
    await persist(state, `parked:${task.id}`); return true;
  }
  if (task.status === 'restoring') {
    const parkedBase = task.parked.base;
    const conflicted = await restoreParked(state, task, () => persist(state, `restore-intent:${task.id}`));
    if (task.baseline !== parkedBase) { task.forceCheck = true; task.verifiedTree = null; }
    await persist(state, `restored-files:${task.id}`);
    if (conflicted) { task.returnPhase = task.phase; task.phase = 'recover'; task.issues.push('Resolve conflicts in restored work against the current accepted revision.'); task.pending = null; }
    else if (task.pending) task.pending.beforeTree = await tree(state);
    task.status = 'running'; task.parked = null; task.restore = null;
    await persist(state, `restored:${task.id}`);
  }
  if (task.phase === 'commit') {
    task.commitSha = await commit(state, task);
    task.status = task.deferred.length ? 'deferred' : 'done';
    state.implementationContext = { sessionId: task.sessionId, agent: task.sessionAgent, group: task.sessionGroup, choice: task.nextSession };
    task.phase = null; state.current = null;
    if (task.recoveryOf) {
      const original = state.tasks.find(item => item.id === task.recoveryOf);
      if (original) { original.deferred = [...task.deferred]; original.issues = []; original.status = task.status; original.verifiedBy = task.id; }
    }
    await persist(state, `committed:${task.id}`); return true;
  }
  if (task.phase === 'rollback') {
    const dir = join(runDir(state), 'evidence', task.id, String(task.attempts), 'failure');
    await rollback(state, task, dir);
    task.previousEvidence = dir; state.implementationContext = null;
    if (task.attempts >= (task.sessionLimit ?? state.limits.maxSessions)) { task.status = 'paused'; task.phase = null; state.current = null; }
    else { task.attempts++; task.repairs = 0; task.sessionId = null; task.phase = 'implement'; }
    task.pending = null;
    await persist(state, `rolled-back:${task.id}`); return true;
  }
  await assertHead(state, task.baseline);
  const phase = task.phase;
  let outcome;
  try { outcome = await invoke(state, task, adapters, options); }
  catch (error) {
    if (!(error instanceof AgentUnavailable) || error.kind === 'busy' || signal?.aborted) throw error;
    await parkTask(state, task, error.message, 'host');
    if (error.kind === 'budget') { task.retryAt = null; task.blocked = 'user'; task.budgetExhausted = true; await persist(state, 'session-budget'); }
    return true;
  }
  const { result, dir } = outcome;
  rememberSession(task, outcome);
  if (result.status === 'waiting') {
    task.pending = null;
    if (phase !== 'recover' && !task.recoveryTried && !phase.startsWith('review')) {
      task.recoveryTried = true; task.returnPhase = phase; task.phase = 'recover'; task.issues = [result.summary];
      await persist(state, `recover:${task.id}`); return true;
    }
    await parkTask(state, task, result.summary, 'user'); return true;
  }
  if (phase === 'review-code') task.review = { findings: result.findings, summary: result.summary, tree: outcome.afterTree, evidence: dir };
  task.deferred = [...new Set(phase === 'docs-sync' ? result.deferred : [...task.deferred, ...result.deferred])];
  task.issues = result.status === 'issues' ? (result.findings.length ? [...result.findings] : [result.summary]) : [];
  let checkAgain = task.forceCheck || ['implement', 'repair', 'recover'].includes(phase);
  if (phase === 'docs-sync') {
    const originalChecks = digest(task.checks);
    try { await adoptPlan(state, task); } catch (error) { task.issues.push(error.message); }
    const changed = (await git(state.workspace, ['diff', '--name-only', outcome.beforeTree, outcome.afterTree])).split('\n').filter(Boolean);
    checkAgain ||= originalChecks !== digest(task.checks) || changed.some(path => !/\.md$/i.test(path) && path !== 'progress.txt');
  }
  if (checkAgain) {
    const checked = await taskChecks(state, task, dir, signal);
    task.forceCheck = false;
    task.issues.push(...checked.failures);
    task.deferred = task.deferred.filter(item => !item.startsWith('Check ') || !item.includes(' unavailable:'));
    if (checked.unavailable.length && !task.recoveryTried) {
      task.pending = null;
      task.recoveryTried = true; task.returnPhase = phase; task.phase = 'recover'; task.issues.push(...checked.unavailable);
      await persist(state, `recover-checks:${task.id}`); return true;
    }
    task.deferred = [...new Set([...task.deferred, ...checked.unavailable])];
  }
  task.pending = null;
  if (task.issues.length) repairOrRollback(state, task);
  else if (phase === 'recover' && task.returnPhase?.startsWith('review')) { task.phase = task.returnPhase; task.returnPhase = null; }
  else if (['implement', 'repair', 'recover'].includes(phase) && !task.review) task.phase = 'review-code';
  else if (phase === 'docs-sync') {
    task.phase = 'commit';
    task.commit = { parent: task.baseline, tree: await tree(state), message: `autoship: ${task.id}\n\nAutoship-Run: ${state.id}` };
  } else task.phase = 'docs-sync';
  await persist(state, `finished:${task.id}:${phase}`); return true;
}

export async function run(state, adapter, options = {}) {
  const { signal, maxSteps = Infinity, fallbackAdapters = [] } = options;
  if (adapter.name !== state.agent || Boolean(adapter.simulation) !== state.simulation) throw new Error('Run agent does not match; simulation cannot replace a real agent.');
  if (!(maxSteps === Infinity || Number.isSafeInteger(maxSteps) && maxSteps >= 0)) throw new Error('steps must be a non-negative integer.');
  const adapters = [adapter, ...fallbackAdapters];
  for (const item of adapters) if (!/^[a-zA-Z0-9_-]+$/.test(item.name) || Boolean(item.simulation) !== state.simulation) throw new Error('Invalid fallback agent.');
  const release = await lock(join(state.common, 'autoship', 'run.lock'));
  let loaded = false;
  try {
    state = await loadRun(state.repo, state.id); loaded = true;
    await createWorktree(state); await verifyWorkspace(state);
    if (['completed', 'completed_with_pending'].includes(state.status)) return state;
    for (const task of state.tasks) {
      delete task.retriedThisRun;
      if (task.status === 'waiting' && (!options.taskId || options.taskId === task.id)) { task.retryAt = 0; if (options.reply !== undefined) task.userMessage = options.reply; }
    }
    options.waitUntil = Date.now() + (state.recovery?.waitMs ?? 0);
    state.status = 'running'; delete state.reason;
    await persist(state, 'resumed');
    for (let count = 0; count < maxSteps; count++) {
      signal?.throwIfAborted();
      if (!await step(state, adapters, options)) return state;
    }
    state.status = 'ready'; await persist(state, 'step-limit'); return state;
  } catch (error) {
    if (!loaded) throw error;
    state.status = signal?.aborted ? 'interrupted' : 'waiting'; state.reason = error.message;
    await persist(state, state.status);
    if (!signal?.aborted && !(error instanceof AgentUnavailable)) throw error;
    return state;
  } finally { await release(); }
}
