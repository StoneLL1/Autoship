import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { optionalJson } from './state.mjs';
import { git, tree, commit, inside } from './git.mjs';
import { validatePlan, taskState } from './protocol.mjs';
import { invoke, rememberSession, persist, projectRoot } from './invoke.mjs';

const confirmed = value => /^(y|yes|确认|同意|可以|开始)$/i.test(value.trim());
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

export async function readManifest(state) {
  if (!state.manifest || isAbsolute(state.manifest) || !inside(state.workspace, resolve(state.workspace, state.manifest))) throw new Error('Manifest must be inside the project.');
  const plan = await optionalJson(join(state.workspace, state.manifest));
  await validatePlan(plan, state.workspace);
  return plan;
}

async function ask(state, prompt, options) {
  const flow = state.workflow;
  flow.question = prompt;
  state.status = 'needs_input';
  await persist(state, 'question');
  const answer = options.reply !== undefined ? options.reply : await options.onInput?.(prompt);
  options.signal?.throwIfAborted();
  delete options.reply;
  if (answer === undefined || answer === null) return null;
  flow.answers.push({ question: prompt, answer, at: new Date().toISOString() });
  flow.actor.userMessage = answer;
  flow.question = null;
  state.status = 'running';
  await persist(state, 'user-answer');
  return answer;
}

export async function workflowStep(state, adapters, options) {
  const flow = state.workflow, actor = flow.actor;
  if (flow.exhausted) {
    const answer = await ask(state, `Planning repair budget exhausted. ${actor.issues.join('; ')}\nProvide guidance to explicitly start another planning attempt:`, options);
    if (answer === null) return false;
    flow.exhausted = false; actor.attempts++; actor.repairs = 0; actor.sessionId = null;
    actor.sessionLimit = actor.attempts + state.limits.maxSessions - 1;
    flow.stage = 'plan';
  }
  if (flow.stage === 'confirm') {
    const brief = await readFile(join(state.workspace, flow.brief), 'utf8');
    const answer = await ask(state, `${brief}\n\n确认以上需求后自动规划并开发。输入“确认”，或直接说明要修改的内容：`, options);
    if (answer === null) return false;
    if (confirmed(answer)) {
      flow.confirmation = { hash: digest(brief), at: new Date().toISOString(), source: 'user' };
      flow.stage = 'plan';
    } else flow.stage = 'clarify';
    await persist(state, 'scope-decision');
    return true;
  }
  if (flow.stage === 'commit') {
    flow.commitSha = await commit(state, actor);
    flow.stage = 'execute';
    state.implementationContext = null;
    await persist(state, 'planning-committed');
    return true;
  }
  if (flow.question) {
    if (await ask(state, flow.question, options) === null) return false;
  }
  actor.phase = flow.stage === 'plan' ? `plan-${flow.kind}` : flow.stage;
  actor.baseline ??= await git(state.workspace, ['rev-parse', 'HEAD']);
  const context = [
    `User's project request:\n${flow.idea}\nWorkflow: ${flow.kind}. Brief: ${flow.brief}. Execution manifest: ${state.manifest}.`,
    flow.confirmation ? `The user confirmed scope. Continue automatically within it. Confirmation: ${flow.confirmation.hash}.` : 'Clarify before implementation. Summarize agreed requirements in the brief file; return waiting for unanswered product questions, ok when ready for user confirmation.',
    `Planning instructions: ${join(projectRoot, 'docs', 'runtime.md')}. Produce version 1 execution.json at the manifest path. Each task has id, spec (project-relative Markdown#heading), dependsOn, executable checks [{command,args}], and optionally sessionGroup. Set frontend true for a UI project.`,
    'Choose task count and session grouping yourself. Small projects may use one or two tasks. Combine planning responsibilities in this session when appropriate. Keep specs concise. Include meaningful integration checks.',
    'Write frontend design.md and app_flow.md when applicable; use existing project conventions for a feature. Preserve existing project files. Put disposable feasibility experiments in ignored .autoship/prototypes; deliver product code through implementation tasks.',
    flow.designReference ? `Default randomly selected design reference (only use when the user did not specify a style): ${flow.designReference}` : '',
    flow.stage === 'review-plan' ? 'Review the whole planning package once. Read the manifest, specs, requirements and current Git diff; leave files unchanged.' : '',
  ].filter(Boolean).join('\n\n');
  const outcome = await invoke(state, actor, adapters, { ...options, context });
  rememberSession(actor, outcome);
  actor.pending = null;
  if (outcome.result.status === 'waiting') {
    if (await ask(state, outcome.result.summary, options) === null) return false;
    return true;
  }
  actor.issues = [...outcome.result.findings];
  if (outcome.result.status === 'issues' && !actor.issues.length) actor.issues.push(outcome.result.summary);
  if (flow.stage === 'clarify') {
    if (actor.issues.length) {
      if (await ask(state, actor.issues.join('\n'), options) === null) return false;
      return true;
    }
    await mkdir(dirname(join(state.workspace, flow.brief)), { recursive: true });
    try { await readFile(join(state.workspace, flow.brief)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await writeFile(join(state.workspace, flow.brief), `${outcome.result.summary}\n`); }
    flow.stage = 'confirm';
  } else {
    if (flow.stage === 'review-plan') actor.review = { findings: actor.issues, evidence: outcome.dir, tree: outcome.afterTree };
    let plan;
    try { plan = await readManifest(state); }
    catch (error) { actor.issues.push(error.message); }
    if (actor.issues.length) {
      if (actor.repairs < state.limits.maxRepairs) { actor.repairs++; flow.stage = 'plan-repair'; }
      else if (actor.attempts < (actor.sessionLimit ?? state.limits.maxSessions)) {
        actor.attempts++; actor.repairs = 0; actor.sessionId = null; flow.stage = 'plan';
      } else {
        flow.exhausted = true;
        state.status = 'needs_attention'; state.reason = `Planning needs intervention: ${actor.issues.join('; ')}`;
        await persist(state, 'planning-budget-exhausted'); return false;
      }
    } else if (!actor.review) flow.stage = 'review-plan';
    else {
      state.tasks = plan.tasks.map(taskState);
      state.planHash = digest(plan);
      actor.commit = { parent: actor.baseline, tree: await tree(state), message: `autoship: confirmed plan\n\nAutoship-Run: ${state.id}` };
      flow.stage = 'commit';
    }
  }
  await persist(state, `workflow:${flow.stage}`);
  return true;
}
