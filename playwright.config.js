const { defineConfig } = require("@playwright/test");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: ["reanimation.spec.js", "lead-form.spec.js", "construction.spec.js", "limited-stage.spec.js", "safe-seo.spec.js", "service-pages.spec.js", "public-header.spec.js", "visibility.spec.js"],
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/static-server.mjs",
    env: { PORT: new URL(baseURL).port || "4173" },
    url: baseURL + "/index.html",
    reuseExistingServer: false,
    timeout: 10000
  }
});

