import fs from "node:fs/promises";
import path from "node:path";

const LOCAL_REPO_CANDIDATES = [
  path.resolve(process.cwd(), "../DomianKvartal-images"),
  path.resolve(process.cwd(), "DomianKvartal-images"),
  path.resolve(process.cwd(), "../../DomianKvartal-images")
];

const TARGET_FILES = [
  "output/home/new-objects.json",
  "output/apartments/new-objects.json",
  "output/houses/new-objects.json",
  "output/lands/new-objects.json",
  "output/newbuilds/new-objects.json"
];

const EMPTY_FEATURES = {
  propertyType: null,
  rooms: null,
  floor: null,
  totalArea: null,
  livingArea: null,
  kitchenArea: null,
  landArea: null,
  balcony: null,
  bathroom: null,
  heating: null,
  layout: null,
  view: null,
  renovation: null,
  gas: null
};

const FEATURE_KEY_MAP = new Map([
  ["тип объекта", "propertyType"],
  ["количество комнат", "rooms"],
  ["этаж", "floor"],
  ["этажей в квартире", "floor"],
  ["площадь общая", "totalArea"],
  ["общая площадь", "totalArea"],
  ["общая площадь дома", "totalArea"],
  ["площадь жилая", "livingArea"],
  ["жилая площадь", "livingArea"],
  ["площадь комнат", "livingArea"],
  ["площадь кухни", "kitchenArea"],
  ["площадь участка", "landArea"],
  ["балкон/лоджия", "balcony"],
  ["балкон", "balcony"],
  ["санузел", "bathroom"],
  ["отопление", "heating"],
  ["планировка", "layout"],
  ["вид из окон", "view"],
  ["ремонт", "renovation"],
  ["газ", "gas"]
]);

const REPO_DIR_BY_TYPE = {
  apartment: "NewApartmens",
  house: "NEWHouse"
};

let cachedImagesRepoPath = null;

function normalizeSpaces(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function maybeRepairMojibake(text) {
  const source = String(text || "");
  if (!source) return source;

  const repaired = Buffer.from(source, "latin1").toString("utf8");
  const sourceMarker = (source.match(/[РС][А-Яа-яЁё]/g) || []).length;
  const repairedMarker = (repaired.match(/[РС][А-Яа-яЁё]/g) || []).length;
  const sourceCyr = (source.match(/[А-Яа-яЁё]/g) || []).length;
  const repairedCyr = (repaired.match(/[А-Яа-яЁё]/g) || []).length;

  if (!/Об объекте/i.test(source) && /Об объекте/i.test(repaired)) return repaired;
  if (repairedCyr > sourceCyr && repairedMarker < sourceMarker) return repaired;
  return source;
}

function cleanNarrativeLine(line) {
  let text = String(line || "").replace(/\r/g, "").trim();
  if (!text) return "";

  // Remove common bullet/emoji noise at line edges, keep meaningful symbols.
  text = text.replace(/^[\s\-•·▪▫◦●○★☆✅☑️✔️✳️✴️✦✧🔥⭐️✨☎️📞📌📍🏠🏡🧭📝⏱️⚡️‼️❗️❕❓❔🟢🟡🟣🔹🔸]+/gu, "");
  text = text.replace(/[\s\-•·▪▫◦●○★☆✅☑️✔️✳️✴️✦✧🔥⭐️✨☎️📞📌📍🏠🏡🧭📝⏱️⚡️‼️❗️❕❓❔🟢🟡🟣🔹🔸]+$/gu, "");
  return normalizeSpaces(text);
}

function normalizeFeatureKey(key) {
  return normalizeSpaces(key).toLowerCase().replace(/ё/g, "е").replace(/[.:]/g, "");
}

function splitDescriptionAndFeatures(rawText) {
  const lines = String(rawText || "")
    .split(/\n/)
    .map((line) => line.replace(/\r/g, ""));

  const markerIndex = lines.findIndex((line) => normalizeSpaces(line).toLowerCase().includes("об объекте"));

  if (markerIndex !== -1) {
    return {
      narrativeLines: lines.slice(0, markerIndex),
      featureLines: lines.slice(markerIndex + 1)
    };
  }

  const narrativeLines = [];
  const featureLines = [];
  for (const line of lines) {
    const cleaned = cleanNarrativeLine(line);
    if (!cleaned) continue;
    const colonMatch = cleaned.match(/^(.+?)\s*:\s*(.+)$/);
    if (!colonMatch) {
      narrativeLines.push(line);
      continue;
    }
    if (FEATURE_KEY_MAP.has(normalizeFeatureKey(colonMatch[1]))) {
      featureLines.push(cleaned);
    } else {
      narrativeLines.push(line);
    }
  }

  return {
    narrativeLines,
    featureLines
  };
}

function buildShortDescription(narrativeParagraphs) {
  const cleanParagraphs = narrativeParagraphs
    .map((line) => cleanNarrativeLine(line))
    .filter(Boolean)
    .filter((line) => !/^описание объекта$/i.test(line))
    .filter((line) => !/^(основные параметры|расположение|условия сделки|преимущества|что уже сделано|почему стоит выбрать именно эту квартиру\??)$/i.test(line))
    .filter((line) => !/:$/.test(line))
    .filter((line) => !/^.{1,26}:\s+.+$/.test(line));
  const compact = normalizeSpaces(cleanParagraphs.join(" "));
  if (!compact) return "";

  const sentences = compact
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) {
    return compact.length > 220 ? `${compact.slice(0, 217).trimEnd()}...` : compact;
  }

  const picked = [];
  for (const sentence of sentences) {
    if (picked.length >= 3) break;
    if (sentence.length < 15) continue;
    picked.push(sentence);
  }

  const joined = (picked.length ? picked : sentences.slice(0, 2)).join(" ");
  return joined.length > 220 ? `${joined.slice(0, 217).trimEnd()}...` : joined;
}

function parseFeatures(featureLines) {
  const features = { ...EMPTY_FEATURES };
  const cleaned = featureLines
    .map((line) => cleanNarrativeLine(line))
    .filter(Boolean);

  if (!cleaned.length) return features;

  let i = 0;
  while (i < cleaned.length) {
    const line = cleaned[i];
    let key = "";
    let value = "";

    const colonMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (colonMatch) {
      key = colonMatch[1];
      value = colonMatch[2];
      i += 1;
    } else if (i + 1 < cleaned.length) {
      key = line;
      value = cleaned[i + 1];
      i += 2;
    } else {
      i += 1;
    }

    const featureKey = FEATURE_KEY_MAP.get(normalizeFeatureKey(key));
    if (!featureKey) continue;
    if (!normalizeSpaces(value)) continue;
    features[featureKey] = normalizeSpaces(value);
  }

  return features;
}

async function directoryExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function findImagesRepoPath() {
  if (cachedImagesRepoPath) return cachedImagesRepoPath;

  for (const candidate of LOCAL_REPO_CANDIDATES) {
    if (await directoryExists(candidate)) {
      cachedImagesRepoPath = candidate;
      return cachedImagesRepoPath;
    }
  }

  throw new Error("DomianKvartal-images local repository was not found");
}

async function fetchRemoteObjectData(item) {
  const imagesRepoPath = await findImagesRepoPath();
  const repoDir = REPO_DIR_BY_TYPE[item.type];
  if (!repoDir || !item.id) return null;

  const objectDir = path.join(imagesRepoPath, repoDir, item.id);
  if (!(await directoryExists(objectDir))) return null;

  let files;
  try {
    files = await fs.readdir(objectDir, { withFileTypes: true });
  } catch {
    return null;
  }

  if (!Array.isArray(files) || !files.length) return null;

  const fileNames = new Set(files.filter((f) => f.isFile()).map((f) => f.name));
  const descriptionName = [...fileNames].find((name) => name.toLowerCase() === "description.txt");
  if (!descriptionName) return null;

  let rawDescription = "";
  const descriptionPath = path.join(objectDir, descriptionName);
  try {
    rawDescription = await fs.readFile(descriptionPath, "utf8");
    rawDescription = maybeRepairMojibake(rawDescription);
  } catch {
    rawDescription = "";
  }

  const { narrativeLines, featureLines } = splitDescriptionAndFeatures(rawDescription);
  const narrativeParagraphs = narrativeLines
    .map((line) => cleanNarrativeLine(line))
    .filter(Boolean);

  const fullDescription = narrativeParagraphs.join("\n\n");
  const shortDescription = buildShortDescription(narrativeParagraphs);
  const features = parseFeatures(featureLines);

  return {
    shortDescription,
    fullDescription,
    features
  };
}

async function enrichFile(filePath) {
  const absPath = path.resolve(filePath);
  const raw = await fs.readFile(absPath, "utf8");
  const normalizedRaw = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const items = JSON.parse(normalizedRaw);
  if (!Array.isArray(items) || !items.length) {
    console.log(`${filePath}: skipped (empty)`);
    return;
  }

  let changed = false;
  const enriched = [];
  for (const item of items) {
    const remoteData = await fetchRemoteObjectData(item);
    if (!remoteData) {
      enriched.push(item);
      continue;
    }

    changed = true;
    enriched.push({
      ...item,
      shortDescription: remoteData.shortDescription || "",
      fullDescription: remoteData.fullDescription || "",
      features: remoteData.features
    });
  }

  if (!changed) {
    console.log(`${filePath}: skipped (no matching local description source)`);
    return;
  }

  await fs.writeFile(absPath, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
  console.log(`${filePath}: enriched ${enriched.length}`);
}

async function main() {
  const sourcePath = await findImagesRepoPath();
  console.log(`Using local descriptions source: ${sourcePath}`);
  for (const filePath of TARGET_FILES) {
    try {
      await enrichFile(filePath);
    } catch (error) {
      console.warn(`${filePath}: failed (${error.message})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
