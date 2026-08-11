import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const maxDirectUrl = "https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4";
const maxQrTargetUrl = "https://max.ru/u/f9LHodD0cOKFV__kpRBNhj_H54xYXUoPjVAxg-CwKQe2Dtim_FGHBJ7crEU";
const excludedDirectories = new Set([
  ".git",
  "JK",
  "NFG",
  "_private",
  "_prototype_catalog",
  "company-rebuild",
  "node_modules",
  "output",
  "playwright-report",
  "source",
  "test-results",
  "tmp",
  "ui-blocks",
  "ui-rebuild"
]);

function collectFiles(directory, extensions) {
  const result = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      result.push(fullPath);
    }
  }

  return result;
}

function plainText(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isFormCta(text) {
  return /заявк|получить\s+консультац|обсудить|оценить\s+недвиж|консультац.*ипотек|вашу\s+ситуац|уточнить\s+налич|получить\s+подбор|получить\s+предлож|получить\s+расч[её]т|записаться|^связаться(?:\s|$)|расскажите\s+о\s+вашем\s+объекте|страхование\s+(?:рисков|сделки)|гарантия\s+(?:выбора|продажи)|семейная\s+ипотека\s+за\s+5\s+минут|рассрочка\s+на\s+жилье/i.test(text);
}

function getAnchors(source) {
  return [...source.matchAll(/<a\b(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/a>/gi)].map((match) => {
    const href = match.groups.attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
    return { href, text: plainText(match.groups.body) };
  });
}

const htmlFiles = collectFiles(root, new Set([".html"]));
const publicCodeFiles = collectFiles(root, new Set([".html", ".js", ".json"]));

test("production lead forms include the main form and every construction landing page", () => {
  const leadForms = htmlFiles.filter((file) => /<form\b[^>]*\bdata-lead-form\b/i.test(fs.readFileSync(file, "utf8")));
  const relative = leadForms.map((file) => path.relative(root, file).replaceAll("\\", "/")).sort();

  assert.equal(relative.length, 32);
  assert.ok(relative.includes("index-preview.html"));
  assert.ok(relative.includes("index.html"));
  assert.ok(relative.includes("construction.html"));
  assert.equal(relative.filter((file) => file.startsWith("construction/projects/")).length, 26);
  assert.equal(relative.filter((file) => file.startsWith("construction/builders/")).length, 3);
  assert.match(fs.readFileSync(path.join(root, "newbuilds.html"), "utf8"), /id="newbuildFilters"/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "newbuilds.html"), "utf8"), /data-lead-form/);
});

test("all form-promising CTA links target the dedicated form anchor", () => {
  const failures = [];
  let count = 0;

  for (const file of htmlFiles) {
    const source = fs.readFileSync(file, "utf8");

    for (const anchor of getAnchors(source)) {
      if (!isFormCta(anchor.text)) continue;
      count += 1;

      if (!anchor.href.endsWith("#lead-form-section")) {
        failures.push(`${path.relative(root, file)}: ${anchor.text} -> ${anchor.href}`);
      }
    }
  }

  assert.ok(count >= 100, "expected a broad CTA audit across the site");
  assert.deepEqual(failures, []);
});

test("every form CTA resolves to an existing file and anchor from nested pages", () => {
  const failures = [];

  for (const file of htmlFiles) {
    const source = fs.readFileSync(file, "utf8");

    for (const anchor of getAnchors(source)) {
      if (!isFormCta(anchor.text)) continue;

      const [relativeTarget, fragment] = anchor.href.split("#");
      const targetFile = relativeTarget
        ? path.resolve(path.dirname(file), decodeURIComponent(relativeTarget))
        : file;

      if (!fs.existsSync(targetFile)) {
        failures.push(`${path.relative(root, file)} -> missing ${anchor.href}`);
        continue;
      }

      const targetSource = fs.readFileSync(targetFile, "utf8");
      if (fragment !== "lead-form-section" || !/id=["']lead-form-section["']/.test(targetSource)) {
        failures.push(`${path.relative(root, file)} -> bad anchor ${anchor.href}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("Web3Forms key and endpoint have one frontend configuration source", () => {
  const keyDeclarations = [];
  const endpointDeclarations = [];

  for (const file of publicCodeFiles) {
    const source = fs.readFileSync(file, "utf8");
    if (/\baccessKey\s*:\s*["'][^"']+["']/.test(source)) keyDeclarations.push(path.relative(root, file));
    if (/https:\/\/api\.web3forms\.com\/submit/.test(source)) endpointDeclarations.push(path.relative(root, file));
    assert.doesNotMatch(source, /name=["']access_key["']/i, `duplicated access_key field in ${path.relative(root, file)}`);
  }

  assert.deepEqual(keyDeclarations, [path.join("assets", "js", "lead-config.js")]);
  assert.deepEqual(endpointDeclarations, [path.join("assets", "js", "lead-config.js")]);
});

test("public pseudo-admin secrets and browser lead database are removed", () => {
  for (const file of publicCodeFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /ADMIN_PASSWORD|domian_admin_auth|domian_leads/i, path.relative(root, file));
  }

  assert.match(fs.readFileSync(path.join(root, "admin.html"), "utf8"), /Публичный журнал заявок отключён/);
});

test("phone normalization supports common Russian formats", () => {
  const source = fs.readFileSync(path.join(root, "assets", "js", "form-handler.js"), "utf8");
  const window = {
    DOMIAN_LEAD_CONFIG: {},
    DOMIAN_METRIKA_ID: 109303205
  };
  const document = {
    readyState: "loading",
    addEventListener() {}
  };
  const context = {
    AbortController,
    Date,
    Error,
    JSON,
    Number,
    Object,
    Promise,
    URLSearchParams,
    document,
    window
  };

  window.window = window;
  vm.runInNewContext(source, context);
  const api = window.domianLeadForm;

  assert.equal(api.normalizePhone("+7 999 123-45-67"), "+79991234567");
  assert.equal(api.normalizePhone("8 999 123-45-67"), "+79991234567");
  assert.equal(api.normalizePhone("89991234567"), "+79991234567");
  assert.equal(api.normalizePhone("9991234567"), "+79991234567");
  assert.equal(api.normalizePhone("1"), "");
  assert.equal(api.isValidEmail(""), true);
  assert.equal(api.isValidEmail("valid@example.ru"), true);
  assert.equal(api.isValidEmail("wrong@"), false);
  assert.equal(api.categoryForHttpStatus(400), "http_400");
  assert.equal(api.categoryForHttpStatus(403), "http_403");
  assert.equal(api.categoryForHttpStatus(429), "http_429");
  assert.equal(api.categoryForHttpStatus(500), "http_500");
});

test("analytics uses the required distinct goal IDs without legacy duplicates", () => {
  const main = fs.readFileSync(path.join(root, "assets", "js", "main.js"), "utf8");
  const handler = fs.readFileSync(path.join(root, "assets", "js", "form-handler.js"), "utf8");
  const combined = `${main}\n${handler}`;
  const required = [
    "lead_form_view",
    "lead_form_open",
    "lead_form_submit_attempt",
    "lead_form_success",
    "lead_form_error",
    "phone_click",
    "whatsapp_click",
    "telegram_click",
    "max_click",
    "max_qr_open",
    "max_direct_open"
  ];

  for (const goal of required) assert.match(combined, new RegExp(`["']${goal}["']`));
  assert.doesNotMatch(combined, /["']tel_click["']|["']form_success["']|["']form_error["']/);
});

test("MAX direct route is present in required contact zones and no alternative route leaked into UI", () => {
  for (const relative of ["index.html", "team/zukhra-alieva.html", "thanks.html"]) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert.match(source, new RegExp(maxDirectUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, /data-channel=["']max["']/);
    assert.match(source, /data-max-trigger/);
    assert.match(source, /aria-label=["']Написать Зухре в MAX["']/);
    assert.match(source, /target=["']_blank["']/);
    assert.match(source, /rel=["']noopener noreferrer["']/);
    assert.doesNotMatch(source, new RegExp(maxQrTargetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const allowed = new Set([maxDirectUrl, maxQrTargetUrl]);
  for (const file of publicCodeFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/https:\/\/max\.ru\/u\/[A-Za-z0-9_-]+/g)) {
      assert.ok(allowed.has(match[0]), `unexpected MAX route in ${path.relative(root, file)}`);
    }
  }
});

test("MAX QR and logo assets are lossless PNG files with stable dimensions and hashes", () => {
  const assets = [
    {
      file: "assets/images/max-zukhra-qr.png",
      width: 642,
      height: 642,
      sha256: "44ead0e30606246243c7c1731cb6debce5ebc651cd67a8f6f68418aeca4bfa97"
    },
    {
      file: "assets/images/max-logo.png",
      width: 230,
      height: 230,
      sha256: "ab450684bad4708ccb5dd8db46ec388aa87b858cc34dde3a4cbb72c539ec2b88"
    }
  ];

  for (const asset of assets) {
    const content = fs.readFileSync(path.join(root, asset.file));
    assert.deepEqual([...content.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(content.readUInt32BE(16), asset.width);
    assert.equal(content.readUInt32BE(20), asset.height);
    assert.equal(crypto.createHash("sha256").update(content).digest("hex"), asset.sha256);
  }
});

test("MAX uses the supplied QR image and contains no canvas pseudo-QR generator", () => {
  const main = fs.readFileSync(path.join(root, "assets", "js", "main.js"), "utf8");
  const agent = fs.readFileSync(path.join(root, "team", "zukhra-alieva.html"), "utf8");
  const config = fs.readFileSync(path.join(root, "assets", "js", "lead-config.js"), "utf8");

  assert.match(main, /max-zukhra-qr\.png/);
  assert.match(config, new RegExp(maxQrTargetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(`${main}\n${agent}`, /qrCanvas|simpleHash|generateQR|getContext\(["']2d["']\)/);
  assert.doesNotMatch(`${main}\n${agent}\n${config}`, /MAX_BOT_TOKEN|SMTP_PASSWORD|client_secret/i);
});

test("setup and architecture documentation exists and does not contain credential values", () => {
  const setup = fs.readFileSync(path.join(root, "docs", "LEAD-SETUP.md"), "utf8");
  const architecture = fs.readFileSync(path.join(root, "docs", "LEAD-ARCHITECTURE.md"), "utf8");

  assert.match(setup, /lead_form_view/);
  assert.match(setup, /контролируемая production-проверка/i);
  assert.match(architecture, /Cloudflare Worker \+ D1/);
  assert.doesNotMatch(`${setup}\n${architecture}`, /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
});
