import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const legalPages = [
  "privacy.html",
  "personal-data-consent.html",
  "cookies.html",
  "offer.html",
  "details.html"
];
const excludedDirectories = new Set([
  ".git",
  "_private",
  "_prototype_catalog",
  "company-rebuild",
  "node_modules",
  "output",
  "playwright-report",
  "source",
  "test-results",
  "ui-blocks",
  "ui-rebuild"
]);

function collectHtml(directory = root) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...collectHtml(target));
    else if (entry.isFile() && entry.name.endsWith(".html")) result.push(target);
  }
  return result;
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function text(html) {
  return html.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function resolveLocal(fromFile, href) {
  if (!href || /^(?:#|https?:|mailto:|tel:|\/\/)/u.test(href)) return null;
  const pathname = href.split(/[?#]/u)[0];
  return href.startsWith("/")
    ? path.join(root, pathname.replace(/^\/+/, ""))
    : path.resolve(path.dirname(fromFile), pathname);
}

test("all required legal documents exist with operator details and canonical URLs", () => {
  for (const page of legalPages) {
    assert.ok(fs.existsSync(path.join(root, page)), `${page} is missing`);
    const html = read(page);
    assert.match(html, /Алиев(?:а|ой) Зухр(?:а|е) Рахитовн(?:а|ой|е)/u, page);
    assert.match(html, /662104294378/u, page);
    assert.match(html, /325619600005191/u, page);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://domian-161\\.ru/${page}">`, "u"), page);
  }

  const combined = legalPages.map(read).join("\n");
  assert.doesNotMatch(combined, /уточняются у администрации/iu);
  assert.doesNotMatch(combined, /срок обработки персональных данных является неограниченным/iu);
  assert.doesNotMatch(combined, /никогда,? ни при каких условиях не (?:будут )?передан/iu);
});

test("every production lead form uses a separate required unchecked consent", () => {
  const failures = [];
  let count = 0;

  for (const file of collectHtml()) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(/<form\b[^>]*\bdata-lead-form\b[^>]*>[\s\S]*?<\/form>/giu)) {
      count += 1;
      const form = match[0];
      const checkbox = form.match(/<input\b[^>]*\bname=["']privacy_consent["'][^>]*>/iu)?.[0] || "";
      const consentLink = form.match(/<a\b[^>]*href=["']\/personal-data-consent\.html["'][^>]*>([\s\S]*?)<\/a>/iu);
      const policyLink = form.match(/<a\b[^>]*href=["']\/privacy\.html["'][^>]*>([\s\S]*?)<\/a>/iu);
      const relative = path.relative(root, file);

      if (!checkbox || !/\brequired(?:\s|>|=)/iu.test(checkbox)) failures.push(`${relative}: checkbox is not required`);
      if (!/\bvalue=["']accepted["']/iu.test(checkbox)) failures.push(`${relative}: accepted value is missing`);
      if (/\bchecked(?:\s|>|=)/iu.test(checkbox)) failures.push(`${relative}: checkbox is pre-checked`);
      if (!consentLink || text(consentLink[1]) !== "согласие на обработку персональных данных") failures.push(`${relative}: consent link is missing`);
      if (!policyLink || text(policyLink[1]) !== "Политикой обработки персональных данных") failures.push(`${relative}: policy link is missing`);
      if (!/Я даю\s*<a\b/iu.test(form)) failures.push(`${relative}: consent wording is incorrect`);
      if (!/class=["'][^"']*form-consent-note[^"']*["']/iu.test(form)) failures.push(`${relative}: separate policy notice is missing`);
      if (/принимаю\s+(?:<[^>]+>)*политик/iu.test(form)) failures.push(`${relative}: policy is combined with consent`);
    }
  }

  assert.equal(count, 32);
  assert.deepEqual(failures, []);
});

test("legal pages and footer document links resolve locally", () => {
  const failures = [];
  for (const page of legalPages) {
    const file = path.join(root, page);
    for (const match of read(page).matchAll(/<(?:a|link|script)\b[^>]*(?:href|src)=["']([^"']+)["']/giu)) {
      const target = resolveLocal(file, match[1]);
      if (target && !fs.existsSync(target)) failures.push(`${page} -> ${match[1]}`);
    }
  }

  const expected = legalPages.map((page) => `href="/${page}"`);
  const sitemap = read("sitemap.xml");
  const sitemapFiles = [...sitemap.matchAll(/<loc>https:\/\/domian-161\.ru\/(.*?)<\/loc>/giu)]
    .map((match) => match[1] || "index.html")
    .map((value) => value.endsWith("/") ? `${value}index.html` : value);
  for (const relative of sitemapFiles) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    const footer = html.match(/<footer(?:\s|>)[\s\S]*?<\/footer>/iu)?.[0];
    if (!footer) continue;
    for (const href of expected) {
      if (!footer.includes(href)) failures.push(`${relative}: footer lacks ${href}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("new legal pages are listed once in sitemap", () => {
  const sitemap = read("sitemap.xml");
  for (const page of ["personal-data-consent.html", "cookies.html"]) {
    const url = `https://domian-161.ru/${page}`;
    assert.equal(sitemap.split(url).length - 1, 1, `${url} must appear once`);
  }
});
