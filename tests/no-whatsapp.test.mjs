import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules", "output", "test-results", "tmp"]);
const checkedExtensions = new Set([".html", ".js", ".css"]);
const forbidden = /whatsapp|wa\.me|api\.whatsapp/i;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath));
    if (entry.isFile() && checkedExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }

  return files;
}

test("published code contains no WhatsApp references", async () => {
  const files = await collectFiles(root);
  const violations = [];

  for (const file of files) {
    if (file.includes(`${path.sep}tests${path.sep}`)) continue;
    const contents = await readFile(file, "utf8");
    if (forbidden.test(contents)) violations.push(path.relative(root, file));
  }

  assert.deepEqual(violations, []);
});
