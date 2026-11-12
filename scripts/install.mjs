import { readdir, readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { projectRoot } from './invoke.mjs';

async function contents(dir, prefix = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Skill bundle must not contain symlinks.');
    if (entry.isDirectory()) files.push(...await contents(join(dir, entry.name), join(prefix, entry.name)));
    else files.push({ path: join(prefix, entry.name), body: await readFile(join(dir, entry.name), 'utf8') });
  }
  return files;
}

export async function installSkills(directory, { force = false } = {}) {
  const target = resolve(directory);
  const planned = [];
  for (const name of ['autoship', 'autoship-docs-sync']) {
    for (const file of await contents(join(projectRoot, 'skills', name))) {
      const body = file.body.replaceAll('../../../docs/runtime.md', '../references/runtime.md')
        .replaceAll('../../docs/runtime.md', 'references/runtime.md');
      planned.push({ path: join(target, name, file.path), body });
    }
  }
  planned.push({ path: join(target, 'autoship', 'references', 'runtime.md'),
    body: (await readFile(join(projectRoot, 'docs', 'runtime.md'), 'utf8')).replaceAll('[实施方案](../PROPOSAL.md)', 'Autoship 产品方案') });
  for (const file of planned) {
    for (let path = file.path; ; path = dirname(path)) {
      try { if ((await lstat(path)).isSymbolicLink()) throw new Error(`Refusing to replace skill files through a symlink: ${path}`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (path === target || path === dirname(path)) break;
    }
    try {
      const current = await readFile(file.path, 'utf8');
      if (current !== file.body && !force) throw new Error(`Existing skill differs: ${file.path}. Use --force only to replace this exported bundle.`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const file of planned) { await mkdir(dirname(file.path), { recursive: true }); await writeFile(file.path, file.body); }
  return { directory: target, files: planned.length };
}
