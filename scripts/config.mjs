import { join } from 'node:path';
import { optionalJson } from './state.mjs';

export async function readConfig(cwd, path) {
  const value = await optionalJson(path ?? join(cwd, '.autoship', 'config.json')) ?? {};
  const agents = {};
  for (const [name, options] of Object.entries(value.agents ?? {})) {
    agents[name] = {};
    for (const key of ['program', 'model', 'reviewModel']) if (options[key] !== undefined) {
      if (typeof options[key] !== 'string' || !options[key]) throw new Error(`Invalid ${name}.${key}`);
      agents[name][key] = options[key];
    }
    if (options.timeoutMs !== undefined) {
      if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1) throw new Error(`Invalid ${name}.timeoutMs`);
      agents[name].timeoutMs = options.timeoutMs;
    }
  }
  const recovery = { retries: 2, retryMs: 15_000, waitMs: 60_000, ...value.recovery };
  for (const key of ['retries', 'retryMs', 'waitMs']) if (!Number.isSafeInteger(recovery[key]) || recovery[key] < 0) throw new Error(`Invalid recovery.${key}`);
  if (!Array.isArray(value.fallbacks ?? []) || !(value.fallbacks ?? []).every(name => typeof name === 'string')) throw new Error('fallbacks must be agent names.');
  return { agent: value.agent ?? 'codex', agents, fallbacks: value.fallbacks ?? [], recovery };
}
