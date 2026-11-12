import { access, readFile } from 'node:fs/promises';
import { delimiter, dirname, basename, extname, isAbsolute, join, resolve } from 'node:path';

async function exists(path) { try { await access(path); return true; } catch { return false; } }

// Resolve npm wrappers without evaluating shell syntax or launching the desktop app.
export async function launch(program, args = []) {
  if (process.platform !== 'win32') return { program, args };
  const paths = isAbsolute(program) || /[\\/]/.test(program) ? [resolve(program)]
    : (process.env.PATH ?? '').split(delimiter).flatMap(dir => extname(program) ? [join(dir, program)]
      : ['.exe', '.cmd', '.ps1', ''].map(extension => join(dir, program + extension)));
  for (let path of paths) {
    if (!await exists(path)) continue;
    if (/[/\\]opencode\.exe$/i.test(path) && await exists(join(dirname(path), 'opencode-cli.exe'))) path = join(dirname(path), 'opencode-cli.exe');
    if (/\.(cmd|ps1)$/i.test(path)) {
      const wrapper = await readFile(path, 'utf8');
      const matches = wrapper.match(/node_modules[\\/][^"'\r\n]*?\.(?:exe|[cm]?js)/gi) ?? [];
      const tool = basename(path).replace(/\.(cmd|ps1)$/i, '').toLowerCase();
      const match = ['npm', 'npx'].includes(tool) ? matches.find(item => item.endsWith(`${tool}-cli.js`)) : matches.at(-1);
      if (!match) throw new Error(`Unsupported command wrapper ${path}; configure the executable path explicitly.`);
      const entry = resolve(dirname(path), match);
      if (!await exists(entry)) continue;
      return /\.exe$/i.test(entry) ? { program: entry, args } : { program: process.execPath, args: [entry, ...args] };
    }
    return /\.[cm]?js$/i.test(path) ? { program: process.execPath, args: [path, ...args] } : { program: path, args };
  }
  return { program, args };
}
