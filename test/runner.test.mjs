import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, realpath, rm, writeFile, readdir, chmod } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { demoRepository } from '../scripts/demo.mjs';
import { createRun, loadRun, run } from '../scripts/runner.mjs';
import { FakeAdapter } from '../scripts/adapters/fake.mjs';
import { AgentUnavailable } from '../scripts/adapters/codex.mjs';
import { git, rollback } from '../scripts/git.mjs';
import { atomicJson, readJson, lock } from '../scripts/state.mjs';
import { validatePlan } from '../scripts/protocol.mjs';

async function fixture(t, tasks) {
  const repo = await demoRepository(tasks);
  const owned = await realpath(repo.cwd);
  const parent = await realpath(tmpdir());
  t.after(async () => {
    // Delete only the exact temporary directory created by this test.
    assert.equal(dirname(owned), parent);
    assert.ok(basename(owned).startsWith('autoship-demo-'));
    assert.equal(await realpath(repo.cwd), owned);
    await rm(owned, { recursive: true, force: true, maxRetries: 3 });
  });
  const state = await createRun({ ...repo, agent: 'fake' });
  return { ...repo, state, dir: join(state.common, 'autoship', 'runs', state.id) };
}

test('sequential handoff, one review, repair and local commits preserve the source checkout', async t => {
  const { cwd, state } = await fixture(t);
  const base = await git(cwd, ['rev-parse', 'HEAD']);
  const agent = new FakeAdapter();
  const result = await run(state, agent);
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.tasks.map(task => [task.status, task.attempts, task.repairs]), [['done', 1, 1], ['done', 1, 1]]);
  assert.deepEqual(agent.calls.map(call => `${call.taskId}/${call.phase}`), [
    'T01/implement', 'T01/review-code', 'T01/repair', 'T01/docs-sync',
    'T02/implement', 'T02/review-code', 'T02/repair', 'T02/docs-sync',
  ]);
  assert.equal(await git(cwd, ['rev-parse', 'HEAD']), base);
  assert.equal(await git(cwd, ['status', '--porcelain']), '');
  assert.equal(await git(result.workspace, ['rev-list', '--count', `${base}..HEAD`]), '2');
  assert.equal(await readFile(join(result.workspace, 'results', 'T02.txt'), 'utf8'), 'complete\n');
});

test('a fresh runner resumes the same attempt and never repeats the review', async t => {
  const { cwd, state } = await fixture(t);
  const first = new FakeAdapter();
  const partial = await run(state, first, { maxSteps: 2 });
  assert.equal(partial.tasks[0].phase, 'repair');
  const second = new FakeAdapter();
  const final = await run(await loadRun(cwd, state.id), second);
  assert.equal(final.status, 'completed');
  assert.equal([...first.calls, ...second.calls].filter(call => call.taskId === 'T01' && call.phase === 'review-code').length, 1);
  assert.equal(final.tasks[0].attempts, 1);
});

test('two repairs across three sessions roll back only the failed task and keep evidence', async t => {
  const { state, dir } = await fixture(t, [
    { id: 'T01', dependsOn: [] }, { id: 'T02', dependsOn: [] }, { id: 'T03', dependsOn: ['T01'] },
  ]);
  const agent = new FakeAdapter({ reviewIssue: false, failTasks: [] });
  const original = agent.run.bind(agent);
  agent.run = async request => {
    const outcome = await original(request);
    if (request.task.id === 'T01' && request.phase === 'review-code') {
      agent.options.failTasks.push('T01');
      outcome.result = { status: 'issues', summary: 'Defect', findings: ['Repair is required.'], deferred: [] };
    }
    return outcome;
  };
  const result = await run(state, agent);
  assert.equal(result.status, 'needs_attention');
  assert.deepEqual(result.tasks.map(task => task.status), ['paused', 'done', 'queued']);
  assert.equal(result.tasks[0].attempts, 3);
  assert.equal(agent.calls.filter(call => call.taskId === 'T01' && call.phase === 'repair').length, 6);
  assert.equal(agent.calls.filter(call => call.taskId === 'T01' && call.phase === 'review-code').length, 1);
  await assert.rejects(readFile(join(result.workspace, 'results', 'T01.txt')), { code: 'ENOENT' });
  assert.equal(await readFile(join(result.workspace, 'results', 'T02.txt'), 'utf8'), 'complete\n');
  for (const attempt of ['1', '2', '3']) {
    const diff = await readFile(join(dir, 'evidence', 'T01', attempt, 'failure', 'changes.stdout.log'), 'utf8');
    assert.match(diff, /broken/);
  }
});

test('saved agent result is reused after interruption before the state transition', async t => {
  const { state, dir } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  const original = agent.run.bind(agent);
  let before;
  agent.run = async request => {
    if (request.phase === 'implement') before = structuredClone(await readJson(join(dir, 'state.json')));
    return original(request);
  };
  await run(state, agent, { maxSteps: 1 });
  await atomicJson(join(dir, 'state.json'), before);
  const result = await run(state, agent);
  assert.equal(result.status, 'completed');
  assert.equal(agent.calls.filter(call => call.phase === 'implement').length, 1);
});

test('commit reconciliation does not create a second commit after interrupted state persistence', async t => {
  const { state, dir } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  const beforeCommit = await run(state, agent, { maxSteps: 3 });
  assert.equal(beforeCommit.tasks[0].phase, 'commit');
  const saved = structuredClone(beforeCommit);
  await run(beforeCommit, agent, { maxSteps: 1 });
  const head = await git(state.workspace, ['rev-parse', 'HEAD']);
  await atomicJson(join(dir, 'state.json'), saved);
  const final = await run(state, agent);
  assert.equal(final.status, 'completed');
  assert.equal(await git(state.workspace, ['rev-parse', 'HEAD']), head);
});

test('resuming an already-performed rollback preserves the original failure diff', async t => {
  const { state, dir } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ failTasks: ['T01'] });
  const partial = await run(state, agent, { maxSteps: 3 });
  assert.equal(partial.tasks[0].phase, 'rollback');
  const evidence = join(dir, 'evidence', 'T01', '1', 'failure');
  await rollback(partial, partial.tasks[0], evidence);
  const original = await readFile(join(evidence, 'changes.stdout.log'), 'utf8');
  assert.match(original, /broken/);
  const recovered = await run(partial, agent, { maxSteps: 1 });
  assert.equal(recovered.tasks[0].attempts, 2);
  assert.equal(await readFile(join(evidence, 'changes.stdout.log'), 'utf8'), original);
});

test('temporary host faults retry without consuming repair rounds', async t => {
  const { state } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  const original = agent.run.bind(agent);
  let calls = 0;
  agent.run = request => {
    if (++calls < 3) throw new AgentUnavailable('Temporary quota issue');
    return original(request);
  };
  const final = await run(state, agent);
  assert.equal(final.status, 'completed');
  assert.equal(final.tasks[0].attempts, 1);
  assert.equal(final.tasks[0].repairs, 0);
});

test('dirty source files, duplicate writers and invalid dependency plans are rejected without losing work', async t => {
  const { cwd, plan, state } = await fixture(t);
  const release = await lock(join(state.common, 'autoship', 'run.lock'));
  try { await assert.rejects(run(state, new FakeAdapter()), /in use/); }
  finally { await release(); }
  const invalid = structuredClone(plan);
  invalid.tasks[0].dependsOn = ['T02'];
  await assert.rejects(validatePlan(invalid, cwd), /Cyclic/);
  invalid.tasks[0].spec = '../outside.md#T01';
  await assert.rejects(validatePlan(invalid, cwd), /Invalid spec/);
  await writeFile(join(cwd, 'user-work.txt'), 'keep me');
  await assert.rejects(createRun({ cwd, plan, agent: 'fake' }), /uncommitted/);
  assert.equal(await readFile(join(cwd, 'user-work.txt'), 'utf8'), 'keep me');
  assert.ok((await readdir(join(state.common, 'autoship', 'runs'))).includes(state.id));
});

test('a reviewer waiting for input resumes its original independent session', async t => {
  const { state } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  const agent = new FakeAdapter({ reviewIssue: false });
  const original = agent.run.bind(agent);
  const reviewSessions = [];
  agent.run = async request => {
    const result = await original(request);
    if (request.phase === 'review-code') {
      reviewSessions.push(request.sessionId);
      if (reviewSessions.length === 1) result.result = { status: 'waiting', summary: 'Need external evidence.', findings: [], deferred: [] };
    }
    return result;
  };
  const waiting = await run(state, agent);
  assert.equal(waiting.status, 'waiting');
  assert.ok(waiting.tasks[0].reviewerSessionId);
  const final = await run(waiting, agent);
  assert.equal(final.status, 'completed');
  assert.deepEqual(reviewSessions, [null, waiting.tasks[0].reviewerSessionId]);
});

test('a pre-commit hook cannot silently replace already-verified content', async t => {
  const { state } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  const hook = join(state.common, 'hooks', 'pre-commit');
  await writeFile(hook, '#!/bin/sh\nprintf "broken\\n" > results/T01.txt\ngit add results/T01.txt\n');
  await chmod(hook, 0o755);
  await assert.rejects(run(state, new FakeAdapter({ reviewIssue: false })), /reconciliation/);
  const saved = await loadRun(state.repo, state.id);
  assert.equal(saved.status, 'waiting');
  assert.equal(saved.tasks[0].phase, 'commit');
  assert.equal(saved.tasks[0].status, 'running');
  assert.equal(await readFile(join(state.workspace, 'results', 'T01.txt'), 'utf8'), 'broken\n');
});

test('failed state loading preserves the stored file instead of overwriting it with a stale caller', async t => {
  const { state, dir } = await fixture(t, [{ id: 'T01', dependsOn: [] }]);
  await run(state, new FakeAdapter({ reviewIssue: false }), { maxSteps: 2 });
  const stateFile = join(dir, 'state.json');
  const damaged = '{"interrupted-write":';
  await writeFile(stateFile, damaged);
  await assert.rejects(run(state, new FakeAdapter()), SyntaxError);
  assert.equal(await readFile(stateFile, 'utf8'), damaged);
});
