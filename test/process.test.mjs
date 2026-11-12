import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { command, isAlive } from '../scripts/process.mjs';

test('command arguments preserve spaces and shell metacharacters literally', async () => {
  const value = 'space 中文 `echo` $(echo) ; & "quoted"';
  const result = await command(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv[1]))', value]);
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.stdout), value);
});

test('cancellation terminates the spawned command and its descendant', { timeout: 10_000 }, async t => {
  const controller = new AbortController();
  let parent, descendant, buffer = '';
  t.after(() => {
    for (const pid of [descendant, parent]) {
      if (isAlive(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* Already exited. */ } }
    }
  });
  const script = `
    const {spawn} = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
    child.once('spawn', () => console.log(child.pid));
    setInterval(() => {}, 1000);
  `;
  await assert.rejects(command(process.execPath, ['-e', script], {
    signal: controller.signal, timeoutMs: 5_000,
    onSpawn: pid => { parent = pid; },
    onStdout: chunk => {
      buffer += chunk;
      if (buffer.includes('\n')) {
        descendant = Number(buffer.trim());
        controller.abort(new Error('test cancellation'));
      }
    },
  }), /test cancellation/);
  assert.ok(descendant > 0);
  for (let i = 0; i < 20 && (isAlive(parent) || isAlive(descendant)); i++) await delay(50);
  assert.equal(isAlive(parent), false);
  assert.equal(isAlive(descendant), false);
});
