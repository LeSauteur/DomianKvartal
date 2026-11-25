import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root } from '../src/paths.mjs';

const snapshot = '12b5d4a522fc74fc2b64eaad577c8defb81142a7';
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kvartal-migration-'));
const checkout = path.join(folder, 'snapshot');
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'inherit' });
const node = (...args) => execFileSync(process.execPath, args, { cwd: checkout, stdio: 'inherit' });
git('worktree', 'add', '--quiet', '--detach', checkout, snapshot);
try {
  node('scripts/build.mjs');
  node('scripts/check-parity.mjs');
  node('--test', 'tests/catalog-publication.test.mjs', 'tests/max-listings.test.mjs',
    'tests/object-pages.test.mjs', 'tests/registry.test.mjs', 'tests/technical-audit.test.mjs');
} finally {
  git('worktree', 'remove', '--force', checkout);
  fs.rmdirSync(folder);
}
