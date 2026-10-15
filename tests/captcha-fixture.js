const base = require('@playwright/test');

// No captcha scripts or submissions reach production services in browser tests.
async function mockCaptchaScript(route) {
  await route.fulfill({
    contentType: 'application/javascript',
    body: `(() => {
      function render() {
        document.querySelectorAll('.h-captcha[data-captcha="true"]').forEach(widget => {
          const token = document.createElement('textarea');
          token.name = 'h-captcha-response';
          token.hidden = true;
          const label = document.createElement('label');
          label.style.cssText = 'box-sizing:border-box;width:164px;height:144px;padding:16px;background:#fafafa;color:#333;border:1px solid #ddd;display:flex;align-items:center;gap:8px;font:14px sans-serif';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.setAttribute('aria-label', 'Тестовая hCaptcha');
          checkbox.addEventListener('change', () => { token.value = checkbox.checked ? 'test-captcha-token' : ''; });
          label.append(checkbox, 'hCaptcha (mock)');
          widget.append(label, token);
        });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
      else render();
    })();`
  });
}

const test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route('https://web3forms.com/client/script.js', mockCaptchaScript);
    await page.route('https://api.web3forms.com/**', route => route.abort());
    await use(page);
  }
});

module.exports = { test, expect: base.expect, mockCaptchaScript, LOCAL_ORIGIN: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173' };
