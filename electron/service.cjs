const { DatabaseSync } = require("node:sqlite");
const {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Decimal = require("decimal.js");
const { tables, migrate } = require("./schema.cjs");
const numbered = new Set([
  "invoices",
  "quotes",
  "receipts",
  "expenses",
  "general_sales",
]);
const numeric = new Set([
  "amount",
  "total_amount",
  "quantity",
  "unit_price",
  "stock_level",
  "max_stock",
  "price",
  "sale_price",
]);
const jsonFields = new Set([
  "bank_accounts",
  "mobile_contacts",
  "secondary_company",
]);
const boolFields = new Set(["setup_complete", "stock_deducted"]);
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
function hash(value) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(value, salt, 64).toString("hex");
}
function verify(value, stored) {
  try {
    const [salt, digest] = stored.split(":");
    return timingSafeEqual(
      Buffer.from(digest, "hex"),
      scryptSync(value, salt, 64),
    );
  } catch {
    return false;
  }
}
function decimal(value, scale = 4, positive = false) {
  if (typeof value !== "string" && typeof value !== "number")
    throw Error("Valor numérico inválido.");
  const n = new Decimal(value);
  if (
    !n.isFinite() ||
    n.isNegative() ||
    (positive && n.isZero()) ||
    n.gt("999999999999")
  )
    throw Error("Valor numérico fora dos limites.");
  const rounded = n.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
  if (positive && rounded.isZero())
    throw Error("Quantidade abaixo da precisão permitida.");
  return rounded.toFixed(scale);
}
function required(value, label) {
  if (typeof value !== "string" || !value.trim() || value.length > 10000)
    throw Error(label + " obrigatório.");
  return value.trim();
}
function decode(row) {
  if (!row) return null;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (numeric.has(k) && out[k] != null) out[k] = Number(out[k]);
    if (jsonFields.has(k) && out[k] != null) out[k] = JSON.parse(out[k]);
    if (boolFields.has(k)) out[k] = !!out[k];
  }
  return out;
}
class Service {
  constructor(root) {
    this.root = root;
    fs.mkdirSync(root, { recursive: true });
    this.filename = path.join(root, "rest.sqlite");
    this.db = new DatabaseSync(this.filename);
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    migrate(this.db);
    this.user = null;
    this.failures = new Map();
    this.columns = Object.fromEntries(
      Object.keys(tables).map((t) => [
        t,
        new Set(
          this.db
            .prepare(`PRAGMA table_info(${t})`)
            .all()
            .map((x) => x.name),
        ),
      ]),
    );
  }
  close() {
    this.db.close();
  }
  tx(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  owner() {
    if (!this.user) throw Error("Inicie sessão.");
    return this.user.id;
  }
  verifyRootPassword(password) {
    const id=this.owner(),row=this.db.prepare("SELECT password_hash FROM users WHERE id=?").get(id);
    const key='root:'+id,attempts=this.failures.get(key);
    if(attempts?.until>Date.now())throw Error("Aguarde um minuto antes de tentar novamente.");
    if(typeof password!=='string'||password.length>256||!row||!verify(password,row.password_hash)){
      const count=(attempts?.count||0)+1;this.failures.set(key,{count,until:count>=5?Date.now()+60000:0});
      throw Error("Senha da conta incorrecta.");
    }
    this.failures.delete(key);return true;
  }
  publicUser(row) {
    return { id: row.id, email: row.email, user_metadata: { name: row.name } };
  }
  auth(action, p = {}) {
    if (action === "getSession")
      return { session: this.user ? { user: this.user } : null };
    if (action === "getUser") return { user: this.user };
    if (action === "signOut") {
      this.user = null;
      return {};
    }
    const email = required(p.email || this.user?.email, "E-mail").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw Error("E-mail inválido.");
    if (action === "signUp") {
      if (
        typeof p.password !== "string" ||
        p.password.length < 8 ||
        p.password.length > 256
      )
        throw Error("A senha deve ter 8 a 256 caracteres.");
      const name = required(p.options?.data?.name, "Nome");
      const recovery = randomBytes(18).toString("hex");
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO users VALUES(?,?,?,?,?,?)")
        .run(id, email, name, hash(p.password), hash(recovery), now());
      return {
        user: { id, email, user_metadata: { name } },
        recoveryCode: recovery,
      };
    }
    const attempts = this.failures.get(email);
    if (attempts?.until > Date.now())
      throw Error("Aguarde um minuto antes de tentar novamente.");
    const row = this.db.prepare("SELECT * FROM users WHERE email=?").get(email);
    if (
      action === "signInWithPassword" ||
      action === "recover" ||
      action === "changePassword"
    ) {
      const secret =
        action === "recover"
          ? p.recoveryCode
          : action === "changePassword"
            ? p.currentPassword
            : p.password;
      if (
        typeof secret !== "string" ||
        secret.length > 256 ||
        !row ||
        !verify(
          secret,
          action === "recover" ? row.recovery_hash : row.password_hash,
        )
      ) {
        const count = (attempts?.count || 0) + 1;
        this.failures.set(email, {
          count,
          until: count >= 5 ? Date.now() + 60000 : 0,
        });
        throw Error("Credenciais inválidas.");
      }
      this.failures.delete(email);
      if (action === "signInWithPassword") {
        this.user = this.publicUser(row);
        return { user: this.user, session: { user: this.user } };
      }
      if (action === "changePassword" && this.owner() !== row.id)
        throw Error("Conta inválida.");
      if (
        typeof p.newPassword !== "string" ||
        p.newPassword.length < 8 ||
        p.newPassword.length > 256
      )
        throw Error("A senha deve ter 8 a 256 caracteres.");
      const recovery = randomBytes(18).toString("hex");
      this.db
        .prepare("UPDATE users SET password_hash=?,recovery_hash=? WHERE id=?")
        .run(hash(p.newPassword), hash(recovery), row.id);
      this.user = null;
      return { recoveryCode: recovery };
    }
    throw Error("Operação de conta inválida.");
  }
  table(t) {
    if (!Object.hasOwn(tables, t)) throw Error("Tabela inválida.");
    return t;
  }
  field(t, k) {
    if (!this.columns[t].has(k)) throw Error("Campo inválido.");
    return k;
  }
  row(t, id) {
    this.table(t);
    const row = this.db
      .prepare(`SELECT * FROM ${t} WHERE id=? AND user_id=?`)
      .get(id, this.owner());
    if (!row) throw Error("Registo não encontrado.");
    return row;
  }
  prepare(t, p, internal = false) {
    if (!p || Array.isArray(p) || typeof p !== "object")
      throw Error("Dados inválidos.");
    const out = {};
    for (const [key, value] of Object.entries(p)) {
      this.field(t, key);
      if (
        [
          "id",
          "user_id",
          "created_at",
          "seq_number",
          "stock_deducted",
        ].includes(key) &&
        !internal
      )
        continue;
      if (value === undefined) continue;
      if (value === null) {
        out[key] = null;
        continue;
      }
      if (numeric.has(key))
        out[key] = decimal(
          value,
          ["amount", "total_amount"].includes(key) ? 2 : 4,
          ["quantity"].includes(key),
        );
      else if (jsonFields.has(key)) {
        if (internal && typeof value === "string") {
          const decoded = JSON.parse(value);
          if (
            key === "secondary_company"
              ? decoded !== null &&
                (typeof decoded !== "object" || Array.isArray(decoded))
              : !Array.isArray(decoded)
          )
            throw Error("Estrutura JSON inválida.");
          out[key] = value;
          continue;
        }
        if (key !== "secondary_company" && !Array.isArray(value))
          throw Error("Lista inválida.");
        out[key] = JSON.stringify(value);
      } else if (boolFields.has(key)) out[key] = value ? 1 : 0;
      else if (typeof value === "string" || typeof value === "number")
        out[key] = value;
      else throw Error("Tipo de campo inválido.");
      if (typeof out[key] === "string" && out[key].length > 12000000)
        throw Error("Campo demasiado grande.");
    }
    for (const k of [
      "name",
      "client",
      "merchant",
      "product_name",
      "full_name",
      "description",
    ])
      if (k in out && out[k] != null) out[k] = required(out[k], k);
    for (const k of [
      "issue_date",
      "due_date",
      "sale_date",
      "payment_date",
      "expense_date",
    ])
      if (
        out[k] != null &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(out[k]) ||
          Number.isNaN(Date.parse(out[k])))
      )
        throw Error("Data inválida.");
    return out;
  }
  next(t) {
    return this.db
      .prepare(
        "INSERT INTO counters VALUES(?,?,1) ON CONFLICT(user_id,kind) DO UPDATE SET value=value+1 RETURNING value",
      )
      .get(this.owner(), t).value;
  }
  insert(t, p) {
    const data = {
      ...this.prepare(t, p, true),
      id: p.id || randomUUID(),
      user_id: this.owner(),
      created_at: now(),
      updated_at: now(),
    };
    if (numbered.has(t)) data.seq_number = this.next(t);
    for (const k of ["issue_date", "payment_date", "expense_date", "sale_date"])
      if (this.columns[t].has(k) && !data[k]) data[k] = today();
    const keys = Object.keys(data);
    this.db
      .prepare(
        `INSERT INTO ${t}(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")})`,
      )
      .run(...keys.map((k) => data[k]));
    return this.row(t, data.id);
  }
  update(t, id, p) {
    const data = this.prepare(t, p, true);
    delete data.id;
    delete data.user_id;
    delete data.created_at;
    data.updated_at = now();
    const keys = Object.keys(data);
    this.db
      .prepare(
        `UPDATE ${t} SET ${keys.map((k) => k + "=?").join(",")} WHERE id=? AND user_id=?`,
      )
      .run(...keys.map((k) => data[k]), id, this.owner());
    return this.row(t, id);
  }
  where(t, filters = []) {
    const parts = ["user_id=?"],
      args = [this.owner()];
    if (!Array.isArray(filters) || filters.length > 30)
      throw Error("Filtros inválidos.");
    for (const f of filters) {
      const k = this.field(t, f.column);
      if (f.op === "in") {
        if (!Array.isArray(f.value) || f.value.length > 1000)
          throw Error("Filtro inválido.");
        parts.push(k + " IN (" + f.value.map(() => "?").join(",") + ")");
        args.push(...f.value);
      } else {
        const op = { eq: "=", gte: ">=", lte: "<=", ilike: "LIKE" }[f.op];
        if (!op) throw Error("Filtro inválido.");
        parts.push(
          k +
            " " +
            op +
            " ?" +
            (f.op === "ilike" ? " ESCAPE '\\' COLLATE NOCASE" : ""),
        );
        args.push(f.value);
      }
    }
    return { sql: parts.join(" AND "), args };
  }
  query(q) {
    const t = this.table(q.table);
    const { sql, args } = this.where(t, q.filters);
    const action = q.action || "select";
    if (action === "select") {
      const order = (q.orders || [])
        .map(
          (x) =>
            this.field(t, x.column) +
            (x.ascending === false ? " DESC" : " ASC"),
        )
        .join(",");
      const count = this.db
        .prepare(`SELECT count(*) n FROM ${t} WHERE ${sql}`)
        .get(...args).n;
      let suffix = order ? " ORDER BY " + order : "";
      const params = [...args];
      if (q.range) {
        const [a, b] = q.range;
        if (
          !Number.isSafeInteger(a) ||
          !Number.isSafeInteger(b) ||
          a < 0 ||
          b < a ||
          b - a > 10000
        )
          throw Error("Página inválida.");
        suffix += " LIMIT ? OFFSET ?";
        params.push(b - a + 1, a);
      }
      let rows = this.db
        .prepare(`SELECT * FROM ${t} WHERE ${sql}${suffix}`)
        .all(...params)
        .map(decode);
      if (q.select && q.select !== "*") {
        const cols = q.select.split(",").map((k) => this.field(t, k.trim()));
        rows = rows.map((r) => Object.fromEntries(cols.map((k) => [k, r[k]])));
      }
      if (q.single) {
        if (rows.length > 1 || (!rows.length && q.single === "required"))
          throw Error("Número inesperado de registos.");
        return { data: rows[0] || null, error: null, count };
      }
      return { data: rows, error: null, count };
    }
    return this.tx(() => {
      let rows = [];
      if (action === "insert" || action === "upsert") {
        if (
          ![
            "company_settings",
            "stock_items",
            "expenses",
            "contacts",
            "debt_clients",
          ].includes(t)
        )
          throw Error("Use a operação comercial para criar este documento.");
        for (const payload of Array.isArray(q.payload)
          ? q.payload
          : [q.payload]) {
          const p = this.prepare(t, payload);
          const existing =
            action === "upsert" && t === "company_settings"
              ? this.db
                  .prepare("SELECT id FROM company_settings WHERE user_id=?")
                  .get(this.owner())
              : null;
          rows.push(
            existing ? this.update(t, existing.id, p) : this.insert(t, p),
          );
        }
      } else {
        if (!q.filters?.length) throw Error("Seleccione o registo a alterar.");
        const found = this.db
          .prepare(`SELECT * FROM ${t} WHERE ${sql}`)
          .all(...args);
        for (const row of found) {
          if (action === "update") {
            const p = this.prepare(t, q.payload);
            const allowed = {
              invoices: ["status"],
              quotes: ["status"],
              expenses: ["status"],
              stock_items: ["stock_level"],
              debt_clients: ["status", "updated_at", "movitel_number", "email"],
            };
            if (
              allowed[t] &&
              Object.keys(p).some((k) => !allowed[t].includes(k))
            )
              throw Error("Alteração não permitida.");
            if (
              [
                "receipts",
                "general_sales",
                "invoice_items",
                "quote_items",
              ].includes(t)
            )
              throw Error("Documento imutável.");
            if (t === "invoices" && p.status) {
              if (row.status === "Paid" && p.status !== "Paid")
                throw Error(
                  "Factura liquidada não pode ser reaberta por esta operação.",
                );
            }
            const updated = this.update(t, row.id, p);
            if (t === "invoices" && p.status === "Paid")
              this.applyStock(row.id);
            rows.push(updated);
          } else if (action === "delete") {
            if (
              t === "invoices" &&
              (row.status === "Paid" ||
                this.db
                  .prepare("SELECT id FROM receipts WHERE invoice_id=?")
                  .get(row.id))
            )
              throw Error("Não pode eliminar uma factura com pagamentos.");
            if (t === "receipts" && row.invoice_id) {
              this.update("invoices", row.invoice_id, { status: "Pending" });
              this.db
                .prepare(
                  "UPDATE debt_clients SET status='Pendente' WHERE user_id=? AND lower(full_name)=lower(?)",
                )
                .run(this.owner(), row.client);
            }
            if (
              ["invoice_items", "quote_items", "company_settings"].includes(t)
            )
              throw Error("Eliminação não permitida.");
            this.db
              .prepare(`DELETE FROM ${t} WHERE id=? AND user_id=?`)
              .run(row.id, this.owner());
            rows.push(row);
          } else throw Error("Operação inválida.");
        }
      }
      const data = rows.map(decode);
      if (q.single && data.length !== 1) throw Error("Registo não encontrado.");
      return { data: q.single ? data[0] : data, error: null };
    });
  }
  applyStock(id) {
    const inv = this.row("invoices", id);
    if (inv.stock_deducted) return;
    if (inv.status !== "Paid") throw Error("A factura deve estar paga.");
    const items = this.db
      .prepare("SELECT * FROM invoice_items WHERE invoice_id=? AND user_id=?")
      .all(id, this.owner());
    const products = this.db
      .prepare("SELECT * FROM stock_items WHERE user_id=? ORDER BY id")
      .all(this.owner());
    const groups = new Map();
    for (const it of items) {
      const key = it.description.trim().toLowerCase();
      groups.set(key, (groups.get(key) || new Decimal(0)).plus(it.quantity));
    }
    for (const [name, quantity] of groups) {
      const matches = products.filter(
        (p) => p.name.trim().toLowerCase() === name,
      );
      if (matches.length > 1) throw Error("Nome de produto ambíguo: " + name);
      if (matches.length) {
        const p = matches[0];
        if (quantity.gt(p.stock_level))
          throw Error("Stock insuficiente: " + p.name);
        this.update("stock_items", p.id, {
          stock_level: new Decimal(p.stock_level).minus(quantity).toFixed(4),
        });
      }
    }
    this.update("invoices", id, { stock_deducted: true });
  }
  rpc(operation, p) {
    this.owner();
    return this.tx(() => {
      if (operation === "rest_apply_invoice_stock") {
        this.applyStock(p.p_invoice_id);
        return { data: null, error: null };
      }
      if (
        ![
          "rest_save_document",
          "rest_create_receipt",
          "rest_create_sale",
        ].includes(operation)
      )
        throw Error("Operação inválida.");
      const rid = required(p.p_request_id, "Identificador");
      if (rid.length > 128) throw Error("Identificador inválido.");
      const payload = JSON.stringify(p);
      const prev = this.db
        .prepare("SELECT * FROM requests WHERE user_id=? AND request_id=?")
        .get(this.owner(), rid);
      if (prev) {
        if (prev.operation !== operation || prev.payload !== payload)
          throw Error("Identificador já utilizado.");
        return { data: JSON.parse(prev.result), error: null };
      }
      let result;
      if (operation === "rest_save_document") result = this.document(p);
      if (operation === "rest_create_sale") result = this.sale(p.p_sale);
      if (operation === "rest_create_receipt")
        result = this.receipt(p.p_receipt);
      const data = decode(result);
      this.db
        .prepare("INSERT INTO requests VALUES(?,?,?,?,?)")
        .run(this.owner(), rid, operation, payload, JSON.stringify(data));
      return { data, error: null };
    });
  }
  document(p) {
    if (!["invoice", "quote"].includes(p.p_kind)) throw Error("Tipo inválido.");
    const t = p.p_kind === "invoice" ? "invoices" : "quotes",
      it = p.p_kind + "_items",
      fk = p.p_kind + "_id";
    if (
      !Array.isArray(p.p_items) ||
      !p.p_items.length ||
      p.p_items.length > 500
    )
      throw Error("Inclua entre 1 e 500 itens.");
    let total = new Decimal(0);
    const items = p.p_items.map((item, i) => {
      const qty = decimal(item.quantity, 4, true),
        price = decimal(item.unitPrice);
      total = total.plus(new Decimal(qty).mul(price));
      return {
        description: required(item.description, "Descrição"),
        quantity: qty,
        unit_price: price,
        sort_order: i,
      };
    });
    const previous = p.p_id ? this.row(t, p.p_id) : null;
    if (
      t === "invoices" &&
      previous &&
      (previous.status === "Paid" ||
        this.db
          .prepare("SELECT id FROM receipts WHERE invoice_id=?")
          .get(previous.id))
    )
      throw Error("Não pode editar uma factura com pagamentos.");
    const doc = { ...p.p_document };
    const source = doc.source_quote_id;
    delete doc.source_quote_id;
    delete doc.amount;
    const clean = this.prepare(t, doc);
    clean.client = required(doc.client, "Cliente");
    clean.amount = total.toFixed(2);
    clean.status = previous?.status || doc.status || "Pending";
    const saved = previous
      ? this.update(t, previous.id, clean)
      : this.insert(t, clean);
    if (previous)
      this.db.prepare(`DELETE FROM ${it} WHERE ${fk}=?`).run(saved.id);
    for (const item of items) this.insert(it, { ...item, [fk]: saved.id });
    const clients = this.db
      .prepare(
        "SELECT * FROM debt_clients WHERE user_id=? AND lower(full_name)=lower(?)",
      )
      .all(this.owner(), clean.client);
    if (!clients.length)
      this.insert("debt_clients", {
        full_name: clean.client,
        movitel_number: doc.client_phone || "",
        email: doc.client_email || null,
        status: "Pendente",
      });
    else
      for (const c of clients)
        this.update("debt_clients", c.id, {
          movitel_number: doc.client_phone || c.movitel_number,
          email: doc.client_email || c.email,
        });
    if (t === "invoices") {
      this.db
        .prepare(
          "UPDATE quotes SET status='Approved' WHERE user_id=? AND lower(client)=lower(?) AND status='Pending'",
        )
        .run(this.owner(), clean.client);
      if (source) {
        this.row("quotes", source);
        this.update("quotes", source, { status: "Liquidado" });
      }
      if (saved.status === "Paid") this.applyStock(saved.id);
    }
    return this.row(t, saved.id);
  }
  sale(p) {
    const clean = this.prepare("general_sales", p);
    clean.quantity = decimal(p.quantity, 4, true);
    clean.unit_price = decimal(p.unit_price);
    clean.total_amount = new Decimal(clean.quantity)
      .mul(clean.unit_price)
      .toFixed(2);
    if (clean.product_id) {
      const product = this.row("stock_items", clean.product_id);
      if (new Decimal(product.stock_level).lt(clean.quantity))
        throw Error("Stock insuficiente.");
      this.update("stock_items", product.id, {
        stock_level: new Decimal(product.stock_level)
          .minus(clean.quantity)
          .toFixed(4),
      });
    }
    return this.insert("general_sales", clean);
  }
  receipt(p) {
    const clean = this.prepare("receipts", p);
    clean.amount = decimal(p.amount, 2, true);
    if (new Decimal(clean.amount).lte(0)) throw Error("Pagamento inválido.");
    let linked = clean.invoice_id;
    if (!linked && /^FAC-[0-9]+$/.test(clean.invoice_ref || "")) {
      linked = this.db
        .prepare("SELECT id FROM invoices WHERE user_id=? AND seq_number=?")
        .get(this.owner(), Number(clean.invoice_ref.slice(4)))?.id;
      if (!linked) throw Error("Factura não encontrada.");
    }
    let settle = false,
      inv;
    if (linked) {
      inv = this.row("invoices", linked);
      if (inv.status === "Paid") throw Error("Factura já paga.");
      const paid = this.db
        .prepare("SELECT amount FROM receipts WHERE invoice_id=? AND user_id=?")
        .all(linked, this.owner())
        .reduce((s, r) => s.plus(r.amount), new Decimal(0));
      const sum = paid.plus(clean.amount);
      if (sum.gt(inv.amount)) throw Error("Pagamento excede o saldo.");
      settle = sum.eq(inv.amount);
      clean.invoice_id = inv.id;
      clean.client = inv.client;
      clean.company_profile_id = inv.company_profile_id;
      clean.invoice_ref = "FAC-" + String(inv.seq_number).padStart(4, "0");
    }
    const saved = this.insert("receipts", clean);
    if (settle) {
      this.update("invoices", inv.id, { status: "Paid" });
      this.applyStock(inv.id);
      if (
        !this.db
          .prepare(
            "SELECT id FROM invoices WHERE user_id=? AND lower(client)=lower(?) AND status<>'Paid'",
          )
          .get(this.owner(), inv.client)
      ) {
        this.db
          .prepare(
            "UPDATE debt_clients SET status='Liquidado' WHERE user_id=? AND lower(full_name)=lower(?)",
          )
          .run(this.owner(), inv.client);
        this.db
          .prepare(
            "UPDATE quotes SET status='Liquidado' WHERE user_id=? AND lower(client)=lower(?) AND status IN ('Pending','Approved')",
          )
          .run(this.owner(), inv.client);
      }
    }
    return saved;
  }
  attachment(action, p) {
    const owner = this.owner();
    if (action === "upload") {
      const bytes = Buffer.from(p.bytes);
      if (
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          p.mime,
        ) ||
        !bytes.length ||
        bytes.length > 10 * 1024 * 1024
      )
        throw Error("Comprovativo inválido (máximo 10 MB).");
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO attachments VALUES(?,?,?,?,?)")
        .run(id, owner, p.mime, bytes, now());
      return { key: "local:" + id };
    }
    if (action === "download") {
      const id = String(p.key).replace(/^local:/, "");
      const row = this.db
        .prepare("SELECT mime,data FROM attachments WHERE id=? AND user_id=?")
        .get(id, owner);
      if (!row) throw Error("Comprovativo não encontrado.");
      return { mime: row.mime, bytes: row.data };
    }
    throw Error("Operação inválida.");
  }
  info() {
    this.owner();
    return { path: this.root, version: require("../package.json").version, schema: 1 };
  }
  backup(destination) {
    this.owner();
    if (fs.existsSync(destination))
      throw Error("O ficheiro de destino já existe.");
    this.db.prepare("VACUUM INTO ?").run(destination);
    const bytes = fs.readFileSync(destination);
    fs.writeFileSync(
      destination + ".sha256",
      createHash("sha256").update(bytes).digest("hex") +
        "  " +
        path.basename(destination) +
        "\n",
    );
    return { path: destination };
  }
}
module.exports = { Service, decimal };

require("./maintenance.cjs")(Service);

require("./archives.cjs")(Service);
