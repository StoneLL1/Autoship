import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rm, realpath, mkdtemp, mkdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { demoRepository } from '../scripts/demo.mjs';
import { createRun, run, loadRun } from '../scripts/runner.mjs';
import { FakeAdapter } from '../scripts/adapters/fake.mjs';
import { AgentUnavailable } from '../scripts/adapters/common.mjs';
import { verifyRun, retryTask } from '../scripts/actions.mjs';
import { installSkills } from '../scripts/install.mjs';
import { git } from '../scripts/git.mjs';
import { readJson, atomicJson } from '../scripts/state.mjs';
import { invoke, persist } from '../scripts/invoke.mjs';
import { command } from '../scripts/process.mjs';
import { fileURLToPath } from 'node:url';
import { validatePlan } from '../scripts/protocol.mjs';

async function cleanup(t, path) {
  const owned = await realpath(path), parent = await realpath(tmpdir());
  t.after(async () => {
    assert.equal(dirname(owned), parent); assert.ok(basename(owned).startsWith('autoship-'));
    assert.equal(await realpath(path), owned);
    await rm(owned, { recursive: true, force: true, maxRetries: 3 });
  });
}
async function fixture(t, options = {}, tasks) {
  const repo = await demoRepository(tasks); await cleanup(t, repo.cwd);
  return { ...repo, state: await createRun({ ...repo, agent: 'fake', ...options }) };
}

test('new and feature workflows persist scope confirmation and perform one planning review', async t => {
  for (const kind of ['new', 'feature']) {
    const { cwd, state } = await fixture(t, { plan: undefined, workflow: { kind, idea: 'Small fixture project' } });
    const agent = new FakeAdapter({ reviewIssue: false });
    let result = await run(state, agent);
    assert.equal(result.status, 'needs_input'); assert.equal(result.workflow.stage, 'confirm');
    assert.equal(agent.calls.filter(call => call.phase.startsWith('plan-')).length, 0);
    result = await run(await loadRun(cwd, state.id), agent, { reply: '确认' });
    assert.equal(result.status, 'completed'); assert.equal(result.tasks.length, 1);
    assert.ok(result.workflow.confirmation.hash);
    assert.equal(agent.calls.filter(call => call.phase === 'review-plan').length, 1);
    assert.equal(agent.calls.filter(call => call.phase === 'review-code').length, 1);
    assert.equal(await git(cwd, ['rev-parse', 'HEAD']), state.base);
  }
});

test('tasks reuse implementation context while independent reviews and checkpoints stay distinct', async t => {
  const { state } = await fixture(t);
  const agent = new FakeAdapter({ reviewIssue: false, nextSession: 'reuse' });
  const result = await run(state, agent);
  assert.equal(result.status, 'completed');
  assert.equal(result.tasks[0].sessionId, result.tasks[1].sessionId);
  assert.notEqual(result.tasks[0].reviewerSessionId, result.tasks[1].reviewerSessionId);
  assert.notEqual(result.tasks[0].baseline, result.tasks[1].baseline);
  assert.deepEqual(result.tasks.map(task => task.attempts), [1, 1]);
});

test('unavailable task is parked, independent work commits, then both changes survive restoration', async t => {
  const { state } = await fixture(t, { recovery: { retries: 0, retryMs: 0 } }, [{ id: 'T01', dependsOn: [] }, { id: 'T02', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  let independentDone = false;
  const original = agent.run.bind(agent);
  agent.run = async request => {
    const result = await original(request);
    if (request.task.id === 'T01' && !independentDone) throw new AgentUnavailable('SIMULATION: temporary quota exhaustion', 'quota');
    if (request.task.id === 'T02' && request.phase === 'docs-sync') independentDone = true;
    return result;
  };
  const result = await run(state, agent);
  assert.equal(result.status, 'completed');
  assert.equal(result.tasks[0].baseline, result.tasks[1].commitSha);
  for (const task of result.tasks) assert.equal(await readFile(join(result.workspace, 'results', `${task.id}.txt`), 'utf8'), 'complete\n');
  assert.equal(result.tasks[0].attempts, 1);
});

test('permanently unavailable host yields instead of spinning with zero retry delay', async t => {
  const { state } = await fixture(t, { recovery: { retries: 0, retryMs: 0, waitMs: 0 } }, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter(); let calls = 0;
  agent.run = async () => { calls++; throw new AgentUnavailable('SIMULATION: offline'); };
  const result = await run(state, agent);
  assert.equal(result.status, 'waiting'); assert.equal(calls, 2);
  assert.equal(await git(result.workspace, ['status', '--porcelain']), '');
});

test('deferred checks can be cleared, and regression repair starts at current HEAD', async t => {
  const { state } = await fixture(t, {}, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  const original = agent.run.bind(agent);
  agent.run = async request => {
    const outcome = await original(request);
    if (request.phase === 'implement' && !request.task.recoveryOf) outcome.result.deferred = ['SIMULATION: external check pending'];
    if (request.task.recoveryOf && request.phase === 'implement') await writeFile(join(request.cwd, 'results', 'T01.txt'), 'complete\n');
    return outcome;
  };
  let result = await run(state, agent);
  assert.equal(result.status, 'completed_with_pending');
  result = await verifyRun(result, [agent]); assert.equal(result.status, 'completed');
  await writeFile(join(result.workspace, 'results', 'T01.txt'), 'regression\n');
  await git(result.workspace, ['add', '-A']); await git(result.workspace, ['commit', '-m', 'Simulate a later accepted regression']);
  const latest = await git(result.workspace, ['rev-parse', 'HEAD']);
  result = await verifyRun(result, [agent]);
  assert.equal(result.tasks[0].status, 'regressed'); assert.equal(result.tasks[1].recoveryOf, 'T01');
  result = await run(result, agent);
  assert.equal(result.status, 'completed'); assert.equal(result.tasks[1].baseline, latest);
  assert.equal(agent.calls.filter(call => call.taskId === 'T01' && call.phase === 'review-code').length, 1);
});

test('interrupted check resumes the saved implementation result instead of implementing again', async t => {
  const { state } = await fixture(t, {}, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  const control = new AbortController(), original = agent.run.bind(agent);
  agent.run = async request => { const result = await original(request); if (request.phase === 'implement') setTimeout(() => control.abort(), 120); return result; };
  let result = await run(state, agent, { signal: control.signal });
  assert.equal(result.status, 'interrupted');
  agent.run = original;
  result = await run(result, agent);
  assert.equal(result.status, 'completed');
  assert.equal(agent.calls.filter(call => call.phase === 'implement').length, 1);
});

test('docs sync can append a task without resetting existing history', async t => {
  const { cwd, plan } = await demoRepository([{ id: 'T01', dependsOn: [] }]); await cleanup(t, cwd);
  const state = await createRun({ cwd, plan, agent: 'fake', manifest: 'execution.json' });
  const agent = new FakeAdapter({ reviewIssue: false }); const original = agent.run.bind(agent);
  agent.run = async request => {
    const result = await original(request);
    if (request.phase === 'docs-sync' && request.task.id === 'T01') {
      const next = await readJson(join(request.cwd, 'execution.json'));
      next.tasks.push({ ...next.tasks[0], id: 'T02', dependsOn: ['T01'] });
      await atomicJson(join(request.cwd, 'execution.json'), next);
    }
    return result;
  };
  const result = await run(state, agent);
  assert.equal(result.status, 'completed'); assert.equal(result.tasks.length, 2);
  assert.equal(agent.calls.filter(call => call.taskId === 'T01' && call.phase === 'review-code').length, 1);
});

test('exported Skills have local references and refuse accidental overwrite', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'autoship-skills-')); await cleanup(t, dir);
  const exported = await installSkills(dir); assert.ok(exported.files > 10);
  const entry = join(dir, 'autoship', 'SKILL.md');
  assert.match(await readFile(entry, 'utf8'), /references\/runtime\.md/);
  assert.match(await readFile(join(dir, 'autoship', 'stages', 'split-tasks.md'), 'utf8'), /\.\.\/references\/runtime\.md/);
  await writeFile(entry, 'user customization');
  await assert.rejects(installSkills(dir), /Existing skill differs/);
  assert.equal(await readFile(entry, 'utf8'), 'user customization');
  await installSkills(dir, { force: true });
});

test('fallback result keeps its invocation identity when switching increases the session count', async t => {
  const { state } = await fixture(t, { recovery: { retries: 0 } }, [{ id: 'T01', dependsOn: [] }]);
  const task = state.tasks[0];
  Object.assign(task, { attempts: 1, phase: 'implement', baseline: state.base, sessionAgent: 'fake', sessionId: 'prior' });
  const primary = new FakeAdapter(); primary.run = async () => { throw new AgentUnavailable('SIMULATION: quota exhausted'); };
  const fallback = new FakeAdapter({ reviewIssue: false }); fallback.name = 'alternative';
  await persist(state, 'fixture');
  const first = await invoke(state, task, [primary, fallback]);
  assert.equal(task.attempts, 2);
  const loaded = await loadRun(state.repo, state.id);
  const second = await invoke(loaded, loaded.tasks[0], [primary, fallback]);
  assert.equal(first.dir, second.dir); assert.equal(fallback.calls.length, 1);
});

test('a fresh user answer wakes a waiting task after the automatic retry window has closed', async t => {
  const { state } = await fixture(t, { recovery: { waitMs: 0 } }, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false }), original = agent.run.bind(agent);
  agent.run = async request => {
    const outcome = await original(request);
    if (['implement', 'recover'].includes(request.phase) && request.task.userMessage !== 'second') outcome.result = { status: 'waiting', summary: 'SIMULATION: give more detail', findings: [], deferred: [] };
    return outcome;
  };
  const answers = ['first', 'second']; let questions = 0;
  const result = await run(state, agent, { onInput: async () => { questions++; return answers.shift() ?? null; } });
  assert.equal(result.status, 'completed'); assert.equal(questions, 2);
});

test('restoring a waiting reviewer onto newer commits reruns checks without a second review', async t => {
  const { cwd, plan } = await demoRepository([{ id: 'T01', dependsOn: [] }, { id: 'T02', dependsOn: [] }]); await cleanup(t, cwd);
  plan.tasks[0].checks.push({ command: process.execPath, args: ['-e', "if(require('node:fs').existsSync('incompatible.txt')) process.exit(1)"] });
  const state = await createRun({ cwd, plan, agent: 'fake' });
  const agent = new FakeAdapter({ reviewIssue: false }); const original = agent.run.bind(agent);
  let parked = false;
  agent.run = async request => {
    const outcome = await original(request);
    if (request.task.id === 'T01' && request.phase === 'review-code' && !parked) {
      parked = true; outcome.result = { status: 'waiting', summary: 'SIMULATION: need input', findings: [], deferred: [] };
    }
    if (request.task.id === 'T02' && request.phase === 'implement') await writeFile(join(request.cwd, 'incompatible.txt'), 'regression');
    if (request.task.id === 'T01' && request.phase === 'repair') await unlink(join(request.cwd, 'incompatible.txt'));
    return outcome;
  };
  let result = await run(state, agent); assert.equal(result.status, 'waiting');
  result = await run(result, agent);
  assert.equal(result.status, 'completed'); assert.equal(result.tasks[0].repairs, 1);
  // First invocation requested input; only the resumed invocation completed the one review.
  assert.equal(agent.calls.filter(call => call.taskId === 'T01' && call.phase === 'review-code').length, 2);
});

test('explicit retry extends an exhausted fallback budget and preserves the completed review', async t => {
  const { state } = await fixture(t, { maxSessions: 1, recovery: { retries: 0 } }, [{ id: 'T01', dependsOn: [] }]);
  const primary = new FakeAdapter({ reviewIssue: false }), original = primary.run.bind(primary);
  primary.run = async request => { if (request.phase === 'docs-sync') throw new AgentUnavailable('SIMULATION: offline'); return original(request); };
  const fallback = new FakeAdapter({ reviewIssue: false }); fallback.name = 'alternative';
  let result = await run(state, primary, { fallbackAdapters: [fallback] });
  assert.equal(result.tasks[0].budgetExhausted, true); assert.equal(fallback.calls.length, 0);
  result = await retryTask(state.repo, state.id, 'T01');
  result = await run(result, primary, { fallbackAdapters: [fallback] });
  assert.equal(result.status, 'completed'); assert.equal(result.tasks[0].attempts, 2);
  assert.equal(primary.calls.filter(call => call.phase === 'review-code').length, 1);
  assert.equal(fallback.calls.filter(call => call.phase === 'review-code').length, 0);
});

test('CLI new completes a confirmed simulated project from an empty directory', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'autoship-cli-')); await cleanup(t, dir);
  const cli = fileURLToPath(new URL('../scripts/autoship.mjs', import.meta.url));
  const result = await command(process.execPath, [cli, 'new', 'Small fixture', '--cwd', dir, '--agent', 'fake', '--offline'], { input: '确认\n', timeoutMs: 90000 });
  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /SIMULATION/); assert.match(result.stdout, /: completed/);
  const listing = await command(process.execPath, [cli, 'list', '--cwd', dir]);
  const [record] = JSON.parse(listing.stdout);
  assert.ok(record.workspace.startsWith(join(dir, '.autoship', 'worktrees')));
  assert.equal(await git(dir, ['status', '--porcelain']), '');
});

test('docs sync can retire a superseded verification note while keeping unresolved conditions', async t => {
  const { state } = await fixture(t, {}, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false }), original = agent.run.bind(agent);
  agent.run = async request => {
    const result = await original(request);
    if (request.phase === 'review-code') result.result.deferred = ['Reviewer could not rerun tests', 'POSIX execution unverified'];
    if (request.phase === 'docs-sync') result.result.deferred = ['POSIX execution unverified'];
    return result;
  };
  const result = await run(state, agent);
  assert.deepEqual(result.tasks[0].deferred, ['POSIX execution unverified']);
});

test('interrupting a clarification question preserves it for the next invocation', async t => {
  const { state } = await fixture(t, { plan: undefined, workflow: { kind: 'new', idea: 'Small fixture' } });
  const control = new AbortController();
  const result = await run(state, new FakeAdapter(), { signal: control.signal, onInput: async () => { control.abort(); return null; } });
  assert.equal(result.status, 'interrupted');
  assert.equal(result.workflow.stage, 'confirm'); assert.ok(result.workflow.question);
});

test('frontend manifests require design and interaction documents before execution', async t => {
  const { cwd, plan } = await fixture(t);
  plan.frontend = true;
  await assert.rejects(validatePlan(plan, cwd), /design\.md/);
  await writeFile(join(cwd, 'design.md'), '# Design\nUse readable typography and clear visual hierarchy.');
  await assert.rejects(validatePlan(plan, cwd), /app_flow\.md/);
  await writeFile(join(cwd, 'app_flow.md'), '# Flow\nOpen file → read → recover from errors without losing content.');
  assert.equal(await validatePlan(plan, cwd), plan);
});
