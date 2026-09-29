import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Its own port and server, so a developer's running `npm run dev` never serves the test.
    command: `npm run dev -- --port ${PORT}`,
    url: `${baseURL}/check`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Nothing listens here, so any API call a test forgets to stub fails fast instead of
      // reaching a real backend and spending Gemini credits.
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:9",
    },
  },
});
