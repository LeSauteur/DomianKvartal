// Extract the known generated Kvartal markup. Unsupported markup fails visibly.
import { createHash } from 'node:crypto';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const lf = value => value.replaceAll('\r\n', '\n');
export const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const decodeHtml = value => value.replace(/&(?:amp|quot|#39|lt|gt|nbsp);/g, entity => ({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>','&nbsp;':'\u00a0'})[entity]);

export function requiredMatch(html, re, label) {
  const value = html.match(re)?.[1];
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

export function pageContract(source) {
  const html = lf(source);
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const intro = requiredMatch(html, /<section class="visibility-intro container">([\s\S]*?)<\/section>\n/, 'object content');
  const gallery = requiredMatch(intro, /<div class="visibility-gallery">([\s\S]*?)<\/div>/, 'gallery');
  const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decodeHtml(m[2])]));
  return {
    title: decodeHtml(requiredMatch(html, /<title>(.*?)<\/title>/, 'title')),
    description: decodeHtml(requiredMatch(html, /<meta name="description" content="([^"]*)">/, 'description')),
    canonical: decodeHtml(requiredMatch(html, /<link rel="canonical" href="([^"]*)">/, 'canonical')),
    robots: html.match(/<meta name="robots" content="([^"]*)">/)?.[1] ?? null,
    h1: decodeHtml(requiredMatch(intro, /<h1>(.*?)<\/h1>/, 'h1')),
    structuredData: scripts,
    introHtml: intro,
    gallery: [...gallery.matchAll(/<img\b[^>]*>/g)].map(m => attrs(m[0])),
    plansHtml: intro.match(/<section class="visibility-plans"[\s\S]*?<\/section>/)?.[0] ?? '',
    descriptionHtml: intro.match(/<section class="visibility-description"[\s\S]*?<\/section>/)?.[0] ?? '',
    form: attrs(requiredMatch(html, /(<form\b[^>]*data-lead-form[^>]*>)/, 'lead form')),
    actions: [...intro.matchAll(/<a\b[^>]*data-object-id[^>]*>/g)].map(m => attrs(m[0])),
    normalizedHtmlSha256: sha256(html)
  };
}
