const { parentPort, workerData } = require("node:worker_threads");
const { Service } = require("./service.cjs");
const service = new Service(workerData.root);
let queue = Promise.resolve();
parentPort.on("message", (message) => {
  queue = queue.then(() => {
    const { id, method, args = [] } = message;
    try {
      const allowed = [
        "auth",
        "query",
        "rpc",
        "attachment",
        "info",
        "backup",
        "restore",
        "importPreview",
        "importData",
        "scheduledBackup",
        "syncFileExport", "syncFilePreview", "syncFileImport",
        "verifyRootPassword", "rootExport", "rootPreview", "rootRestore", "rootAccess",
      ];
      if (!allowed.includes(method)) throw Error("Operação inválida.");
      parentPort.postMessage({ id, result: service[method](...args) });
    } catch (e) {
      parentPort.postMessage({ id, error: e.message });
    }
  });
});
