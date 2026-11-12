// Opt-in: invokes an installed real agent and may consume its existing allowance.
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialize } from './git.mjs';
import { createRun, run } from './runner.mjs';
import { createAdapter } from './adapters/index.mjs';
import { runDir } from './invoke.mjs';

const agent = process.argv[2];
if (!['codex', 'claude', 'opencode'].includes(agent)) throw new Error('Usage: node scripts/smoke.mjs codex|claude|opencode [model]');
const cwd = await mkdtemp(join(tmpdir(), `autoship-smoke-${agent}-`));
await writeFile(join(cwd, 'spec.md'), '# Confirmed smoke scope\n\n## T01: Word counter\n\nCreate count.mjs exporting countWords(text), returning zero for empty or whitespace-only text and splitting nonempty text on Unicode whitespace. Add README.md showing an import example. No dependencies or frontend. Verify several inputs. This is a real agent integration smoke, not a simulated Agent. The runner dispatches review and commits.\n');
await initialize(cwd, { adopt: true });
const state = await createRun({ cwd, agent, recovery: { retries: 0, retryMs: 0, waitMs: 0 }, plan: { version: 1, tasks: [{ id: 'T01', spec: 'spec.md#T01', dependsOn: [], checks: [{ command: process.execPath, args: ['--input-type=module', '-e', "import assert from 'node:assert/strict';import {countWords} from './count.mjs';assert.equal(countWords(''),0);assert.equal(countWords('  \t\n'),0);assert.equal(countWords('hello\u3000world'),2);assert.equal(countWords('  one two\nthree '),3);"], timeoutMs: 10000 }] }] } });
console.log(JSON.stringify({ agent, cwd, id: state.id, evidence: runDir(state) }));
const result = await run(state, createAdapter(agent, { model: process.argv[3], timeoutMs: 180000 }), { onEvent: console.log });
console.log(JSON.stringify({ status: result.status, reason: result.reason, tasks: result.tasks.map(task => ({ id: task.id, status: task.status, reason: task.reason, reviews: task.review ? 1 : 0 })), workspace: result.workspace }));
if (!['completed', 'completed_with_pending'].includes(result.status)) process.exitCode = 2;
