import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { launch } from './launch.mjs';

export function isAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}

// Arguments always travel as argv. No prompts, paths or user text enter a shell.
export async function command(program, args = [], options = {}) {
  const { cwd, input, signal, timeoutMs = 60_000, log, onSpawn, onStdout, env } = options;
  signal?.throwIfAborted();
  ({ program, args } = await launch(program, args));
  const writers = log ? [createWriteStream(`${log}.stdout.log`), createWriteStream(`${log}.stderr.log`)] : [];
  const writerResults = writers.map(writer => finished(writer).then(() => null, error => error));
  let stdout = '', stderr = '', failure, timedOut = false, stopping = false;
  const child = spawn(program, args, { cwd, env: env ? { ...process.env, ...env } : process.env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  const stop = () => {
    if (stopping || !child.pid) return;
    stopping = true;
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.on('error', () => child.kill());
    } else {
      const killGroup = signal => { try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
      killGroup('SIGTERM');
      const force = setTimeout(() => killGroup('SIGKILL'), 2_000);
      force.unref();
      child.once('close', () => clearTimeout(force));
    }
  };
  child.once('spawn', () => onSpawn?.(child.pid));
  child.on('error', error => { failure = error; });
  child.stdin.on('error', error => { if (error.code !== 'EPIPE') failure = error; });
  child.stdout.on('data', chunk => {
    stdout = (stdout + chunk).slice(-65_536);
    writers[0]?.write(chunk);
    onStdout?.(chunk);
  });
  child.stderr.on('data', chunk => {
    stderr = (stderr + chunk).slice(-65_536);
    writers[1]?.write(chunk);
  });
  const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
  timer.unref();
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) stop();
  child.stdin.end(input ?? '');
  const code = await new Promise(resolve => child.once('close', resolve));
  clearTimeout(timer);
  signal?.removeEventListener('abort', stop);
  for (const writer of writers) writer.end();
  const writeError = (await Promise.all(writerResults)).find(Boolean);
  signal?.throwIfAborted();
  if (writeError) throw writeError;
  return { code, stdout, stderr, error: failure?.message, timedOut };
}
