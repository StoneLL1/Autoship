import { realpath, mkdir, writeFile, readdir, stat, readFile, appendFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join, dirname } from 'node:path';
import { command } from './process.mjs';
import { atomicJson, optionalJson } from './state.mjs';

export async function git(cwd, args) {
  const result = await command('git', args, { cwd });
  if (result.code !== 0) throw new Error(`git ${args[0]}: ${result.error || result.stderr.trim() || 'failed'}`);
  return result.stdout.trim();
}

export async function commitArgs(cwd, args) {
  const identity = await command('git', ['var', 'GIT_AUTHOR_IDENT'], { cwd });
  return git(cwd, [...(identity.code === 0 ? [] : ['-c', 'user.name=Autoship', '-c', 'user.email=autoship@localhost']), ...args]);
}

export async function initialize(cwd, { adopt = false } = {}) {
  await mkdir(cwd, { recursive: true });
  const probe = await command('git', ['rev-parse', '--show-toplevel'], { cwd });
  if (probe.code === 0) {
    const existing = await repository(cwd);
    if (existing.root !== await realpath(cwd)) throw new Error('Choose the repository root, not a directory inside another repository.');
    return existing;
  } else {
    const entries = (await readdir(cwd)).filter(name => name !== '.autoship');
    if (entries.includes('.git')) throw new Error('Existing Git metadata needs repair before initialization.');
    if (entries.length && !adopt) throw new Error('This non-Git directory contains files. Use --adopt to explicitly include them, or choose an empty directory.');
    await git(cwd, ['init', '-b', 'main']);
    if (!entries.includes('.gitignore')) await writeFile(join(cwd, '.gitignore'), '.autoship/\nnode_modules/\n.env\n.env.*\n');
    await git(cwd, ['add', '-A']);
    await commitArgs(cwd, ['commit', '--allow-empty', '-m', 'Initialize Autoship project']);
    return repository(cwd);
  }
}

export function inside(root, path) {
  const part = relative(resolve(root), resolve(path));
  return part !== '' && part !== '..' && !part.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(part);
}

export async function repository(cwd) {
  const root = await realpath(await git(cwd, ['rev-parse', '--show-toplevel']));
  const common = await realpath(await git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']));
  return { root, common };
}

export async function prepareWorkspaceRoot(common) {
  // Worktrees are ordinary project files, not Git metadata. Some hosts protect everything
  // beneath .git, even a linked worktree, so keep only state/evidence in the common dir.
  const root = join(dirname(common), '.autoship', 'worktrees');
  const exclude = join(common, 'info', 'exclude');
  await mkdir(dirname(exclude), { recursive: true });
  let current = '';
  try { current = await readFile(exclude, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!current.split(/\r?\n/).includes('/.autoship/')) await appendFile(exclude, '\n# Autoship local configuration and worktrees\n/.autoship/\n');
  await mkdir(root, { recursive: true });
  if (await realpath(root) !== resolve(root)) throw new Error('Autoship worktree root must not traverse symlinks.');
  return root;
}

function workspaceRoot(state) {
  const expected = state.workspaceRoot ? join(dirname(state.common), '.autoship', 'worktrees') : join(state.common, 'autoship', 'worktrees');
  if (state.workspaceRoot && resolve(state.workspaceRoot) !== resolve(expected)) throw new Error('Unexpected worktree root.');
  return expected;
}

export async function createWorktree(state) {
  const root = workspaceRoot(state);
  const expected = join(root, state.id);
  if (resolve(state.workspace) !== resolve(expected)) throw new Error('Unexpected Autoship workspace path.');
  await mkdir(root, { recursive: true });
  try { await realpath(state.workspace); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const branch = await command('git', ['show-ref', '--verify', '--quiet', `refs/heads/${state.branch}`], { cwd: state.repo });
    const args = branch.code === 0
      ? ['worktree', 'add', state.workspace, state.branch]
      : ['worktree', 'add', '-b', state.branch, state.workspace, state.base];
    await git(state.repo, args);
  }
  await verifyWorkspace(state);
}

export async function verifyWorkspace(state) {
  const root = workspaceRoot(state);
  const expected = resolve(root, state.id);
  const actual = await realpath(state.workspace);
  if (actual !== await realpath(expected) || !inside(await realpath(root), actual)) throw new Error('Workspace escaped the run directory.');
  const info = await repository(actual);
  if (info.root !== actual || info.common !== await realpath(state.common)) throw new Error('Workspace belongs to a different repository.');
  if (await git(actual, ['branch', '--show-current']) !== state.branch) throw new Error('Workspace branch changed outside Autoship.');
}

export async function tree(state) {
  await verifyWorkspace(state);
  await git(state.workspace, ['add', '-A']);
  return git(state.workspace, ['write-tree']);
}

export async function assertHead(state, expected) {
  await verifyWorkspace(state);
  if (await git(state.workspace, ['rev-parse', 'HEAD']) !== expected) {
    throw new Error('HEAD changed outside the runner; preserve the workspace and inspect before continuing.');
  }
}

export async function rollback(state, task, evidenceDir) {
  await assertHead(state, task.baseline);
  const currentTree = await tree(state); // Include newly created files in the evidence and reset scope.
  await mkdir(evidenceDir, { recursive: true });
  const markerPath = join(evidenceDir, 'saved.json');
  const saved = await optionalJson(markerPath);
  if (saved) {
    const baselineTree = await git(state.workspace, ['rev-parse', `${task.baseline}^{tree}`]);
    if (saved.baseline !== task.baseline || ![saved.tree, baselineTree].includes(currentTree)) throw new Error('Files changed during rollback recovery; preserving both workspace and evidence.');
  } else {
    const patch = await command('git', ['diff', '--binary', task.baseline], { cwd: state.workspace, log: join(evidenceDir, 'changes') });
    if (patch.code !== 0) throw new Error('Could not preserve the failed diff; rollback was not performed.');
    await writeFile(join(evidenceDir, 'handoff.json'), `${JSON.stringify(task, null, 2)}\n`);
    await atomicJson(markerPath, { baseline: task.baseline, tree: currentTree });
  }
  // Safe only after verifying the dedicated worktree, branch, common directory and HEAD.
  await git(state.workspace, ['reset', '--hard', task.baseline]);
}

export async function commit(state, task) {
  await verifyWorkspace(state);
  const intent = task.commit;
  const head = await git(state.workspace, ['rev-parse', 'HEAD']);
  if (head !== intent.parent) {
    const parent = await git(state.workspace, ['rev-parse', 'HEAD^']);
    const committedTree = await git(state.workspace, ['rev-parse', 'HEAD^{tree}']);
    const message = await git(state.workspace, ['log', '-1', '--format=%B']);
    if (parent === intent.parent && committedTree === intent.tree && message === intent.message) {
      if (await git(state.workspace, ['status', '--porcelain'])) throw new Error('Workspace changed after commit; inspect before accepting the task.');
      return head;
    }
    throw new Error('Commit reconciliation failed; leaving the workspace intact.');
  }
  if (await tree(state) !== intent.tree) throw new Error('Files changed after the saved commit intent.');
  await commitArgs(state.workspace, ['commit', '--allow-empty', '-m', intent.message]);
  const committed = await git(state.workspace, ['rev-parse', 'HEAD']);
  if (committed === intent.parent) throw new Error('Git did not create the intended commit.');
  // Hooks can rewrite the index, message or working files. Verify the actual commit too.
  return commit(state, task);
}

export async function park(state, task, dir) {
  await assertHead(state, task.baseline);
  if (!task.parked) {
    task.parked = { base: task.baseline, tree: await tree(state), patch: join(dir, 'parked.patch.stdout.log') };
    await mkdir(dir, { recursive: true });
    const result = await command('git', ['diff', '--binary', task.baseline], { cwd: state.workspace, log: join(dir, 'parked.patch') });
    if (result.code !== 0) throw new Error('Cannot preserve parked work.');
  }
  // Caller persists parked before performing reset; restoring is also resumable.
}

export async function clearParkedWork(state, task) {
  await assertHead(state, task.parked.base);
  const actual = await tree(state);
  const base = await git(state.workspace, ['rev-parse', `${task.parked.base}^{tree}`]);
  if (![base, task.parked.tree].includes(actual)) throw new Error('Parked work changed before reset; preserving it.');
  await git(state.workspace, ['reset', '--hard', task.parked.base]);
}

export async function restoreParked(state, task, persistIntent = async () => {}) {
  await verifyWorkspace(state);
  const head = await git(state.workspace, ['rev-parse', 'HEAD']);
  if (task.restore?.tree) {
    if (task.restore.head !== head || task.restore.tree !== await tree(state)) throw new Error('Restored work changed outside the runner.');
    return task.restore.conflicted;
  }
  if (task.restore?.head) {
    if (task.restore.head !== head) throw new Error('HEAD changed during restore.');
    // A crash during apply leaves either restored files or the clean baseline. Preserve both;
    // recover asks the agent to reconcile the saved patch instead of blindly applying twice.
    await git(state.workspace, ['reset', '--mixed', 'HEAD']);
    task.restore = { head, tree: await tree(state), conflicted: true };
    task.baseline = head;
    return true;
  }
  if (await git(state.workspace, ['status', '--porcelain'])) throw new Error('Workspace must be clean before restoring parked work.');
  task.restore = { head };
  await persistIntent();
  if (head === task.parked.base) {
    await git(state.workspace, ['read-tree', '--reset', '-u', task.parked.tree]);
    task.restore = { head, tree: task.parked.tree, conflicted: false };
  } else {
    const result = (await stat(task.parked.patch)).size ? await command('git', ['apply', '--3way', '--index', task.parked.patch], { cwd: state.workspace }) : { code: 0 };
    if (result.code !== 0) await git(state.workspace, ['reset', '--mixed', 'HEAD']);
    task.restore = { head, tree: await tree(state), conflicted: result.code !== 0 };
  }
  task.baseline = head;
  return task.restore.conflicted;
}
