import { readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { command, isAlive } from '../process.mjs';
import { atomicJson, optionalJson } from '../state.mjs';
import { resultSchema, validateResult } from '../protocol.mjs';
import { AgentUnavailable, hostError, metadataWriter } from './common.mjs';
export { AgentUnavailable } from './common.mjs';

export class CodexAdapter {
  name = 'codex';
  simulation = false;
  constructor({ program = process.env.AUTOSHIP_CODEX_COMMAND ?? 'codex', model, reviewModel, timeoutMs = 30 * 60_000 } = {}) {
    Object.assign(this, { program, model, reviewModel, timeoutMs });
  }
  async probe() {
    const result = await command(this.program, ['--version'], { timeoutMs: 10_000 });
    return { agent: this.name, available: result.code === 0, version: result.stdout.trim(), error: result.error || result.stderr.trim() || undefined };
  }
  async run(request) {
    const { evidenceDir, cwd, phase, prompt, signal } = request;
    const metaPath = join(evidenceDir, 'process.json');
    const output = join(evidenceDir, 'last-message.json');
    const previous = await optionalJson(metaPath);
    if (previous?.pid && !previous.exited && isAlive(previous.pid)) throw new AgentUnavailable(`Previous Codex process ${previous.pid} is still running; keeping its workspace.`, 'busy');
    // A parent crash can leave a complete Codex result without the runner envelope.
    try {
      const result = validateResult(JSON.parse(await readFile(output, 'utf8')));
      return { result, sessionId: previous?.sessionId ?? request.sessionId ?? null };
    } catch (error) {
      if (error.code !== 'ENOENT') await rename(output, `${output}.invalid-${Date.now()}`);
    }
    const schema = join(evidenceDir, 'schema.json');
    await atomicJson(schema, resultSchema);
    const sessionId = previous?.sessionId ?? request.sessionId;
    const sandbox = phase.startsWith('review') || phase === 'verify' ? 'read-only' : 'workspace-write';
    const args = ['exec'];
    if (sessionId) args.push('resume', sessionId);
    else args.push('--sandbox', sandbox);
    args.push('-c', 'approval_policy="never"', '-c', `sandbox_mode="${sandbox}"`, '--json', '--color', 'never');
    // resume lacks --color in the locally verified CLI.
    if (sessionId) args.splice(args.indexOf('--color'), 2);
    args.push('--output-schema', schema, '--output-last-message', output);
    const model = phase.startsWith('review') ? this.reviewModel ?? this.model : this.model;
    if (model) args.push('--model', model);
    args.push('-');
    let buffer = '';
    const meta = { pid: null, sessionId: sessionId ?? null, exited: false };
    const writer = metadataWriter(metaPath);
    const persist = () => writer.save(meta);
    let result;
    try { result = await command(this.program, args, {
      cwd, input: prompt, signal: signal ? AbortSignal.any([signal, writer.signal]) : writer.signal, timeoutMs: this.timeoutMs, log: join(evidenceDir, 'agent'),
      onSpawn: pid => { meta.pid = pid; persist(); },
      onStdout: chunk => {
        buffer += chunk;
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          try {
            const event = JSON.parse(line);
            if (event.type === 'thread.started' && event.thread_id) { meta.sessionId = event.thread_id; persist(); }
          } catch { /* Other output is retained in the raw log. */ }
        }
      },
    }); } finally { meta.exited = true; persist(); await writer.flush(); }
    if (result.code !== 0 || result.timedOut) throw hostError(result.error || result.stderr.trim() || `Codex exited ${result.code}${result.timedOut ? ' (timeout)' : ''}.`);
    try { return { result: validateResult(JSON.parse(await readFile(output, 'utf8'))), sessionId: meta.sessionId }; }
    catch (error) { throw new AgentUnavailable(`Codex result is not ready: ${error.message}`); }
  }
}
