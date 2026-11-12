import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { git } from './git.mjs';
import { atomicJson } from './state.mjs';

export async function demoRepository(tasks = [
  { id: 'T01', dependsOn: [] },
  { id: 'T02', dependsOn: ['T01'] },
]) {
  const cwd = await mkdtemp(join(tmpdir(), 'autoship-demo-'));
  await git(cwd, ['init', '-b', 'main']);
  await git(cwd, ['config', 'user.name', 'Autoship Demo']);
  await git(cwd, ['config', 'user.email', 'demo@autoship.invalid']);
  await git(cwd, ['config', 'commit.gpgsign', 'false']);
  await git(cwd, ['config', 'core.autocrlf', 'false']);
  const plan = {
    version: 1,
    tasks: tasks.map(task => ({ ...task, spec: `tasks.md#${task.id}`, checks: [{
      command: process.execPath,
      args: ['--input-type=module', '-e', `import {readFileSync} from 'node:fs'; import assert from 'node:assert/strict'; assert.equal(readFileSync('results/${task.id}.txt','utf8'),${JSON.stringify('complete\n')});`],
    }] })),
  };
  await writeFile(join(cwd, 'tasks.md'), `# Simulation tasks\n\n${tasks.map(task => `## ${task.id}: Demonstrate a handoff\n\nThe fixture writes results/${task.id}.txt containing complete and a newline. The command check must pass. This is a runner simulation, not an AI-built application.\n`).join('\n')}`);
  await atomicJson(join(cwd, 'execution.json'), plan);
  await git(cwd, ['add', '.']);
  await git(cwd, ['commit', '-m', 'Initialize isolated Autoship simulation']);
  return { cwd, plan };
}
