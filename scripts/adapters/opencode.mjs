import { jsonStream, probe } from './common.mjs';

export class OpenCodeAdapter {
  name = 'opencode'; simulation = false;
  constructor({ program = process.env.AUTOSHIP_OPENCODE_COMMAND ?? 'opencode', model, reviewModel, timeoutMs } = {}) { Object.assign(this, { program, model, reviewModel, timeoutMs }); }
  probe() { return probe(this.program, this.name); }
  run(request) {
    let texts = [];
    return jsonStream(request, this.program, sessionId => {
      const args = ['run', '--format', 'json'];
      if (sessionId) args.push('--session', sessionId);
      const model = request.phase.startsWith('review') ? this.reviewModel ?? this.model : this.model;
      if (model) args.push('--model', model);
      if (request.phase.startsWith('review') || request.phase === 'verify') args.push('--agent', 'plan');
      return args;
    }, event => {
      if (event.type === 'text' && event.part?.text) texts.push(event.part.text);
      return {
        sessionId: event.sessionID,
        reply: event.type === 'text' ? texts.at(-1) : undefined,
        error: event.type === 'error' ? event.error?.data?.message || event.error?.message || JSON.stringify(event.error) : undefined,
      };
    }, { timeoutMs: this.timeoutMs, reset: () => { texts = []; } });
  }
}
