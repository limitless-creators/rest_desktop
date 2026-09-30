const { _electron: electron } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs");
(async () => {
  const bytes = fs.readFileSync("test-results/packaged-smoke.log");
  const log = bytes.toString(bytes[0] === 255 ? "utf16le" : "utf8");
  const report = JSON.parse(log.slice(log.lastIndexOf("\n{")));
  const env = {
    ...process.env,
    REST_DESKTOP_TEST_DATA: report.root,
    REST_DESKTOP_HEADLESS: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: process.env.REST_SMOKE_EXE || path.resolve("release/win-unpacked/REST Desktop.exe"),
    args: [],
    env,
  });
  try {
    const page = await app.firstWindow();
    if (process.env.REST_TEST_OFFLINE === '1') {
      await app.evaluate(async ({ session }) => { await session.defaultSession.setProxy({mode: "fixed_servers", proxyRules: "http=127.0.0.1:9;https=127.0.0.1:9", proxyBypassRules: "<-loopback>"}); await session.defaultSession.closeAllConnections(); await session.defaultSession.clearCache(); });
      await page.context().setOffline(true);
      await page.reload();
      const offlineProbe = await app.evaluate(async ({ session }) => {
        const s = session.defaultSession;
        s.webRequest.onBeforeRequest(null);
        try { await s.fetch('https://example.com', {cache:'no-store'}); return 'unexpected-success'; }
        catch (error) { return error.message; }
        finally { s.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']}, (_details, callback) => callback({cancel:true})); }
      });
      if (!offlineProbe.includes('ERR_PROXY_CONNECTION_FAILED')) throw Error('Falha ao confirmar a simulação offline: '+offlineProbe);
      console.log('OFFLINE confirmado: '+offlineProbe);
    }
    await page.waitForSelector("input[type=email]");
    await page.locator("input[type=email]").fill("smoke@test.local");
    await page.locator("input[type=password]").fill("password123");
    await page.locator("button[type=submit]").click();
    await page.waitForSelector("nav");
    const persisted = await page.evaluate(async () => ({
      invoices: await window.restDesktop.query({ table: "invoices" }),
      stock: await window.restDesktop.query({ table: "stock_items" }),
    }));
    if (
      persisted.invoices.data.length !== 1 ||
      persisted.stock.data[0].stock_level !== 18
    )
      throw Error("Persistência incorrecta após reinício.");
    console.log(
      JSON.stringify({ passed: true, restart: true, invoices: 1, stock: 18 }),
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
