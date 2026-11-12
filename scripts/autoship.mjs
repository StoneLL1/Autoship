#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve, join, dirname, relative } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { command } from './process.mjs';
import { readJson } from './state.mjs';
import { createRun, loadRun, run } from './runner.mjs';
import { demoRepository } from './demo.mjs';
import { createAdapter } from './adapters/index.mjs';
import { readConfig } from './config.mjs';
import { initialize, inside } from './git.mjs';
import { listRuns, retryTask, verifyRun, configureRun } from './actions.mjs';
import { installSkills } from './install.mjs';
import { persist, runDir } from './invoke.mjs';
import { digest } from './workflow.mjs';
import { chooseDesign } from './designs.mjs';

const help = `Autoship — lightweight development handoffs using your existing coding agent

  new "idea" --cwd <directory>          Clarify, confirm, plan and build a new project
  feature "change" --cwd <repo>         Add a feature to an existing committed project
  run <execution.json> --cwd <repo>     Execute an already confirmed task plan
  resume <run-id> --cwd <repo>          Continue without resetting task history
  status <run-id> --cwd <repo>          Show progress and a pending question
  list --cwd <repo>                     List local runs
  retry <run-id> --task <id>            Explicitly grant a paused task another budget
  verify <run-id> [--task <id>]         Recheck accepted work and pending conditions
  install-skills --dir <skills-dir>    Export self-contained Skills; no global setup
  doctor                               Check installed agent CLIs
  demo                                 Run an isolated simulation; no model calls

Options:
  --agent codex|claude|opencode         Use the agent's existing login and settings
  --model <configured-model>           Override this run's implementation model
  --fallback <agent,agent>              Try explicitly configured alternative agents
  --config <file>                      Default: <repo>/.autoship/config.json
  --confirmed-brief <file>             Treat this supplied brief as already approved
  --reply <text>                       Answer one saved question without a terminal
  --max-repairs 2 --max-sessions 3      Per-task repair/session limits
  --steps <N>                          Stop after N transitions; resume later
  --from-head                         Explicitly exclude source uncommitted changes
  --adopt                             Include files in a new non-Git directory
  --offline                           Use only cached default design references
  --force                             Replace changed exported Skill files

Output stays in a local branch and worktree. Push or publication is never automatic.
WorkBuddy can import exported Skills; its unattended CLI is not verified.`;

function number(value, name, fallback, min = 0) {
  if (value === undefined) return fallback;
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min) throw new Error(`${name} must be an integer >= ${min}.`);
  return result;
}

export function printStatus(state) {
  console.log(`\n${state.simulation ? 'SIMULATION — ' : ''}${state.id}: ${state.status}`);
  console.log(`Source: ${state.repo}\nWorktree: ${state.workspace}\nBranch: ${state.branch}`);
  if (state.workflow) console.log(`Workflow: ${state.workflow.kind} / ${state.workflow.stage}`);
  for (const task of state.tasks) console.log(`  ${task.id}: ${task.status}${task.phase ? ` / ${task.phase}` : ''}; sessions ${task.attempts}; repairs ${task.repairs}; reviews ${task.review ? 1 : 0}${task.deferred.length ? `; pending ${task.deferred.length}` : ''}`);
  if (state.reason) console.log(`Reason: ${state.reason}`);
  if (state.workflow?.question) console.log(`Question:\n${state.workflow.question}`);
  console.log(`State and evidence: ${runDir(state)}\nResume: autoship resume ${state.id} --cwd "${state.repo}"`);
}

async function main() {
  const strings = ['cwd', 'agent', 'model', 'steps', 'max-repairs', 'max-sessions', 'config', 'fallback', 'confirmed-brief', 'reply', 'task', 'dir'];
  const flags = ['from-head', 'adopt', 'offline', 'force', 'version'];
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    ...Object.fromEntries(strings.map(name => [name, { type: 'string' }])),
    ...Object.fromEntries(flags.map(name => [name, { type: 'boolean' }])), help: { type: 'boolean', short: 'h' },
  } });
  const [action, arg] = positionals;
  if (values.version) { console.log(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version); return; }
  if (!action || values.help) { console.log(help); return; }
  const cwd = resolve(values.cwd ?? process.cwd());
  const maxSteps = number(values.steps, 'steps', Infinity);
  const maxRepairs = number(values['max-repairs'], 'max-repairs', 2);
  const maxSessions = number(values['max-sessions'], 'max-sessions', 3, 1);
  if (action === 'install-skills') {
    if (!values.dir) throw new Error('Supply --dir, for example <project>/.agents/skills or a WorkBuddy import directory.');
    console.log(JSON.stringify(await installSkills(values.dir, { force: values.force }), null, 2)); return;
  }
  const config = await readConfig(cwd, values.config ? resolve(values.config) : undefined);
  if (action === 'doctor') {
    const checks = await Promise.allSettled(['codex', 'claude', 'opencode'].map(name => createAdapter(name, config.agents[name]).probe()));
    const git = await command('git', ['--version']);
    console.log(JSON.stringify({ node: process.version, git: git.stdout.trim() || git.error,
      agents: checks.map((item, i) => item.status === 'fulfilled' ? item.value : { agent: ['codex', 'claude', 'opencode'][i], error: item.reason.message }),
      workbuddy: 'Skill import supported; unattended CLI integration unverified. CLI discovery does not verify login or model access.' }, null, 2));
    if (git.code !== 0 || Number(process.versions.node.split('.')[0]) < 24) process.exitCode = 1;
    return;
  }
  if (action === 'list') { console.log(JSON.stringify(await listRuns(cwd), null, 2)); return; }
  let state;
  if (['resume', 'status', 'retry', 'verify'].includes(action)) {
    if (!arg) throw new Error('Supply a run ID.');
    state = await loadRun(cwd, arg);
    if (action === 'status') { printStatus(state); return; }
    if (values.agent && values.agent !== state.agent) throw new Error('Resume retains the original agent; configure --fallback for an alternative.');
    if (action === 'retry') state = await retryTask(cwd, arg, values.task, values.reply);
  } else if (action === 'demo') {
    const fixture = await demoRepository();
    console.log('SIMULATION: isolated temporary repository; no model calls or real AI review.');
    state = await createRun({ cwd: fixture.cwd, plan: fixture.plan, agent: 'fake' });
  } else if (['new', 'feature', 'run'].includes(action)) {
    if (!arg && !values['confirmed-brief']) throw new Error('Supply an idea, change request, or execution manifest.');
    const agent = values.agent ?? config.agent;
    const fallbacks = values.fallback?.split(',').filter(Boolean) ?? config.fallbacks;
    for (const name of [agent, ...fallbacks]) createAdapter(name, config.agents[name]);
    if ([agent, ...fallbacks].some(name => name === 'fake') && [agent, ...fallbacks].some(name => name !== 'fake')) throw new Error('Simulation and real agents cannot be mixed.');
    const brief = values['confirmed-brief'] ? await readFile(resolve(values['confirmed-brief']), 'utf8') : null;
    if (brief !== null && !brief.trim()) throw new Error('The confirmed brief is empty.');
    if (action === 'new') await initialize(cwd, { adopt: values.adopt });
    const manifestPath = action === 'run' ? resolve(cwd, arg) : null;
    state = await createRun({ cwd, agent, agentConfig: config.agents, fallbacks, recovery: config.recovery,
      maxRepairs, maxSessions, fromHead: values['from-head'],
      ...(action === 'run' ? { plan: await readJson(manifestPath), manifest: inside(cwd, manifestPath) ? relative(cwd, manifestPath).replaceAll('\\', '/') : null }
        : { workflow: { kind: action, idea: arg ?? brief } }),
    });
    if (state.workflow) {
      if (brief !== null) {
        await mkdir(dirname(join(state.workspace, state.workflow.brief)), { recursive: true });
        await writeFile(join(state.workspace, state.workflow.brief), brief);
        state.workflow.stage = 'plan';
        state.workflow.confirmation = { hash: digest(brief), at: new Date().toISOString(), source: '--confirmed-brief' };
      }
      // Select once. A user-provided design always takes precedence over this reference.
      const design = await chooseDesign(join(state.common, 'autoship', 'design-cache'), { offline: values.offline || state.simulation });
      state.workflow.designReference = design;
      await persist(state, 'workflow-prepared');
    }
  } else throw new Error(`Unknown command: ${action}`);

  state = await configureRun(state, current => {
    current.agentConfig ??= config.agents;
    if (values.model) current.agentConfig[current.agent] = { ...current.agentConfig[current.agent], model: values.model };
    if (values.fallback !== undefined) current.fallbacks = values.fallback.split(',').filter(Boolean);
  });
  const adapters = [state.agent, ...new Set(state.fallbacks ?? [])].map(name => createAdapter(name, state.agentConfig[name]));
  if (adapters.some(adapter => Boolean(adapter.simulation) !== state.simulation)) throw new Error('Simulation and real agents cannot be mixed.');
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error('Interrupted; resume this run to continue.'));
  process.once('SIGINT', interrupt);
  let input;
  const pendingLines = [], waiting = [];
  let ended = false;
  const onInput = async prompt => {
    console.log(`\n${prompt}`);
    if (!input) {
      input = createInterface({ input: process.stdin, terminal: false });
      input.on('line', line => waiting.length ? waiting.shift()(line) : pendingLines.push(line));
      input.on('close', () => { ended = true; while (waiting.length) waiting.shift()(null); });
      controller.signal.addEventListener('abort', () => input.close(), { once: true });
    }
    if (pendingLines.length) return pendingLines.shift();
    return ended ? null : new Promise(resolve => waiting.push(resolve));
  };
  const options = { signal: controller.signal, maxSteps, fallbackAdapters: adapters.slice(1), onEvent: message => console.log(message),
    reply: values.reply, taskId: values.task, onInput };
  try {
    if (action === 'verify') {
      state = await verifyRun(state, adapters, options);
    }
    state = await run(state, adapters[0], options);
    printStatus(state);
    if (!['completed', 'completed_with_pending', 'ready'].includes(state.status)) process.exitCode = state.status === 'interrupted' ? 130 : 2;
  } finally { input?.close(); process.removeListener('SIGINT', interrupt); }
}

main().catch(error => { console.error(`Autoship: ${error.message}`); process.exitCode = 1; });
