import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../src/paths.mjs';

const historical = new Set(['catalog-publication.test.mjs', 'max-listings.test.mjs', 'object-pages.test.mjs', 'registry.test.mjs']);
const suites = fs.readdirSync(path.join(root, 'tests')).filter(file => file.endsWith('.test.mjs') && !historical.has(file));
const run = spawnSync(process.execPath, ['--test', ...suites.map(file => 'tests/' + file)], { cwd: root, stdio: 'inherit' });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
