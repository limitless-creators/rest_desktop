const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  session,
  net,
} = require("electron");
const { isUfsaUrl, checkUfsa, browserUserAgent } = require("./ufsa.cjs");
const { Worker } = require("node:worker_threads");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
app.setName("REST Desktop");
if (process.env.REST_DESKTOP_HEADLESS) app.disableHardwareAcceleration();
if (process.env.REST_DESKTOP_TEST_DATA)
  app.setPath("userData", process.env.REST_DESKTOP_TEST_DATA);
if (!app.requestSingleInstanceLock()) app.quit();
let window, worker, workerFailure;
let serial = 0;
const pending = new Map();
const entry = pathToFileURL(path.join(__dirname, "../dist/index.html")).href;
function call(method, ...args) {
  return new Promise((resolve, reject) => {
    if (workerFailure) return reject(workerFailure);
    const id = ++serial;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, method, args });
  });
}
function trusted(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    event.senderFrame.url.split("#")[0] !== entry
  )
    throw Error("Origem não autorizada.");
}
function external(url) {
  try {
    const u = new URL(url);
    if (
      (u.protocol === "https:" &&
        ["wa.me", "www.ufsa.gov.mz"].includes(u.hostname)) ||
      u.protocol === "mailto:"
    )
      shell.openExternal(u.href);
  } catch {}
}
async function exportBackup() {
  await call("info");
  const choice = await dialog.showSaveDialog(window, {
    title: "Cópia de segurança REST",
    defaultPath:
      "REST-Backup-" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      ".restbackup",
    filters: [{ name: "REST Backup", extensions: ["restbackup"] }],
  });
  if (choice.canceled) return { canceled: true };
  // The native dialog confirms replacement; write to a new file first.
  const temporary = choice.filePath + "." + Date.now() + ".tmp";
  await call("backup", temporary);
  fs.renameSync(temporary, choice.filePath);
  fs.renameSync(temporary + ".sha256", choice.filePath + ".sha256");
  return { path: choice.filePath };
}
async function restoreBackup(source,accountPassword) {
  if(!(await call("rootAccess")).empty)await call("verifyRootPassword",accountPassword);
  const answer = await dialog.showMessageBox(window, {
    type: "warning",
    buttons: ["Cancelar", "Restaurar"],
    defaultId: 0,
    cancelId: 0,
    message: "Substituir todos os dados locais por esta cópia?",
    detail:
      "Será guardada uma cópia do estado actual antes do restauro. Todas as contas desta instalação serão substituídas.",
  });
  if (answer.response !== 1) return { canceled: true };
  await require("./mobile-menu.cjs").stop(true);
  const result = await call("restore", source, true,accountPassword);
  window.webContents.reload();
  return result;
}
app.whenReady().then(() => {
  const root = path.join(app.getPath("userData"), "data");
  worker = new Worker(path.join(__dirname, "worker.cjs"), {
    workerData: { root },
  });
  worker.on("message", ({ id, result, error }) => {
    const p = pending.get(id);
    if (p) {
      pending.delete(id);
      error ? p.reject(Error(error)) : p.resolve(result);
    }
  });
  worker.on("error", (e) => {
    workerFailure = e;
    console.error(e);
    for (const p of pending.values()) p.reject(e);
    pending.clear();
    dialog.showErrorBox("REST Desktop", e.message);
  });
  window = new BrowserWindow({
    width: 1440,
    height: 950,
    minWidth: 1000,
    minHeight: 700,
    title: "REST Desktop — Limitless, Lda",
    icon: path.join(__dirname, "icon.ico"),
    show: !process.env.REST_DESKTOP_HEADLESS,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false,
      offscreen: !!process.env.REST_DESKTOP_HEADLESS,
    },
  });
  session.defaultSession.setPermissionRequestHandler(
    (_wc, _permission, callback) => callback(false),
  );
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*"] },
    (details, callback) => callback({ cancel: !isUfsaUrl(details.url) }),
  );
  // Use the Chromium browser identity for this legacy portal's compatibility filter.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["https://www.ufsa.gov.mz/*", "https://ufsa.gov.mz/*"] },
    (details, callback) => {
      const headers = { ...details.requestHeaders };
      for (const name of Object.keys(headers)) if (name.toLowerCase() === "user-agent") delete headers[name];
      headers["User-Agent"] = browserUserAgent(process.versions.chrome);
      callback({ requestHeaders: headers });
    },
  );
  window.webContents.setWindowOpenHandler(({ url }) => {
    external(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== entry) {
      event.preventDefault();
      external(url);
    }
  });
  ipcMain.handle("rest:ufsa-status", async (event) => {
    trusted(event);
    return checkUfsa(net.fetch);
  });
  window.webContents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (!isMainFrame && code !== -3 && isUfsaUrl(url)) window.webContents.send("rest:ufsa-failure");
  });
  ipcMain.handle("rest:call", async (event, { method, args }) => {
    trusted(event);
    if (!["auth", "query", "rpc", "attachment", "info"].includes(method))
      throw Error("Operação inválida.");
    if (!Array.isArray(args) || args.length > 2)
      throw Error("Argumentos inválidos.");
    return call(method, ...args);
  });
  ipcMain.handle("rest:backup", async (event) => {
    trusted(event);
    return exportBackup();
  });
  ipcMain.handle("rest:restore", async (event) => {
    trusted(event);
    return archives.rootRestore();
  });
  ipcMain.handle("rest:import", async (event) => {
    trusted(event);
    await call("info");
    const selection = await dialog.showOpenDialog(window, {
      title: "Importar exportação REST (JSON)",
      properties: ["openFile"],
      filters: [{ name: "REST JSON", extensions: ["json"] }],
    });
    if (selection.canceled) return { canceled: true };
    const preview = await call("importPreview", selection.filePaths[0]);
    const answer = await dialog.showMessageBox(window, {
      type: "question",
      buttons: ["Cancelar", "Importar"],
      defaultId: 0,
      cancelId: 0,
      message: "Importar dados para esta conta vazia?",
      detail: JSON.stringify(preview, null, 2),
    });
    if (answer.response !== 1) return { canceled: true };
    const result = await call(
      "importData",
      selection.filePaths[0],
      preview.digest,
    );
    window.webContents.reload();
    return result;
  });
  ipcMain.handle("rest:save", async (event, { name, bytes }) => {
    trusted(event);
    await call("info");
    const safe = path.basename(String(name)).replace(/[<>:"/\\|?*]/g, "_");
    const ext = path.extname(safe).slice(1).toLowerCase();
    if (!["pdf", "xlsx", "csv"].includes(ext))
      throw Error("Formato não permitido.");
    const data = Buffer.from(bytes);
    if (data.length > 150 * 1024 * 1024)
      throw Error("Ficheiro demasiado grande.");
    const result = await dialog.showSaveDialog(window, {
      defaultPath: safe,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (result.canceled) return { canceled: true };
    fs.writeFileSync(result.filePath, data);
    return { path: result.filePath };
  });
  ipcMain.handle("rest:print", async (event) => {
    trusted(event);
    await call("info");
    return new Promise((resolve, reject) =>
      window.webContents.print({ printBackground: true }, (success, error) =>
        success ? resolve({ success }) : reject(Error(error)),
      ),
    );
  });
  const invokeMenu = (fn) => () =>
    fn().catch((e) => dialog.showErrorBox("REST Desktop", e.message));
  const archives = require('./archives-menu.cjs')({window,call,root,trusted,restoreLegacy:restoreBackup});
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      archives.menu,
      require('./mobile-menu.cjs')({window,call,root:path.join(app.getPath('userData'),'data'),archives}),
      {
        label: "Ficheiro",
        submenu: [
          {
            label: "Criar cópia de segurança",
            click: invokeMenu(archives.rootExport),
          },
          {
            label: "Restaurar cópia de segurança",
            click: invokeMenu(archives.rootRestore),
          },
          { type: "separator" },
          { label: "Criar cópia antiga (.restbackup)", click: invokeMenu(exportBackup) },
          { label: "Sair", role: "quit" },
        ],
      },
      {
        label: "Editar",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "Ver",
        submenu: [
          { role: "reload" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" },
        ],
      },
      {
        label: "Ajuda",
        submenu: [
          {
            label: "Sobre o REST Desktop",
            click: () =>
              dialog.showMessageBox(window, {
                message: "REST Desktop " + app.getVersion(),
                detail: "Limitless, Lda\nGestão comercial local para Windows.",
              }),
          },
        ],
      },
    ]),
  );
  ipcMain.handle('rest:devices-open',event=>{trusted(event);return require('./mobile-menu.cjs').openManager();});
  window.loadURL(entry);
  call("scheduledBackup").catch((e) =>
    console.error("Backup automático:", e.message),
  );
  const timer = setInterval(
    () =>
      call("scheduledBackup").catch((e) =>
        console.error("Backup automático:", e.message),
      ),
    60 * 60 * 1000,
  );
  timer.unref();
});
app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
});
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => worker?.terminate());
