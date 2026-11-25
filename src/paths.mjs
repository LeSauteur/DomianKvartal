import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const legacy = path.join(root, 'reference', 'legacy');
export const dist = path.join(root, 'dist');
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const origin = 'https://domian-161.ru';
export const hashAlgorithm = 'sha256';

export function inside(parent, relative) {
  if (path.posix.isAbsolute(relative) || path.win32.isAbsolute(relative) || /^[a-z]:/i.test(relative)) {
    throw new Error(`Path escapes its directory: ${relative}`);
  }
  const target = path.resolve(parent, relative.replaceAll('\\', '/'));
  const rel = path.relative(parent, target);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`Path escapes its directory: ${relative}`);
  }
  return target;
}

export function writeOutput(relative, content) {
  const target = inside(dist, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
