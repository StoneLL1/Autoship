import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'autoship', Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`Design source returned ${response.status}`);
  return response;
}

export async function chooseDesign(cache, { offline = false } = {}) {
  await mkdir(cache, { recursive: true });
  if (!offline) {
    try {
      const catalog = await (await download('https://api.github.com/repos/VoltAgent/awesome-design-md/git/trees/main?recursive=1')).json();
      const files = catalog.tree.filter(item => item.type === 'blob' && /^design-md\/.*\.md$/i.test(item.path));
      if (!files.length) throw new Error('No design documents found.');
      const selected = files[randomInt(files.length)];
      const source = `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/${catalog.sha}/${selected.path}`;
      const content = await (await download(source)).text();
      const path = join(cache, `${selected.sha}.md`);
      await writeFile(path, `Source: ${source}\nCollection: VoltAgent/awesome-design-md (MIT)\nRevision: ${catalog.sha}\n\n${content}`);
      return path;
    } catch { /* Use a previously fetched reference without blocking unrelated work. */ }
  }
  const cached = (await readdir(cache)).filter(name => name.endsWith('.md'));
  return cached.length ? join(cache, cached[randomInt(cached.length)]) : null;
}
