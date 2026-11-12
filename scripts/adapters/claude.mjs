import { resultSchema } from '../protocol.mjs';
import { jsonStream, probe } from './common.mjs';
import { fileURLToPath } from 'node:url';

export class ClaudeAdapter {
  name = 'claude'; simulation = false;
  constructor({ program = process.env.AUTOSHIP_CLAUDE_COMMAND ?? 'claude', model, reviewModel, timeoutMs } = {}) { Object.assign(this, { program, model, reviewModel, timeoutMs }); }
  probe() { return probe(this.program, this.name); }
  run(request) {
    return jsonStream(request, this.program, sessionId => {
      const args = ['-p', '--verbose', '--output-format', 'stream-json', '--json-schema', JSON.stringify(resultSchema)];
      args.push('--add-dir', fileURLToPath(new URL('../../', import.meta.url)));
      for (const directory of request.readDirs ?? [request.evidenceDir]) args.push('--add-dir', directory);
      if (sessionId) args.push('--resume', sessionId);
      const model = request.phase.startsWith('review') ? this.reviewModel ?? this.model : this.model;
      if (model) args.push('--model', model);
      if (request.phase.startsWith('review') || request.phase === 'verify') args.push('--permission-mode', 'plan', '--disallowedTools', 'Edit,Write,NotebookEdit');
      else args.push('--permission-mode', 'acceptEdits');
      return args;
    }, event => ({
      sessionId: event.session_id,
      reply: event.type === 'result' && !event.is_error ? event.structured_output ?? event.result : undefined,
      error: event.type === 'result' && event.is_error ? event.result || event.errors?.join('\n') || 'Claude returned an error' : undefined,
    }), { timeoutMs: this.timeoutMs });
  }
}
