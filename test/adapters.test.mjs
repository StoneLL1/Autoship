import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath, chmod } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { ClaudeAdapter } from '../scripts/adapters/claude.mjs';
import { OpenCodeAdapter } from '../scripts/adapters/opencode.mjs';
import { CodexAdapter } from '../scripts/adapters/codex.mjs';
import { jsonStream } from '../scripts/adapters/common.mjs';
import { atomicJson } from '../scripts/state.mjs';
import { command } from '../scripts/process.mjs';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'autoship-adapter-'));
  const owned = await realpath(dir), parent = await realpath(tmpdir());
  t.after(async () => { assert.equal(dirname(owned), parent); assert.ok(basename(owned).startsWith('autoship-adapter-')); assert.equal(await realpath(dir), owned); await rm(owned, { recursive: true, force: true }); });
  return dir;
}
const response = { status: 'ok', summary: 'SIMULATION protocol fixture', findings: [], deferred: [], nextSession: 'reuse' };

test('stream recovery clears prior errors and resumes the recorded session', async t => {
  const dir = await fixture(t);
  await atomicJson(join(dir, 'process.json'), { sessionId: 'saved-session', exited: true });
  await writeFile(join(dir, 'agent.stdout.log'), JSON.stringify({ error: 'old quota error' }) + '\n');
  const outcome = await jsonStream({ cwd: dir, evidenceDir: dir, prompt: 'fixture' }, process.execPath,
    session => { assert.equal(session, 'saved-session'); return ['-e', `console.log(${JSON.stringify(JSON.stringify({ reply: response, sessionId: 'saved-session' }))})`]; }, event => event);
  assert.equal(outcome.result.status, 'ok'); assert.equal(outcome.sessionId, 'saved-session');
  const cached = await jsonStream({ cwd: dir, evidenceDir: dir }, 'not-a-real-program', () => [], event => event);
  assert.deepEqual(cached, outcome);
});

test('all CLI adapters pass prompts literally, decode results and resume role sessions', async t => {
  for (const [name, Agent] of [['claude', ClaudeAdapter], ['opencode', OpenCodeAdapter], ['codex', CodexAdapter]]) {
    const dir = await fixture(t), script = join(dir, 'node_modules', 'fixture', 'cli.cjs');
    await mkdir(dirname(script), { recursive: true });
    await writeFile(script, `#!/usr/bin/env node
const fs=require('node:fs');let prompt='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>prompt+=chunk);process.stdin.on('end',()=>{
fs.writeFileSync('received.json',JSON.stringify({args:process.argv.slice(2),prompt}));
if(process.argv.includes('--output-last-message'))fs.writeFileSync(process.argv[process.argv.indexOf('--output-last-message')+1],${JSON.stringify(JSON.stringify(response))});
console.log(JSON.stringify(${JSON.stringify(name === 'claude' ? { type: 'result', session_id: 'review-session', structured_output: response } : name === 'codex' ? { type: 'thread.started', thread_id: 'review-session' } : { type: 'text', sessionID: 'review-session', part: { text: JSON.stringify(response) } })}));
});\n`);
    let program = script;
    if (process.platform === 'win32') {
      program = join(dir, 'fixture.cmd');
      await writeFile(program, '@echo off\r\nnode "%~dp0node_modules\\fixture\\cli.cjs" %*\r\n');
    } else await chmod(script, 0o755);
    const agent = new Agent({ program, model: 'implementation', reviewModel: 'reviewer', timeoutMs: 10_000 });
    const prompt = 'literal $(do-not-execute) `text` & | "quotes"\n下一行';
    const outcome = await agent.run({ cwd: dir, evidenceDir: dir, phase: 'review-code', prompt, sessionId: 'prior-review' });
    assert.equal(outcome.result.summary, response.summary); assert.equal(outcome.sessionId, 'review-session');
    const received = JSON.parse(await readFile(join(dir, 'received.json'), 'utf8'));
    assert.equal(received.prompt, prompt); assert.ok(received.args.includes('prior-review'));
    assert.ok(received.args.includes('reviewer')); assert.ok(received.args.includes(name === 'codex' ? 'sandbox_mode="read-only"' : 'plan'));
    assert.equal(JSON.parse(await readFile(join(dir, 'process.json'), 'utf8')).exited, true);
  }
});

test('Windows npm wrappers run the actual CLI, never the successful prefix helper', { skip: process.platform !== 'win32' }, async t => {
  const dir = await fixture(t), bin = join(dir, 'node_modules', 'npm', 'bin');
  await mkdir(bin, { recursive: true });
  await writeFile(join(bin, 'npm-prefix.js'), 'console.log("prefix-only")');
  await writeFile(join(bin, 'npm-cli.js'), 'console.log("actual-test-command");process.exit(7)');
  const wrapper = join(dir, 'npm.cmd');
  await writeFile(wrapper, '@echo off\r\nSET "NPM_PREFIX_JS=%~dp0\\node_modules\\npm\\bin\\npm-prefix.js"\r\nSET "NPM_CLI_JS=%~dp0\\node_modules\\npm\\bin\\npm-cli.js"\r\nnode "%NPM_CLI_JS%" %*\r\n');
  const result = await command(wrapper, ['test'], { cwd: dir });
  assert.equal(result.code, 7); assert.equal(result.stdout.trim(), 'actual-test-command');
});

test('atomic state replacement survives a temporary Windows reader lock', { skip: process.platform !== 'win32' }, async t => {
  const dir = await fixture(t), state = join(dir, 'state.json');
  await atomicJson(state, { version: 1 });
  const script = `$handle = [IO.File]::Open('${state.replaceAll("'", "''")}', [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)\ntry { [Console]::Out.WriteLine("locked"); Start-Sleep -Milliseconds 250 } finally { $handle.Dispose() }`;
  let notify;
  const ready = new Promise(resolve => { notify = resolve; });
  const reader = command('powershell.exe', ['-NoProfile', '-Command', script], {
    cwd: dir, timeoutMs: 10000, onStdout: text => { if (text.includes('locked')) notify(); },
  });
  await Promise.race([ready, reader.then(result => { if (result.code !== 0) throw new Error(result.stderr); })]);
  await atomicJson(state, { version: 2 });
  assert.equal((await reader).code, 0);
  assert.deepEqual(JSON.parse(await readFile(state, 'utf8')), { version: 2 });
});
