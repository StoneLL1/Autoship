import { mkdir, open, readFile, rename, unlink, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isAlive } from './process.mjs';
import { setTimeout as delay } from 'node:timers/promises';

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function optionalJson(path) {
  try { return await readJson(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  const file = await open(temp, 'wx');
  try { await file.writeFile(`${JSON.stringify(value, null, 2)}\n`); await file.sync(); }
  finally { await file.close(); }
  for (let attempt = 0; ; attempt++) {
    try { await rename(temp, path); break; }
    catch (error) {
      // Windows readers and scanners may briefly deny replacement. Keep the old file
      // intact and retry the atomic operation; never unlink the destination first.
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 7) throw error;
      await delay(Math.min(200, 25 * 2 ** attempt));
    }
  }
}

export async function saveState(dir, state, event) {
  state.revision = (state.revision ?? 0) + 1;
  state.updatedAt = new Date().toISOString();
  await atomicJson(join(dir, 'state.json'), state);
  await appendFile(join(dir, 'events.jsonl'), `${JSON.stringify({ revision: state.revision, at: state.updatedAt, event })}\n`);
}

export async function lock(path) {
  await mkdir(dirname(path), { recursive: true });
  const owner = { pid: process.pid, token: randomUUID() };
  const create = async () => {
    const file = await open(path, 'wx');
    try { await file.writeFile(JSON.stringify(owner)); }
    finally { await file.close(); }
  };
  try { await create(); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Serialize stale-lock recovery. Re-read under this guard before deleting.
    const reclaim = `${path}.reclaim`;
    let guard;
    try { guard = await open(reclaim, 'wx'); }
    catch { throw new Error(`Another runner is acquiring ${path}`); }
    try {
      const existing = await optionalJson(path);
      if (existing && isAlive(existing.pid)) throw new Error(`Repository is in use by PID ${existing.pid}.`);
      if (existing) await unlink(path);
      await create();
    } finally { await guard.close(); await unlink(reclaim); }
  }
  return async () => {
    const current = await optionalJson(path);
    if (current?.token === owner.token) await unlink(path);
  };
}
