import assert from 'node:assert/strict';
import { origin } from './paths.mjs';

const numericFields = ['areaM2','livingAreaM2','kitchenAreaM2','rooms','floor','floors','landAreaSot'];
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function validateListings(records) {
  assert.ok(Array.isArray(records), 'listings must be an array');
  const ids = new Set(), urls = new Set();
  for (const item of records) {
    const label = item.id || 'unnamed listing';
    assert.equal(item.schemaVersion, 1, `${label}: schemaVersion`);
    assert.match(item.id, /^[a-z][a-z0-9_-]*$/, `${label}: invalid id`);
    assert.ok(!ids.has(item.id), `${label}: duplicate id`); ids.add(item.id);
    assert.equal(item.url, `/obekt/${item.id}.html`, `${label}: stable object URL required`);
    assert.ok(!urls.has(item.url), `${label}: duplicate URL`); urls.add(item.url);
    assert.ok(['apartment','house','land'].includes(item.type), `${label}: unsupported type`);
    assert.equal(typeof item.published, 'boolean', `${label}: published`);
    assert.equal(typeof item.title, 'string', `${label}: title`);
    assert.ok(item.title.trim().length > 0, `${label}: empty title`);
    assert.equal(typeof item.description, 'string', `${label}: description`);
    assert.ok(item.price === null || (Number.isSafeInteger(item.price) && item.price > 0), `${label}: price must be rubles or null`);
    assert.equal(item.currency, 'RUB', `${label}: currency`);
    for (const key of ['city','settlement','district','address','precision']) assert.ok(item.location[key] === null || typeof item.location[key] === 'string', `${label}: location.${key}`);
    for (const key of numericFields) {
      const n = item.characteristics[key];
      assert.ok(n === null || (Number.isFinite(n) && n >= (key === 'rooms' ? 0 : Number.MIN_VALUE)), `${label}: characteristics.${key}`);
      if (['rooms','floor','floors'].includes(key) && n !== null) assert.ok(Number.isInteger(n), `${label}: ${key} must be integer`);
    }
    const { floor, floors } = item.characteristics;
    assert.ok(floor === null || floors === null || floor <= floors, `${label}: floor exceeds building floors`);
    assert.ok(['active','reserved','sold','archived'].includes(item.availability.status), `${label}: status`);
    assert.ok(['unverified','confirmed'].includes(item.availability.confirmation), `${label}: confirmation`);
    if (item.availability.confirmation === 'confirmed') assert.ok(validDate(item.availability.verifiedAt), `${label}: confirmed availability needs a verification date`);
    assert.equal(typeof item.availability.label, 'string', `${label}: status label`);
    assert.ok(Array.isArray(item.images), `${label}: images`);
    if (item.published) assert.ok(item.images.length > 0, `${label}: published object needs images`);
    for (const image of item.images) {
      assert.ok(typeof image.src === 'string' && image.src.length, `${label}: image source`);
      const url = new URL(image.src, origin);
      assert.equal(url.protocol, 'https:', `${label}: image protocol`);
      assert.equal(typeof image.alt, 'string', `${label}: image alt`);
      assert.ok(Number.isInteger(image.width) && image.width > 0 && Number.isInteger(image.height) && image.height > 0, `${label}: image dimensions`);
    }
    assert.ok(Array.isArray(item.floorPlans), `${label}: floorPlans`);
    for (const source of item.floorPlans) {
      assert.ok(typeof source === 'string' && source.length, `${label}: floor plan source`);
      assert.equal(new URL(source, origin).protocol,'https:',`${label}: floor plan protocol`);
    }
    if (item.complexPages !== undefined) assert.ok(Array.isArray(item.complexPages), `${label}: complex pages`);
    for (const value of [item.contentUpdatedAt,item.publishedAt,item.availability.verifiedAt]) {
      assert.ok(value == null || validDate(value), `${label}: invalid date`);
    }
    assert.equal(item.seo.canonical, origin + item.url, `${label}: canonical`);
    assert.equal(typeof item.seo.title, 'string', `${label}: SEO title`);
    assert.equal(typeof item.seo.description, 'string', `${label}: SEO description`);
    assert.ok(item.seo.robots === null || typeof item.seo.robots === 'string', `${label}: robots`);
  }
  return records;
}

export function publicListing(item) {
  const { migration, seo, contentUpdatedAt, schemaVersion, ...visible } = item;
  const { verifiedBy, verifiedAt, ...availability } = visible.availability;
  return { ...visible, availability };
}
