import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const pages = [
  ["commercial.html", "commercial", "assets/images/services/commercial/commercial-hero.webp"],
  ["rent.html", "rent", "assets/images/services/rent/rent-hero.webp"]
];

for (const [name, leadType, hero] of pages) {
  test(`${name} has complete metadata, one H1, and a working lead-form contract`, () => {
    const file = path.join(root, name);
    const source = fs.readFileSync(file, "utf8");
    assert.equal([...source.matchAll(/<h1(?:\s[^>]*)?>/g)].length, 1);
    assert.match(source, new RegExp(`<link rel="canonical" href="https://domian-161\\.ru/${name}">`));
    assert.match(source, new RegExp(`property="og:image" content="https://domian-161\\.ru/${hero}"`));
    assert.match(source, new RegExp(`<form[^>]+data-lead-form[^>]+data-lead-type="${leadType}"`));
    for (const field of ["name", "phone", "service", "privacy_consent"]) {
      assert.match(source, new RegExp(`name="${field}"`), `${name}: ${field}`);
    }
    assert.match(source, /data-form-status/);
    assert.doesNotMatch(source, /будут добавлены|в наполнении|Смотреть варианты/i);
    for (const match of source.matchAll(/\bsrc="([^\"]+\.(?:webp|png|jpe?g))"/gi)) {
      const ref = match[1].replace(/^\//, "");
      assert.ok(fs.existsSync(path.join(root, ref)), `${name}: missing ${ref}`);
    }
  });
}

test("production service images are semantic WebP files and source PNGs stay outside the asset tree", () => {
  const serviceRoot = path.join(root, "assets", "images", "services");
  const files = fs.readdirSync(path.join(serviceRoot, "commercial")).concat(fs.readdirSync(path.join(serviceRoot, "rent")));
  assert.equal(files.filter((file) => file.endsWith(".webp")).length, 10);
  assert.ok(files.every((file) => !/^[0-9a-f]{8}-/i.test(file)));
});
