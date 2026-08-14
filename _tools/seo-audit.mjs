import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SITE_ORIGIN = "https://domian-161.ru";
const ORG_ID = `${SITE_ORIGIN}/#organization`;
const SKIP_PREFIXES = [
  "_private/",
  "_prototype_catalog/",
  "company-rebuild/",
  "source/",
  "ui-blocks/",
  "ui-rebuild/"
];
const SKIP_FILES = new Set(["index-preview.html"]);
const VERIFICATION_FILES = new Set([
  "googlea9952ce6911e1672.html",
  "yandex_9a50321c8f91e932.html"
]);
const errors = [];
const warnings = [];

function slash(value) {
  return value.replaceAll("\\", "/");
}

function trackedFiles(pattern = "*") {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", pattern], {
    cwd: ROOT,
    encoding: "utf8"
  }).trim();
  return output ? output.split(/\r?\n/u).map(slash) : [];
}

function isPublishable(file) {
  return !SKIP_FILES.has(file) && !SKIP_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function report(kind, file, message) {
  (kind === "error" ? errors : warnings).push({ file, message });
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim());
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "iu"));
  return match ? decodeHtml(match[2].trim()) : "";
}

function hasAttr(tag, name) {
  return new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|>|/)`, "iu").test(tag);
}

function htmlPathFromUrl(url) {
  let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!pathname) return "index.html";
  if (pathname.endsWith("/")) return `${pathname}index.html`;
  return pathname;
}

function resolveLocalReference(fromFile, rawValue) {
  const value = decodeHtml(rawValue || "").trim();
  if (!value || value.startsWith("#")) {
    return { file: fromFile, hash: value.slice(1), external: false };
  }
  if (/^(?:data:|mailto:|tel:|javascript:|blob:|\/\/)/iu.test(value)) return { external: true };

  let url;
  try {
    url = new URL(value, `${SITE_ORIGIN}/${slash(path.dirname(fromFile))}/`);
  } catch {
    return { invalid: true };
  }
  if (url.origin !== SITE_ORIGIN) return { external: true };

  let target = htmlPathFromUrl(url);
  if (!path.extname(target) && exists(`${target}.html`)) target += ".html";
  return { file: slash(target), hash: decodeURIComponent(url.hash.slice(1)), external: false };
}

function idsIn(html) {
  return [...html.matchAll(/(?:^|\s)id\s*=\s*(["'])(.*?)\1/giu)].map((match) => decodeHtml(match[2]));
}

function jsonLdNodes(value) {
  if (!value || typeof value !== "object") return [];
  return Array.isArray(value["@graph"]) ? value["@graph"] : [value];
}

const htmlFiles = trackedFiles("*.html").filter(isPublishable);
const documentFiles = htmlFiles.filter((file) => !VERIFICATION_FILES.has(file));
const htmlCache = new Map(documentFiles.map((file) => [file, read(file)]));
const idCache = new Map();
const titles = new Map();
const canonicals = new Map();

for (const file of documentFiles) {
  const html = htmlCache.get(file);
  const lower = html.toLowerCase();
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/iu.test(html);
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu);
  const descriptionMatch = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=(["'])(.*?)\1/iu);
  const canonicalMatches = [...html.matchAll(/<link\b[^>]*rel=(["'])canonical\1[^>]*>/giu)];
  const h1Count = (html.match(/<h1\b/giu) || []).length;
  const ids = idsIn(html);
  idCache.set(file, new Set(ids));

  if (!titleMatch || !stripTags(titleMatch[1])) report("error", file, "missing or empty <title>");
  else {
    const title = stripTags(titleMatch[1]);
    if (!titles.has(title)) titles.set(title, []);
    titles.get(title).push(file);
  }

  if (!descriptionMatch || !descriptionMatch[2].trim()) {
    report(noindex ? "warning" : "error", file, "missing meta description");
  }
  if (h1Count !== 1) report(noindex ? "warning" : "error", file, `expected one H1, found ${h1Count}`);

  if (canonicalMatches.length !== 1) {
    report("warning", file, `expected one canonical, found ${canonicalMatches.length}`);
  } else {
    const canonical = attr(canonicalMatches[0][0], "href");
    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonical);
      if (canonicalUrl.origin !== SITE_ORIGIN || canonicalUrl.hash || canonicalUrl.search) {
        report("error", file, `invalid canonical URL: ${canonical}`);
      }
      const target = htmlPathFromUrl(canonicalUrl);
      if (!exists(target)) report("error", file, `canonical target does not exist locally: ${target}`);
      if (!canonicals.has(canonical)) canonicals.set(canonical, []);
      canonicals.get(canonical).push(file);
    } catch {
      report("error", file, `canonical is not an absolute URL: ${canonical}`);
    }
  }

  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicateIds)) report("error", file, `duplicate id: #${id}`);

  for (const match of html.matchAll(/<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/giu)) {
    try {
      JSON.parse(match[2]);
    } catch (error) {
      report("error", file, `invalid JSON-LD: ${error.message}`);
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/giu)) {
    const tag = match[0];
    const src = attr(tag, "src");
    if (!hasAttr(tag, "alt")) report("error", file, `image has no alt attribute: ${src || "<dynamic>"}`);
    const dimensionExempt = !src || src.startsWith("#") || tag.includes("${") || /^https:\/\/mc\.yandex\./iu.test(src);
    if (!dimensionExempt && (!hasAttr(tag, "width") || !hasAttr(tag, "height"))) {
      report("warning", file, `image has no explicit width/height: ${src || "<dynamic>"}`);
    }
    if (src && !src.includes("${")) {
      const resolved = resolveLocalReference(file, src);
      if (!resolved.external && !resolved.invalid && !exists(resolved.file)) {
        report("error", file, `missing image: ${src} -> ${resolved.file}`);
      }
    }
  }

  for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/giu)) {
    const tag = match[0];
    const value = attr(tag, tag.startsWith("<script") ? "src" : "href");
    if (!value || value.includes("${")) continue;
    const resolved = resolveLocalReference(file, value);
    if (!resolved.external && !resolved.invalid && !exists(resolved.file)) {
      report("error", file, `missing local asset: ${value} -> ${resolved.file}`);
    }
  }

  for (const match of html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>/giu)) {
    const href = decodeHtml(match[2]);
    if (href.includes("${")) continue;
    const resolved = resolveLocalReference(file, href);
    if (resolved.external) continue;
    if (resolved.invalid) {
      report("error", file, `invalid link URL: ${href}`);
      continue;
    }
    if (!exists(resolved.file)) {
      report("error", file, `broken internal link: ${href} -> ${resolved.file}`);
      continue;
    }
    if (resolved.hash) {
      if (!htmlCache.has(resolved.file)) htmlCache.set(resolved.file, read(resolved.file));
      if (!idCache.has(resolved.file)) idCache.set(resolved.file, new Set(idsIn(htmlCache.get(resolved.file))));
      if (!idCache.get(resolved.file).has(resolved.hash)) {
        report("error", file, `missing fragment target: ${href} -> ${resolved.file}#${resolved.hash}`);
      }
    }

    const target = path.resolve(ROOT, resolved.file);
    const homepage = path.resolve(ROOT, "index.html");
    if (target === homepage && /(?:^|\/)index\.html(?:#|$)/iu.test(href)) {
      report("error", file, `homepage link is not normalized: ${href}`);
    }
  }

  if (html.includes("data-lead-form")) {
    for (const resource of ["assets/js/lead-config.js", "assets/js/main.js", "assets/js/form-handler.js"]) {
      const relative = slash(path.relative(path.dirname(file), resource));
      const variants = new Set([relative, `./${relative}`, `/${resource}`]);
      if (![...variants].some((candidate) => html.includes(candidate))) {
        report("error", file, `lead form is missing ${resource}`);
      }
    }
  }

  if (lower.includes("aggregateRating".toLowerCase()) || lower.includes('"@type":"offer"') || lower.includes('"@type": "offer"')) {
    report("warning", file, "review potentially sensitive rating/Offer structured data manually");
  }
}

for (const file of trackedFiles("*.css").filter(isPublishable)) {
  const css = read(file);
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/giu)) {
    const value = decodeHtml(match[2]).trim();
    if (!value || /^(?:data:|https?:|\/\/|#)/iu.test(value) || value.includes("${")) continue;
    const target = slash(path.normalize(path.join(path.dirname(file), value.split(/[?#]/u)[0])));
    if (!exists(target)) report("error", file, `missing CSS asset: ${value} -> ${target}`);
  }
}

for (const [title, files] of titles) {
  if (files.length > 1) report("warning", files.join(", "), `duplicate title: ${title}`);
}
for (const [canonical, files] of canonicals) {
  if (files.length > 1) report("warning", files.join(", "), `duplicate canonical: ${canonical}`);
}

const sitemap = read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/giu)].map((match) => decodeHtml(match[1]));
const sitemapFiles = new Set();
for (const value of sitemapUrls) {
  let url;
  try {
    url = new URL(value);
  } catch {
    report("error", "sitemap.xml", `invalid sitemap URL: ${value}`);
    continue;
  }
  if (url.origin !== SITE_ORIGIN) report("error", "sitemap.xml", `foreign sitemap origin: ${value}`);
  const file = htmlPathFromUrl(url);
  sitemapFiles.add(file);
  if (!exists(file)) {
    report("error", "sitemap.xml", `URL has no local file: ${value} -> ${file}`);
    continue;
  }
  const html = read(file);
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/iu.test(html)) {
    report("error", "sitemap.xml", `noindex page is present in sitemap: ${value}`);
  }
}

const robots = read("robots.txt");
if (!/^User-agent:\s*\*/imu.test(robots)) report("error", "robots.txt", "missing User-agent: *");
if (!/^Sitemap:\s*https:\/\/domian-161\.ru\/sitemap\.xml\s*$/imu.test(robots)) {
  report("error", "robots.txt", "missing canonical sitemap directive");
}

for (const file of documentFiles) {
  const html = htmlCache.get(file);
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/iu.test(html);
  if (!noindex && !sitemapFiles.has(file) && file !== "admin.html" && file !== "showcase-aksay-secondary.html") {
    report("warning", file, "indexable page is not present in sitemap");
  }
}

const googleVerification = read("googlea9952ce6911e1672.html").trim();
if (googleVerification !== "google-site-verification: googlea9952ce6911e1672.html") {
  report("error", "googlea9952ce6911e1672.html", "Google verification content changed");
}
if (!read("yandex_9a50321c8f91e932.html").includes("Verification: 9a50321c8f91e932")) {
  report("error", "yandex_9a50321c8f91e932.html", "Yandex verification content changed");
}

const indexJsonLd = [...read("index.html").matchAll(/<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/giu)]
  .flatMap((match) => {
    try { return jsonLdNodes(JSON.parse(match[2])); } catch { return []; }
  });
const organization = indexJsonLd.find((node) => node && node["@type"] === "RealEstateAgent");
if (organization && organization["@id"] && organization["@id"] !== ORG_ID) {
  report("error", "index.html", `unexpected organization @id: ${organization["@id"]}`);
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:sk_live|rk_live)_[0-9A-Za-z]{16,}\b/u,
  /\bghp_[0-9A-Za-z]{30,}\b/u
];
for (const file of trackedFiles().filter((item) => !item.startsWith("node_modules/") && !/\.(?:png|jpe?g|webp|gif|pdf|xlsx)$/iu.test(item))) {
  let content;
  try { content = read(file); } catch { continue; }
  if (secretPatterns.some((pattern) => pattern.test(content))) report("error", file, "possible private secret committed");
}

function printGroup(label, items) {
  console.log(`\n${label} (${items.length})`);
  for (const item of items) console.log(`- ${item.file}: ${item.message}`);
}

console.log(`SEO audit: ${documentFiles.length} publishable HTML documents, ${sitemapUrls.length} sitemap URLs.`);
printGroup("ERRORS", errors);
printGroup("WARNINGS", warnings);
console.log(`\nResult: ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) process.exitCode = 1;
