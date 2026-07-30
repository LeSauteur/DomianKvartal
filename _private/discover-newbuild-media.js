const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcesFile = path.join(__dirname, "newbuilds-pilot-sources.json");
const outputDir = path.join(root, "tmp", "newbuilds-rebuild");
const outputFile = path.join(outputDir, "media-candidates.json");
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";

function imageSize(buffer) {
  if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const kind = buffer.toString("ascii", 12, 16);
    if (kind === "VP8X" && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
        format: "webp"
      };
    }
    if (kind === "VP8 " && buffer.length >= 30) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, format: "webp" };
    }
    if (kind === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: "webp" };
    }
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: "jpeg" };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/");
}

function extractCandidates(html, pageUrl) {
  const found = new Set();
  const patterns = [
    /(?:src|data-src|data-original|data-lazy-src|href|content)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /https?:\\?\/\\?\/[^"'<>\s]+/gi
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const raw = decodeHtml(match[1] || match[0]).split(/\s+/)[0].replace(/[),;]+$/, "");
      if (!raw || /^data:|^javascript:|^mailto:|^tel:/i.test(raw)) continue;
      try {
        const url = new URL(raw, pageUrl);
        const lower = url.href.toLowerCase();
        if (/\.(?:svg|ico|gif)(?:\?|$)/i.test(lower)) continue;
        if (/(?:logo|favicon|sprite|icon|marker|counter|captcha|pixel|avatar)/i.test(lower)) continue;
        found.add(url.href);
      } catch (_error) {
        // Ignore malformed values from inline scripts.
      }
    }
  });

  return Array.from(found)
    .filter((url) => !/\.(?:css|js|woff2?|ttf|eot|pdf)(?:\?|$)/i.test(url))
    .sort((a, b) => {
      const score = (url) => {
        let value = 0;
        if (/\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(url)) value += 10;
        if (/(?:upload|uploads|images|image|media|gallery|photo|storage|cdn)/i.test(url)) value += 4;
        if (/(?:logo|favicon|sprite|icon|marker|counter|captcha|pixel|avatar)/i.test(url)) value -= 20;
        return value;
      };
      return score(b) - score(a);
    })
    .slice(0, 72);
}

async function inspectImage(url, referer) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": userAgent, accept: "image/avif,image/webp,image/*,*/*;q=0.8", referer },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 12000 || buffer.length > 18 * 1024 * 1024) return null;
    const metadata = imageSize(buffer);
    if (!metadata || !metadata.width || !metadata.height) return null;
    if (metadata.width < 500 || metadata.height < 320) return null;
    return {
      url: response.url,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      bytes: buffer.length
    };
  } catch (_error) {
    return null;
  }
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function main() {
  const requestedSlug = process.argv[2] || "";
  const allSources = JSON.parse(fs.readFileSync(sourcesFile, "utf8"));
  const sources = requestedSlug ? allSources.filter((source) => source.slug === requestedSlug) : allSources;
  if (!sources.length) throw new Error(`Unknown pilot slug: ${requestedSlug}`);
  const report = requestedSlug && fs.existsSync(outputFile)
    ? JSON.parse(fs.readFileSync(outputFile, "utf8")).filter((item) => item.slug !== requestedSlug)
    : [];

  for (const source of sources) {
    process.stdout.write(`discover ${source.slug} ... `);
    try {
      const response = await fetch(source.page_url, {
        redirect: "follow",
        headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const candidates = extractCandidates(html, response.url);
      const inspected = await mapLimit(candidates, 12, (url) => inspectImage(url, response.url));
      const images = inspected.filter(Boolean).sort((a, b) => (b.width * b.height) - (a.width * a.height));
      report.push({ ...source, resolved_page_url: response.url, candidate_count: candidates.length, images });
      console.log(`${images.length} usable images`);
    } catch (error) {
      report.push({ ...source, error: error.message, images: [] });
      console.log(`ERROR ${error.message}`);
    }
  }

  report.sort((a, b) => allSources.findIndex((item) => item.slug === a.slug) - allSources.findIndex((item) => item.slug === b.slug));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`saved ${path.relative(root, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
