import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dist, inside, root } from '../src/paths.mjs';

const manifest = inside(root, 'src/data/pages-root.json');
const siteFolders = new Set([
  'assets', 'construction', 'guides', 'images', 'JK', 'lands',
  'newbuilds', 'obekt', 'objects', 'seo', 'team', 'ui-blocks'
]);
const outputFolders = new Set(['apartments', 'catalog', 'home', 'houses', 'lands', 'newbuilds', 'showcase']);
const textFile = /\.(?:html|css|js|json|svg|txt|xml|webmanifest)$/i;

function assertPublicRoute(relative) {
  const [first, second, ...rest] = relative.split('/');
  const valid = second === undefined
    ? /^(?:[\w-]+\.html|CNAME|robots\.txt|sitemap\.xml)$/.test(first)
    : siteFolders.has(first) || (first === 'output' && outputFolders.has(second) && rest.length > 0);
  assert.ok(valid && relative.split('/').every(part => part && !part.startsWith('.') && !part.includes('\\')), `Unexpected deploy path: ${relative}`);
}

function walk(folder, prefix = '') {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    if (entry.isDirectory()) return walk(path.join(folder, entry.name), name + '/');
    assert.ok(entry.isFile(), `Unexpected filesystem entry: ${name}`);
    return [name];
  });
}

function normalized(buffer, relative) {
  return textFile.test(relative)
    ? Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'))
    : buffer;
}

const files = walk(dist).sort();
files.forEach(assertPublicRoute);
assert.equal(new Set(files.map(file => file.toLowerCase())).size, files.length, 'Case-insensitive path collision');

const [mode, artifactPath, ...extra] = process.argv.slice(2);
assert.ok(!extra.length && [undefined, '--check', '--check-artifact'].includes(mode), 'Usage: node scripts/sync-pages.mjs [--check | --check-artifact <path>]');
assert.equal(Boolean(artifactPath), mode === '--check-artifact');
const artifact = mode === '--check-artifact' ? inside(root, artifactPath) : null;
const target = artifact ?? root;
const outdated = files.filter(relative => {
  const expected = inside(dist, relative);
  const current = inside(target, relative);
  return !fs.existsSync(current) ||
    !normalized(fs.readFileSync(expected), relative).equals(normalized(fs.readFileSync(current), relative));
});

if (artifact) {
  assert.deepEqual(outdated, [], 'Pages artifact differs from the checked build');
  const privatePath = /^(?:(?:public|src|scripts|dist(?:-next-[^/]+)?|docs|tests|node_modules|_tools|_private|__(?:review|reference|local))\/|output\/(?:drafts\/|listing-test-[^/]+\/|build-report\.json$|site-validation\.json$))/;
  const artifactFiles = walk(artifact).sort();
  assert.deepEqual(artifactFiles.filter(file => privatePath.test(file)), [], 'Internal files in Pages artifact');
  fs.writeFileSync(inside(root, 'output/pages-artifact-files.json'), JSON.stringify({ files: artifactFiles }, null, 2) + '\n');
  console.log(`Verified ${files.length} files in the Pages build (CRLF/LF normalized for text only).`);
} else {
  const previous = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
  previous.forEach(assertPublicRoute);
  const managed = new Set(files);
  const stale = previous.filter(file => !managed.has(file));
  if (mode === '--check') {
    assert.deepEqual(previous, files, 'Pages inventory is stale. Run npm run build:catalog.');
    assert.deepEqual(outdated, [], 'Pages root is stale. Run npm run build:catalog.');
    console.log(`Verified ${files.length} generated files in the Pages root.`);
  } else {
    for (const relative of outdated) {
      const current = inside(root, relative);
      fs.mkdirSync(path.dirname(current), { recursive: true });
      fs.copyFileSync(inside(dist, relative), current);
    }
    for (const relative of stale) {
      const current = inside(root, relative);
      if (fs.existsSync(current)) fs.unlinkSync(current);
    }
    fs.writeFileSync(manifest, JSON.stringify(files, null, 2) + '\n');
    console.log(`Updated ${outdated.length} files in the Pages root, removed ${stale.length} obsolete managed files.`);
  }
}
