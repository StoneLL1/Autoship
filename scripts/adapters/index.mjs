import { CodexAdapter } from './codex.mjs';
import { ClaudeAdapter } from './claude.mjs';
import { OpenCodeAdapter } from './opencode.mjs';
import { FakeAdapter } from './fake.mjs';

export function createAdapter(name, options = {}) {
  const Agent = { codex: CodexAdapter, claude: ClaudeAdapter, opencode: OpenCodeAdapter, fake: FakeAdapter }[name];
  if (!Agent) throw new Error(`Unknown runtime agent: ${name}. Use codex, claude or opencode; WorkBuddy currently uses the exported Skills.`);
  return new Agent(options);
}
