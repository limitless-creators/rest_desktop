const { _electron: electron } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const root = path.resolve(".smoke-data", String(Date.now()));
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync("test-results", { recursive: true });
  const errors = [];
  const network = [];
  const executable =
    process.env.REST_SMOKE_EXE ||
    process.env.REST_SMOKE_RUNTIME ||
    require("electron");
  const launchEnv = { ...process.env };
  delete launchEnv.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: executable,
    args: process.env.REST_SMOKE_EXE ? [] : ["."],
    env: {
      ...launchEnv,
      REST_DESKTOP_TEST_DATA: root,
      REST_DESKTOP_HEADLESS: "1",
    },
    timeout: 45000,
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
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    page.on("dialog", (d) => d.accept());
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.screenshot({ path: "test-results/login.png", fullPage: true });
    const result = await page.evaluate(async () => {
      const a = window.restDesktop;
      const signup = await a.auth("signUp", {
        email: "smoke@test.local",
        password: "password123",
        options: { data: { name: "Teste Local" } },
      });
      await a.auth("signInWithPassword", {
        email: "smoke@test.local",
        password: "password123",
      });
      await a.query({
        table: "company_settings",
        action: "upsert",
        payload: {
          company_name: "Empresa de Teste",
          nuit: "123456789",
          address: "Maputo",
          city: "Maputo",
          setup_complete: true,
          bank_accounts: [],
          mobile_contacts: [],
        },
      });
      const stock = await a.query({
        table: "stock_items",
        action: "insert",
        payload: {
          name: "Produto teste",
          sku: "TEST",
          stock_level: 20,
          max_stock: 50,
          price: 10,
          sale_price: 15,
        },
        single: "required",
      });
      const invoice = await a.rpc("rest_save_document", {
        p_request_id: "ui-invoice",
        p_kind: "invoice",
        p_document: { client: "Cliente teste" },
        p_items: [{ description: "Produto teste", quantity: 2, unitPrice: 15 }],
      });
      await a.rpc("rest_create_receipt", {
        p_request_id: "ui-receipt",
        p_receipt: {
          invoice_id: invoice.data.id,
          amount: 30,
          method: "Cash",
          method_pt: "Dinheiro",
        },
      });
      return {
        signup: !!signup.user,
        stock: stock.data.id,
        invoice: invoice.data.id,
        info: await a.info(),
      };
    });
    await page.reload();
    await page.waitForSelector("nav", { timeout: 30000 });
    console.log((await page.locator("body").innerText()).slice(0, 400));
    await page.screenshot({
      path: "test-results/dashboard.png",
      fullPage: true,
    });
    for (const [id, name] of [
      ["invoices", "Facturas"],
      ["quotes", "Cotações"],
      ["receipts", "Recibos"],
      ["vendas", "Vendas"],
      ["clientes", "Clientes"],
      ["reports", "Relatórios"],
      ["stock", "Inventário"],
      ["expenses", "Despesas"],
      ["contacts", "Contactos"],
      ["settings", "Definições"],
    ]) {
      await page.evaluate(
        (tab) => localStorage.setItem("invstock_tab", tab),
        id,
      );
      await page.context().setOffline(true);
      await page.reload();
      await page.waitForFunction(
        () => !document.body.innerText.includes("A carregar"),
        { timeout: 15000 },
      );
      await page
        .locator("body")
        .screenshot({ path: "test-results/" + id + ".png" });
      if (!(await page.locator("body").innerText()).trim())
        throw Error("Tela vazia: " + name);
    }
    const data = await page.evaluate(() =>
      window.restDesktop.query({ table: "stock_items" }),
    );
    if (data.data[0].stock_level !== 18) throw Error("Stock incorrecto");
    if (errors.length) throw Error(errors.join("\n"));
    if (network.length) throw Error("Pedidos externos: " + network.join(","));
    console.log(
      JSON.stringify(
        {
          passed: true,
          electron: await app.evaluate(() => process.versions.electron),
          result,
          errors,
          network,
          root,
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
