import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

// A deterministic fixture, never a fallback for a real agent.
export class FakeAdapter {
  name = 'fake';
  simulation = true;
  calls = [];
  constructor(options = {}) { this.options = options; }
  async probe() { return { agent: this.name, available: true, simulation: true, version: 'fixture-1' }; }
  async run(request) {
    this.calls.push({ taskId: request.task.id, phase: request.phase, attempt: request.task.attempts, sessionId: request.sessionId });
    const { phase, task, cwd } = request;
    const result = { status: 'ok', summary: 'SIMULATION: fixture action completed.', findings: [], deferred: [] };
    if (this.options.nextSession) result.nextSession = this.options.nextSession;
    if (phase === 'clarify') {
      const brief = request.prompt.match(/Brief: ([^\n]+?)\. Execution manifest:/)?.[1];
      if (brief) { await mkdir(dirname(join(cwd, brief)), { recursive: true }); await writeFile(join(cwd, brief), '# Simulation brief\n\nCreate a fixture result and validate it. No actual model calls.\n'); }
    }
    if (['plan-new', 'plan-feature', 'plan-repair'].includes(phase)) {
      const manifest = request.prompt.match(/Execution manifest: ([^\n]+?)\./)?.[1];
      const path = request.prompt.match(/Execution manifest: (.+?execution\.json)/)?.[1] ?? manifest;
      const spec = `${dirname(path).replaceAll('\\', '/')}/tasks.md`;
      await mkdir(dirname(join(cwd, path)), { recursive: true });
      await writeFile(join(cwd, spec), '# Simulation\n\n## T01: Fixture\n\nWrite results/T01.txt containing complete and a newline; verify the content.\n');
      await writeFile(join(cwd, path), JSON.stringify({ version: 1, tasks: [{ id: 'T01', spec: `${spec}#T01`, dependsOn: [], checks: [{ command: process.execPath, args: ['-e', "require('node:assert/strict').equal(require('node:fs').readFileSync('results/T01.txt','utf8'),'complete\\n')"] }] }] }));
    }
    if (phase === 'implement' || phase === 'repair') {
      const failed = this.options.failTasks?.includes(task.id);
      await mkdir(join(cwd, 'results'), { recursive: true });
      await writeFile(join(cwd, 'results', `${task.id}.txt`), failed ? 'broken\n' : 'complete\n');
      if (failed) { result.status = 'issues'; result.findings = ['SIMULATION: persistent implementation defect.']; }
    }
    if (phase === 'review-code' && this.options.reviewIssue !== false) {
      result.status = 'issues';
      result.findings = ['SIMULATION: verify the task result once more in the implementation session.'];
    }
    if (phase === 'docs-sync') {
      result.deferred = [...(task.deferred ?? [])];
      await writeFile(join(cwd, `progress-${task.id}.md`), `# ${task.id}\n\nSimulation completed; no real AI review was performed.\n`);
    }
    return { result, sessionId: request.sessionId ?? `fake-${task.id}-${task.attempts}-${phase}` };
  }
}
