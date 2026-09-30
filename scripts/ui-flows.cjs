const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("@playwright/test");
(async () => {
  const env = {
    ...process.env,
    REST_DESKTOP_TEST_DATA: path.resolve(
      ".smoke-data",
      "exports-" + Date.now(),
    ),
    REST_DESKTOP_HEADLESS: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath:
      process.env.REST_SMOKE_EXE ||
      process.env.REST_SMOKE_RUNTIME ||
      require("electron"),
    args: process.env.REST_SMOKE_EXE ? [] : ["."],
    env,
  });
  try {
    const page = await app.firstWindow();
    if (process.env.REST_TEST_OFFLINE === '1') {
      await app.evaluate(async ({ session }) => { await session.defaultSession.setProxy({mode: "fixed_servers", proxyRules: "http=127.0.0.1:9;https=127.0.0.1:9", proxyBypassRules: "<-loopback>"}); await session.defaultSession.closeAllConnections(); await session.defaultSession.clearCache(); });
      await page.addInitScript(() => {
        window.__testOnline = false;
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => window.__testOnline });
      });
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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => {
      console.log("Diálogo da interface confirmado pelo teste.");
      d.accept();
    });
    await page.waitForSelector('input[type="email"]');
    await page
      .getByRole("button", {
        name: /Crie uma conta local|Create a local account/,
      })
      .click();
    await page.locator("#auth-register-name").fill("Utilizador Interface");
    await page.locator('input[type="email"]').fill("interface@test.local");
    await page.locator('input[type="password"]').fill("password123");
    await page.locator('button[type="submit"]').click();
    await page
      .getByText(/Cadastro realizado|Registration successful/)
      .waitFor();
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !!document.querySelector("nav"));
    if (process.env.REST_TEST_OFFLINE === '1') {
      const assertNoOverlay = async () => {
        await page.waitForTimeout(250);
        if (await page.getByText(/Sem liga.{1,4}o . internet|No internet connection|A aguardar liga/).count())
          throw Error('OFFLINE REGRESSION: internet overlay blocks the local application');
        if (await page.evaluate(() => navigator.onLine) !== false)
          throw Error('Offline browser state was not simulated');
      };
      await assertNoOverlay();
      await page.evaluate(() => { window.__testOnline = true; window.dispatchEvent(new Event('online')); });
      await page.waitForTimeout(250);
      await page.evaluate(() => { window.__testOnline = false; window.dispatchEvent(new Event('offline')); });
      await assertNoOverlay();
      console.log('PASS: startup offline and Wi-Fi loss do not block the interface');
    }
    await page.evaluate(async () => {
      const s = await window.restDesktop.auth("getSession");
      await window.restDesktop.query({
        table: "company_settings",
        action: "upsert",
        payload: {
          company_name: "Empresa UI",
          nuit: "987654321",
          city: "Maputo",
          setup_complete: true,
        },
      });
      localStorage.setItem("invstock_tab", "stock");
    });
    await page.reload();
    await page.getByPlaceholder("Ex: Arroz Premium 5kg").fill("Artigo UI");
    await page.getByPlaceholder("ARR-5KG").fill("UI-001");
    await page.getByPlaceholder("100.00", { exact: true }).fill("25");
    await page.getByPlaceholder("150.00", { exact: true }).fill("35");
    await page.getByPlaceholder("50", { exact: true }).fill("12");
    await page.getByPlaceholder("200", { exact: true }).fill("50");
    await page.locator("form button[type=submit]").click();
    await page.waitForFunction(async () => {
      const r = await window.restDesktop.query({ table: "stock_items" });
      return r.data.some((p) => p.name === "Artigo UI");
    });
    await page
      .getByRole("button", { name: "Facturas", exact: true })
      .first()
      .click();
    await page
      .locator("header")
      .getByRole("button", { name: "Nova Factura", exact: true })
      .click();
    const invoiceForm = page
      .locator(".modal-content form")
      .filter({ has: page.getByPlaceholder("TechSolutions S.A.") });
    await invoiceForm
      .getByPlaceholder("TechSolutions S.A.")
      .fill("Cliente da Interface");
    await invoiceForm.locator("button[type=submit]").click();
    await page.getByText("Inclua entre 1 e 500 itens.", { exact: true }).waitFor();
    await invoiceForm.getByPlaceholder("Descrição do item").fill("Artigo UI");
    await invoiceForm.locator("table input[type=number]").nth(0).fill("2");
    await invoiceForm.locator("table input[type=number]").nth(1).fill("35");
    await invoiceForm.locator("select").first().selectOption("Paid");
    await invoiceForm.locator("table input[type=number]").nth(0).fill("99");
    await invoiceForm.locator("button[type=submit]").click();
    await page.getByText("Stock insuficiente: Artigo UI", { exact: true }).waitFor();
    const beforeRetry = await page.evaluate(async () => (await window.restDesktop.query({table:"invoices"})).data.length);
    if (beforeRetry !== 0) throw Error("Failed invoice was partially saved");
    await invoiceForm.locator("table input[type=number]").nth(0).fill("2");
    await invoiceForm.locator("button[type=submit]").click();
    await page.waitForFunction(async () => {
      const r = await window.restDesktop.query({ table: "invoices" });
      return r.data.some(
        (i) => i.client === "Cliente da Interface" && i.status === "Paid",
      );
    });
    const remaining = await page.evaluate(async () => {
      const r = await window.restDesktop.query({ table: "stock_items" });
      return r.data.find((i) => i.name === "Artigo UI").stock_level;
    });
    if (remaining !== 10)
      throw Error("Factura criada pela interface não actualizou o stock.");
    await page
      .getByRole("button", { name: "Inventário", exact: true })
      .first()
      .click();
    await page.getByRole("button", {name:"Facturas", exact:true}).first().click();
    const quickForm = page.locator("form:visible").filter({has:page.getByPlaceholder("Item", {exact:true})});
    for (const status of ["Pending", "Overdue"]) {
      await quickForm.getByPlaceholder("TechSolutions S.A.").fill("Cliente da Interface");
      await quickForm.getByPlaceholder("Item", {exact:true}).fill("Servico local");
      await quickForm.locator("table input[type=number]").nth(0).fill("1");
      await quickForm.locator("table input[type=number]").nth(1).fill("50");
      await quickForm.locator("select").first().selectOption(status);
      await quickForm.locator("button[type=submit]").click();
      await page.waitForFunction(async (state) => (await window.restDesktop.query({table:"invoices"})).data.some(i=>i.status===state), status);
    }
    console.log("PASS: full and quick invoice forms, existing client, Pending/Paid/Overdue, actionable validation and retry");
    await page.getByRole("button", {name:"Inventário", exact:true}).first().click();
    await app.evaluate(({ dialog }, dir) => {
      dialog.showSaveDialog = async (_window, options) => ({
        canceled: false,
        filePath: dir + "/" + options.defaultPath,
      });
    }, path.resolve("test-results"));
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    await page
      .getByRole("button", { name: "Exportar para PDF", exact: true })
      .click();
    await page.evaluate(() => localStorage.setItem("invstock_tab", "reports"));
    await page.reload();
    await page.getByRole("button", { name: "Excel", exact: true }).click();
    await page.evaluate(() => localStorage.setItem("invstock_tab", "settings"));
    await page.reload();
    await page.getByRole("button", { name: "Gerar", exact: true }).click();
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      localStorage.setItem("invstock_dark", "true");
      localStorage.setItem("invstock_lang", "en");
    });
    await page.reload();
    await page.waitForSelector("nav");
    await page.screenshot({
      path: "test-results/settings-dark-en.png",
      fullPage: true,
    });
    for (const zoom of [1, 1.25, 1.5]) {
      await app.evaluate(
        ({ BrowserWindow }, z) =>
          BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(z),
        zoom,
      );
      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      console.log("Zoom", zoom, dimensions);
      const capture = await app.evaluate(async ({ BrowserWindow }) =>
        (await BrowserWindow.getAllWindows()[0].webContents.capturePage())
          .toPNG()
          .toString("base64"),
      );
      fs.writeFileSync(
        "test-results/scale-" + zoom + ".png",
        Buffer.from(capture, "base64"),
      );
    }
    const exports = fs
      .readdirSync("test-results")
      .filter((f) => /\.(pdf|xlsx)$/.test(f));
    if (exports.length < 3) throw Error("Faltam exportações: " + exports);
    for (const name of exports) {
      const bytes = fs.readFileSync(path.join("test-results", name));
      if (name.endsWith(".pdf") && bytes.subarray(0, 4).toString() !== "%PDF")
        throw Error("PDF inválido");
      if (name.endsWith(".xlsx") && bytes.subarray(0, 2).toString() !== "PK")
        throw Error("Excel inválido");
    }
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      JSON.stringify(
        {
          passed: true,
          signup: true,
          login: true,
          stockForm: true,
          paidInvoiceForm: true,
          exports,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
