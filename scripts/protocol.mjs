import { readFile, realpath } from 'node:fs/promises';
import { join, resolve, isAbsolute } from 'node:path';
import { inside } from './git.mjs';

const phases = new Set(['implement', 'review-code', 'repair', 'docs-sync', 'clarify', 'plan-new', 'plan-feature', 'review-plan', 'plan-repair', 'recover', 'verify', 'finish']);

export const resultSchema = {
  type: 'object', additionalProperties: false,
  required: ['status', 'summary', 'findings', 'deferred', 'nextSession'],
  properties: {
    status: { type: 'string', enum: ['ok', 'issues', 'waiting'] },
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    deferred: { type: 'array', items: { type: 'string' } },
    nextSession: { type: 'string', enum: ['reuse', 'fresh'] },
  },
};

export function validateResult(result) {
  if (!result || !['ok', 'issues', 'waiting'].includes(result.status) || typeof result.summary !== 'string'
    || !['findings', 'deferred'].every(key => Array.isArray(result[key]) && result[key].every(item => typeof item === 'string'))) {
    throw new Error('Invalid agent result: expected status, summary, findings[] and deferred[].');
  }
  if (result.status === 'ok' && result.findings.length) throw new Error('An ok result cannot contain unresolved findings.');
  if (result.nextSession !== undefined && !['reuse', 'fresh'].includes(result.nextSession)) throw new Error('nextSession must be reuse or fresh.');
  return result;
}

export async function specText(repo, ref) {
  if (typeof ref !== 'string') throw new Error('Task spec must reference a Markdown file and heading ID.');
  const [file, heading, extra] = ref.split('#');
  if (!file || !heading || extra || isAbsolute(file) || !inside(repo, resolve(repo, file))) throw new Error(`Invalid spec reference: ${ref}`);
  const path = await realpath(join(repo, file));
  if (!inside(await realpath(repo), path)) throw new Error(`Spec symlink escapes the project: ${ref}`);
  const content = await readFile(path, 'utf8');
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex(line => /^##\s+/.test(line) && line.replace(/^##\s+/, '').split(/[:\s：]/)[0] === heading);
  if (start < 0) throw new Error(`Missing heading ## ${heading}: in ${file}`);
  let end = lines.findIndex((line, index) => index > start && /^#{1,2}\s+/.test(line));
  if (end < 0) end = lines.length;
  const text = lines.slice(start, end).join('\n');
  if (text.trim() === lines[start].trim()) throw new Error(`Task ${ref} has no spec body.`);
  return text;
}

export async function validatePlan(plan, repo) {
  if (plan?.version !== 1 || !Array.isArray(plan.tasks) || !plan.tasks.length) throw new Error('Expected a version 1 manifest with tasks.');
  if (plan.frontend !== undefined && typeof plan.frontend !== 'boolean') throw new Error('frontend must be a boolean.');
  if (plan.frontend) {
    for (const file of ['design.md', 'app_flow.md']) {
      let body;
      try { body = await readFile(join(repo, file), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!body?.trim()) throw new Error(`Frontend plan requires nonempty ${file}.`);
    }
  }
  const ids = new Set();
  for (const task of plan.tasks) {
    if (typeof task?.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(task.id) || ids.has(task.id)) throw new Error(`Invalid or duplicate task ID: ${task?.id}`);
    ids.add(task.id);
    if (task.sessionGroup !== undefined && (typeof task.sessionGroup !== 'string' || !task.sessionGroup.trim())) throw new Error(`${task.id}: invalid sessionGroup.`);
    if (!Array.isArray(task.dependsOn) || !task.dependsOn.every(id => typeof id === 'string') || !Array.isArray(task.checks) || task.checks.length === 0) throw new Error(`${task.id}: supply dependsOn and at least one executable check.`);
    for (const check of task.checks) {
      if (typeof check.command !== 'string' || !check.command || !Array.isArray(check.args)
        || !check.args.every(arg => typeof arg === 'string')
        || (check.timeoutMs !== undefined && (!Number.isSafeInteger(check.timeoutMs) || check.timeoutMs < 1))) throw new Error(`${task.id}: invalid command check.`);
    }
    await specText(repo, task.spec);
  }
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) throw new Error(`Cyclic task dependency at ${id}`);
    if (visited.has(id)) return;
    const task = plan.tasks.find(item => item.id === id);
    if (!task) throw new Error(`Unknown dependency: ${id}`);
    visiting.add(id);
    for (const dep of task.dependsOn) visit(dep);
    visiting.delete(id); visited.add(id);
  };
  for (const id of ids) visit(id);
  return plan;
}

export function taskDefinition(task) {
  return { id: task.id, spec: task.spec, dependsOn: [...task.dependsOn], checks: structuredClone(task.checks),
    ...(task.sessionGroup ? { sessionGroup: task.sessionGroup } : {}) };
}

export function taskState(definition) {
  return { ...taskDefinition(definition), status: 'queued', phase: null, attempts: 0, repairs: 0,
    review: null, reviewerSessionId: null, issues: [], deferred: [], sessionId: null, pending: null };
}

export function validatePhase(phase) {
  if (!phases.has(phase)) throw new Error(`Unsupported execution phase: ${phase}`);
}
