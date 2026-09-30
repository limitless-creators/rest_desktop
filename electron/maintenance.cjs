const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { tables } = require("./schema.cjs");
const digest = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
module.exports = (Service) => {
  Service.prototype.isAdmin = function () {
    return (
      !!this.user &&
      this.db.prepare("SELECT id FROM users ORDER BY rowid LIMIT 1").get()
        ?.id === this.user.id
    );
  };
  Service.prototype.admin = function () {
    this.owner();
    if (!this.isAdmin())
      throw Error(
        "Só a primeira conta (administrador local) pode gerir cópias de toda a instalação.",
      );
  };
  Service.prototype.info = function () {
    this.owner();
    return {
      path: this.root,
      version: require("../package.json").version,
      schema: 1,
      isAdmin: this.isAdmin(),
    };
  };
  const previousBackup = Service.prototype.backup;
  Service.prototype.backup = function (destination) {
    this.admin();
    return previousBackup.call(this, destination);
  };
  Service.prototype.scheduledBackup = function () {
    const folder = path.join(this.root, "backups");
    fs.mkdirSync(folder, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const dest = path.join(folder, "auto-" + day + ".restbackup");
    if (
      fs.existsSync(dest) ||
      !this.db.prepare("SELECT id FROM users LIMIT 1").get()
    )
      return { created: false };
    this.db.prepare("VACUUM INTO ?").run(dest);
    fs.writeFileSync(dest + ".sha256", digest(fs.readFileSync(dest)));
    // Keep recent automatic backups only. Never delete manually named copies.
    const names = fs
      .readdirSync(folder)
      .filter((x) => /^auto-\d{4}-\d{2}-\d{2}\.restbackup$/.test(x))
      .sort()
      .reverse();
    for (const name of names.slice(14)) {
      const target = path.resolve(folder, name);
      if (path.dirname(target) !== path.resolve(folder))
        throw Error("Caminho inválido.");
      fs.unlinkSync(target);
      if (fs.existsSync(target + ".sha256")) fs.unlinkSync(target + ".sha256");
    }
    return { created: true, path: dest };
  };
  Service.prototype.restore = function (source, allowEmpty = false, accountPassword) {
    if (!(allowEmpty && !this.db.prepare("SELECT id FROM users LIMIT 1").get())) {
      if(accountPassword !== undefined)this.verifyRootPassword(accountPassword);else this.admin();
    }
    if (path.resolve(source) === path.resolve(this.filename))
      throw Error("Seleccione uma cópia de segurança.");
    if (fs.statSync(source).size > 2 * 1024 * 1024 * 1024)
      throw Error("Cópia demasiado grande.");
    if (fs.existsSync(source + ".sha256")) {
      const expected = fs
        .readFileSync(source + ".sha256", "utf8")
        .trim()
        .split(/\s/)[0];
      if (expected !== digest(fs.readFileSync(source)))
        throw Error("A cópia falhou a verificação de integridade.");
    }
    const stage = path.join(
      this.root,
      "restore-" + crypto.randomUUID() + ".sqlite",
    );
    let candidate;
    try {
      candidate = new DatabaseSync(source, { readOnly: true });
      if (candidate.prepare("PRAGMA user_version").get().user_version !== 1)
        throw Error("Versão da cópia incompatível.");
      if (
        candidate.prepare("PRAGMA integrity_check").get().integrity_check !==
          "ok" ||
        candidate.prepare("PRAGMA foreign_key_check").all().length
      )
        throw Error("Cópia corrompida.");
      const schema = (db) =>
        db
          .prepare(
            "SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != 'file_sync_state' ORDER BY type,name",
          )
          .all();
      if (JSON.stringify(schema(candidate)) !== JSON.stringify(schema(this.db)))
        throw Error("Estrutura da cópia incompatível.");
      candidate.prepare("VACUUM INTO ?").run(stage);
    } finally {
      candidate?.close();
    }
    const backupFolder = path.join(this.root, "backups");
    fs.mkdirSync(backupFolder, { recursive: true });
    const safety = path.join(
      backupFolder,
      "before-restore-" + Date.now() + ".restbackup",
    );
    this.db.prepare("VACUUM INTO ?").run(safety);
    fs.writeFileSync(safety+".sha256",digest(fs.readFileSync(safety)));
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    this.db.close();
    const previous = path.join(
      this.root,
      "previous-" + crypto.randomUUID() + ".sqlite",
    );
    try {
      fs.renameSync(this.filename, previous);
      fs.renameSync(stage, this.filename);
    } catch (e) {
      if (!fs.existsSync(this.filename) && fs.existsSync(previous))
        fs.renameSync(previous, this.filename);
      this.db = new DatabaseSync(this.filename);
      this.db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
      throw e;
    }
    this.db = new DatabaseSync(this.filename);
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    this.user = null;
    return { restored: true, safetyBackup: safety };
  };
  Service.prototype.readImport = function (source) {
    this.owner();
    if (fs.statSync(source).size > 200 * 1024 * 1024)
      throw Error("Exportação demasiado grande.");
    const bytes = fs.readFileSync(source),
      data = JSON.parse(bytes);
    if (
      data.format !== "rest-local-import-v1" ||
      !data.tables ||
      typeof data.tables !== "object"
    )
      throw Error("Formato esperado: rest-local-import-v1.");
    let count = 0;
    const ids = new Set();
    for (const [t, rows] of Object.entries(data.tables)) {
      this.table(t);
      if (!Array.isArray(rows)) throw Error("Lista inválida: " + t);
      count += rows.length;
      if (count > 100000) throw Error("A exportação excede 100.000 registos.");
      for (const row of rows) {
        if (typeof row.id !== "string" || !row.id || ids.has(row.id))
          throw Error("Identificadores inválidos ou repetidos.");
        ids.add(row.id);
        this.prepare(t, row, true);
      }
    }
    if (data.attachments && !Array.isArray(data.attachments))
      throw Error("Anexos inválidos.");
    return {
      data,
      digest: digest(bytes),
      counts: Object.fromEntries(
        Object.entries(data.tables).map(([t, r]) => [t, r.length]),
      ),
    };
  };
  Service.prototype.importPreview = function (source) {
    const parsed = this.readImport(source);
    for (const t of Object.keys(tables))
      if (
        this.db
          .prepare(`SELECT id FROM ${t} WHERE user_id=? LIMIT 1`)
          .get(this.owner())
      )
        throw Error("A importação exige uma conta local sem dados comerciais.");
    return {
      digest: parsed.digest,
      counts: parsed.counts,
      attachments: parsed.data.attachments?.length || 0,
    };
  };
  Service.prototype.importData = function (source, expected) {
    const preview = this.importPreview(source);
    if (preview.digest !== expected)
      throw Error("A exportação foi alterada. Repita a pré-visualização.");
    const { data } = this.readImport(source);
    return this.tx(() => {
      const order = [
        "company_settings",
        "stock_items",
        "invoices",
        "quotes",
        "invoice_items",
        "quote_items",
        "receipts",
        "expenses",
        "general_sales",
        "contacts",
        "debt_clients",
      ];
      for (const t of order)
        for (const raw of data.tables[t] || []) {
          const row = this.prepare(t, raw, true);
          row.user_id = this.owner();
          row.created_at = raw.created_at || new Date().toISOString();
          row.updated_at = raw.updated_at || row.created_at;
          const keys = Object.keys(row);
          this.db
            .prepare(
              `INSERT INTO ${t}(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")})`,
            )
            .run(...keys.map((k) => row[k]));
        }
      for (const t of [
        "invoices",
        "quotes",
        "receipts",
        "expenses",
        "general_sales",
      ]) {
        const max = this.db
          .prepare(`SELECT max(seq_number) n FROM ${t} WHERE user_id=?`)
          .get(this.owner()).n;
        if (max)
          this.db
            .prepare(
              "INSERT INTO counters VALUES(?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET value=max(value,excluded.value)",
            )
            .run(this.owner(), t, max);
      }
      for (const a of data.attachments || []) {
        if (
          typeof a.id !== "string" ||
          !/^[-a-zA-Z0-9]+$/.test(a.id) ||
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(a.mime)
        )
          throw Error("Anexo inválido.");
        const bytes = Buffer.from(a.base64, "base64");
        if (!bytes.length || bytes.length > 10 * 1024 * 1024)
          throw Error("Tamanho de anexo inválido.");
        this.db
          .prepare("INSERT INTO attachments VALUES(?,?,?,?,?)")
          .run(a.id, this.owner(), a.mime, bytes, new Date().toISOString());
      }
      for (const r of this.db
        .prepare(
          "SELECT receipt_image_url FROM expenses WHERE user_id=? AND receipt_image_url IS NOT NULL",
        )
        .all(this.owner())) {
        if (
          !r.receipt_image_url.startsWith("local:") ||
          !this.db
            .prepare("SELECT id FROM attachments WHERE id=? AND user_id=?")
            .get(r.receipt_image_url.slice(6), this.owner())
        )
          throw Error("Comprovativo em falta na exportação.");
      }
      if (this.db.prepare("PRAGMA foreign_key_check").all().length)
        throw Error("Relações inválidas.");
      return { imported: true, counts: preview.counts };
    });
  };
};
