import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { atomicJson, optionalJson, saveState } from './state.mjs';
import { assertHead, tree } from './git.mjs';
import { validatePhase, validateResult, specText } from './protocol.mjs';
import { AgentUnavailable } from './adapters/common.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const runDir = state => join(state.common, 'autoship', 'runs', state.id);
export const persist = (state, event) => saveState(runDir(state), state, event);

export async function invoke(state, actor, adapters, { signal, onEvent, context = '' } = {}) {
  const phase = actor.phase;
  validatePhase(phase);
  if (!actor.pending) {
    actor.pending = { id: randomUUID(), phase, attempt: actor.attempts, beforeTree: await tree(state) };
    await persist(state, `invoke:${actor.id}:${phase}`);
  }
  const dir = join(runDir(state), 'evidence', actor.id, String(actor.pending.attempt ?? actor.attempts), actor.pending.id);
  await mkdir(dir, { recursive: true });
  const cached = await optionalJson(join(dir, 'result.json'));
  if (cached) {
    validateResult(cached.result);
    if (await tree(state) !== cached.afterTree) throw new Error('Workspace differs from the saved agent result; preserving it for inspection.');
    return { ...cached, dir };
  }
  const source = phase === 'docs-sync' ? join(projectRoot, 'skills', 'autoship-docs-sync', 'SKILL.md')
    : join(projectRoot, 'skills', 'autoship', 'stages', `${phase}.md`);
  const prompt = [await readFile(source, 'utf8'),
    `Instruction source: ${source}. Resolve its relative references from that file.\nWorkspace: ${state.workspace}\nWork: ${actor.id}\nBaseline: ${actor.baseline}\nPhase: ${phase}`,
    actor.spec ? `Task spec (${actor.spec}):\n${await specText(state.workspace, actor.spec)}` : '', context,
    `Existing review: ${JSON.stringify(actor.review?.findings ?? [])}\nCurrent issues: ${JSON.stringify(actor.issues ?? [])}\nPending verification: ${JSON.stringify(actor.deferred ?? [])}`,
    actor.userMessage ? `User's follow-up: ${actor.userMessage}` : '',
    actor.previousEvidence ? `Prior attempt/parked work evidence: ${actor.previousEvidence}` : '',
    `Evidence: ${dir}. Read AGENTS.md and related project documents as needed. Work in the assigned worktree. The runner owns Git commits, reset, retries and review dispatch.`,
    'Return JSON: status (ok/issues/waiting), summary, findings (unresolved actual defects), deferred (unverified conditions), nextSession (reuse/fresh). Choose whether the next related task can reuse this implementation context. Request user input with waiting and clear questions in summary; first investigate facts and authorized remedies. An ok result has no unresolved findings.',
  ].filter(Boolean).join('\n\n');
  await atomicJson(join(dir, 'request.json'), { actor: actor.id, phase, attempt: actor.attempts, prompt });
  const review = phase.startsWith('review');
  const sessionKey = review ? 'reviewerSessionId' : 'sessionId';
  const providerKey = review ? 'reviewerAgent' : 'sessionAgent';
  const ordered = [...adapters];
  const preferred = actor.pending.agent ?? actor[providerKey];
  ordered.sort((a, b) => Number(b.name === preferred) - Number(a.name === preferred));
  const errors = [];
  for (const adapter of ordered) {
    if (Boolean(adapter.simulation) !== state.simulation) throw new Error('Simulation cannot be used as a real agent fallback.');
    if (!review && actor[sessionKey] && actor[providerKey] && actor[providerKey] !== adapter.name) {
      if (actor.attempts >= (actor.sessionLimit ?? state.limits.maxSessions)) throw new AgentUnavailable('Implementation session budget exhausted while switching agents.', 'budget');
      actor.attempts++; actor.repairs = 0; actor[sessionKey] = null;
    }
    actor.pending.agent = adapter.name;
    await persist(state, `provider:${actor.id}:${adapter.name}`);
    const providerDir = join(dir, adapter.name);
    await mkdir(providerDir, { recursive: true });
    for (let retry = 0; retry <= (state.recovery?.retries ?? 2); retry++) {
      signal?.throwIfAborted();
      onEvent?.(`${state.simulation ? '[SIMULATION] ' : ''}${actor.id}: ${phase} (${adapter.name}${retry ? `, retry ${retry}` : ''})`);
      try {
        const outcome = await adapter.run({ cwd: state.workspace, phase, task: actor, prompt, evidenceDir: providerDir, readDirs: [runDir(state)], signal,
          sessionId: !actor[providerKey] || actor[providerKey] === adapter.name ? actor[sessionKey] : null });
        validateResult(outcome.result);
        await assertHead(state, actor.baseline);
        const afterTree = await tree(state);
        if ((review || phase === 'verify') && afterTree !== actor.pending.beforeTree) throw new Error('Read-only agent changed files; preserving the workspace for inspection.');
        const envelope = { ...outcome, agent: adapter.name, beforeTree: actor.pending.beforeTree, afterTree };
        await atomicJson(join(dir, 'result.json'), envelope);
        return { ...envelope, dir };
      } catch (error) {
        if (!(error instanceof AgentUnavailable) || error.kind === 'busy' || signal?.aborted) throw error;
        const partial = await optionalJson(join(providerDir, 'process.json'));
        if (partial?.sessionId) { actor[sessionKey] = partial.sessionId; actor[providerKey] = adapter.name; await persist(state, `partial-session:${actor.id}`); }
        errors.push(`${adapter.name}: ${error.message}`);
        if (retry < (state.recovery?.retries ?? 2)) await delay(state.simulation ? 1 : Math.min(30_000, 1_000 * 2 ** retry), undefined, { signal });
      }
    }
  }
  throw new AgentUnavailable(errors.join('\n'));
}

export function rememberSession(actor, outcome) {
  const review = actor.phase.startsWith('review');
  actor[review ? 'reviewerSessionId' : 'sessionId'] = outcome.sessionId ?? actor[review ? 'reviewerSessionId' : 'sessionId'];
  actor[review ? 'reviewerAgent' : 'sessionAgent'] = outcome.agent;
  if (!review && outcome.result.nextSession) actor.nextSession = outcome.result.nextSession;
}
