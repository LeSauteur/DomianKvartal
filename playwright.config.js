const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: ["lead-form.spec.js", "construction.spec.js", "limited-stage.spec.js", "safe-seo.spec.js"],
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/static-server.mjs",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: true,
    timeout: 10000
  }
});
