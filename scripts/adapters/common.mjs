import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { command, isAlive } from '../process.mjs';
import { atomicJson, optionalJson } from '../state.mjs';
import { validateResult } from '../protocol.mjs';

export class AgentUnavailable extends Error {
  constructor(message, kind = 'transient') { super(message); this.kind = kind; }
}

export function hostError(message) {
  const kind = /quota|rate.?limit|429|usage.?limit|额度/i.test(message) ? 'quota'
    : /login|log.?in|auth|401|credential|登录/i.test(message) ? 'auth'
    : /permission|denied|sandbox|权限/i.test(message) ? 'permission' : 'transient';
  return new AgentUnavailable(message, kind);
}

export function parseReply(value) {
  if (typeof value === 'string') value = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  return validateResult(value);
}

export async function probe(program, name) {
  const result = await command(program, ['--version'], { timeoutMs: 10_000 });
  return { agent: name, available: result.code === 0, version: result.stdout.trim(), error: result.error || result.stderr.trim() || undefined };
}

export function metadataWriter(path) {
  const control = new AbortController();
  let pending = Promise.resolve(), failure;
  return {
    signal: control.signal,
    save(value) {
      const snapshot = { ...value };
      pending = pending.then(() => atomicJson(path, snapshot)).catch(error => { failure ??= error; control.abort(error); });
    },
    async flush() { await pending; if (failure) throw failure; },
  };
}

export async function jsonStream(request, program, args, decode, { timeoutMs, env, reset } = {}) {
  const dir = request.evidenceDir;
  const metaPath = join(dir, 'process.json');
  const previous = await optionalJson(metaPath);
  if (previous?.pid && !previous.exited && isAlive(previous.pid)) throw new AgentUnavailable(`Previous agent process ${previous.pid} is still running.`, 'busy');
  const cached = await optionalJson(join(dir, 'adapter-result.json'));
  if (cached) { validateResult(cached.result); return cached; }
  let buffer = '', reply, failure;
  const meta = { pid: null, sessionId: previous?.sessionId ?? request.sessionId ?? null, exited: false };
  const writer = metadataWriter(metaPath);
  const save = () => writer.save(meta);
  const consume = line => {
    let event; try { event = JSON.parse(line); } catch { return; }
    const decoded = decode(event);
    if (decoded.sessionId && decoded.sessionId !== meta.sessionId) { meta.sessionId = decoded.sessionId; save(); }
    if (decoded.reply !== undefined) reply = decoded.reply;
    if (decoded.error) failure = decoded.error;
  };
  // Recover a final event emitted before the parent died.
  try { for (const line of (await readFile(join(dir, 'agent.stdout.log'), 'utf8')).split('\n')) if (line.trim()) consume(line); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (reply !== undefined && !failure) {
    try { const outcome = { result: parseReply(reply), sessionId: meta.sessionId }; await writer.flush(); return outcome; } catch { reply = undefined; }
  }
  reply = undefined; failure = undefined; reset?.();
  const argv = await args(meta.sessionId);
  let result;
  try { result = await command(program, argv, {
    cwd: request.cwd, input: request.prompt, signal: request.signal ? AbortSignal.any([request.signal, writer.signal]) : writer.signal, timeoutMs: timeoutMs ?? 30 * 60_000,
    log: join(dir, 'agent'), env,
    onSpawn: pid => { meta.pid = pid; save(); },
    onStdout: chunk => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) { consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); }
    },
  }); } finally { meta.exited = true; save(); await writer.flush(); }
  if (buffer.trim()) consume(buffer);
  meta.exited = true; save(); await writer.flush();
  if (result.code !== 0 || result.timedOut || failure) throw hostError(failure || result.error || result.stderr || `Agent exited ${result.code}${result.timedOut ? ' (timeout)' : ''}`);
  let outcome;
  try { outcome = { result: parseReply(reply), sessionId: meta.sessionId }; }
  catch (error) { throw new AgentUnavailable(`Invalid agent response: ${error.message}`); }
  await atomicJson(join(dir, 'adapter-result.json'), outcome);
  return outcome;
}
