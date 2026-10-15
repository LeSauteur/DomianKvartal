import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { publicHtmlFiles } from '../_tools/site-pages.mjs';
import { publicPage, leadForm } from '../_tools/public-page.mjs';

const root = path.resolve(import.meta.dirname, '..');
function checkCaptcha(file, html) {
  const forms = [...html.matchAll(/<form\b[^>]*\bdata-lead-form\b[^>]*>[\s\S]*?<\/form>/gi)];
  if (!forms.length) return 0;
  const scripts = [...html.matchAll(/<script\b[^>]*src="https:\/\/web3forms\.com\/client\/script\.js"[^>]*>/gi)];
  assert.equal(scripts.length, 1, `${file}: one captcha script per page`);
  assert.match(scripts[0][0], /\basync(?:\s|>)/i, file);
  assert.match(scripts[0][0], /\bdefer(?:\s|>)/i, file);
  for (const [index, match] of forms.entries()) {
    const form = match[0];
    const widgets = [...form.matchAll(/<div\b[^>]*class="[^"]*\bh-captcha\b[^"]*"[^>]*>/gi)];
    assert.equal(widgets.length, 1, `${file}: form ${index + 1}`);
    assert.match(widgets[0][0], /data-captcha="true"/i, file);
    assert.match(widgets[0][0], /data-size="compact"/i, file);
    assert.ok(form.indexOf(widgets[0][0]) < form.indexOf('class="form-consent'), `${file}: before consent`);
  }
  return forms.length;
}

test('every public lead form and preview includes hCaptcha and exactly one async/defer script', () => {
  let count = 0;
  for (const file of [...publicHtmlFiles(), 'index-preview.html']) {
    count += checkCaptcha(file, fs.readFileSync(path.join(root, file), 'utf8'));
  }
  assert.ok(count >= 263, `expected all lead forms, found ${count}`);
});

test('page generators preserve captcha markup and script', () => {
  checkCaptcha('publicPage generator', publicPage({file:'captcha-test.html', title:'Test', description:'Test', h1:'Test', body:'', form:leadForm('captcha_test')}));
  const construction = fs.readFileSync(path.join(root, 'tools/generate-construction-catalog.py'), 'utf8');
  assert.match(construction, /<div class="h-captcha" data-captcha="true" data-size="compact"><\/div>/);
  assert.match(construction, /<script src="https:\/\/web3forms.com\/client\/script.js" async defer><\/script>/);
});
