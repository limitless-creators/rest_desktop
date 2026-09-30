const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Service } = require("../electron/service.cjs");
function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rest-desktop-test-"));
  const s = new Service(root);
  t.after(() => {
    s.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  s.auth("signUp", {
    email: "owner@test.local",
    password: "password123",
    options: { data: { name: "Owner" } },
  });
  s.auth("signInWithPassword", {
    email: "owner@test.local",
    password: "password123",
  });
  return s;
}
const insert = (s, table, payload) =>
  s.query({ table, action: "insert", payload, single: "required" }).data;
const list = (s, table) => s.query({ table }).data;
const rpc = (s, name, p) =>
  s.rpc(name, { ...p, p_request_id: p.p_request_id || randomUUID() }).data;
const product = (s) =>
  insert(s, "stock_items", {
    name: "Produto",
    sku: "P",
    stock_level: 10,
    max_stock: 20,
    price: 2,
    sale_price: 3,
  });
const invoice = (s, p = {}) =>
  rpc(s, "rest_save_document", {
    p_kind: "invoice",
    p_document: { client: "Cliente", status: "Pending", ...p },
    p_items: [{ description: "Produto", quantity: 2, unitPrice: 3 }],
  });
test("fresh database, settings JSON and persistence after reopening", (t) => {
  const s = setup(t);
  s.query({
    table: "company_settings",
    action: "upsert",
    payload: {
      company_name: "Empresa",
      setup_complete: true,
      bank_accounts: [{ bank: "BCI", iban: "123" }],
    },
    single: "required",
  });
  s.close();
  s.db = new (require("node:sqlite").DatabaseSync)(s.filename);
  assert.equal(list(s, "company_settings")[0].bank_accounts[0].bank, "BCI");
  assert.equal(list(s, "company_settings")[0].setup_complete, true);
});
test("accounts use hashes, recovery rotates code and does not expose credentials", (t) => {
  const s = setup(t);
  const r = s.auth("signUp", {
    email: "two@test.local",
    password: "password123",
    options: { data: { name: "Two" } },
  });
  assert.ok(r.recoveryCode);
  assert.equal(r.user.password_hash, undefined);
  assert.notEqual(
    s.db.prepare("SELECT password_hash FROM users WHERE id=?").get(r.user.id)
      .password_hash,
    "password123",
  );
  s.auth("recover", {
    email: "two@test.local",
    recoveryCode: r.recoveryCode,
    newPassword: "newpassword123",
  });
  assert.throws(() =>
    s.auth("recover", {
      email: "two@test.local",
      recoveryCode: r.recoveryCode,
      newPassword: "newpassword123",
    }),
  );
  assert.ok(
    s.auth("signInWithPassword", {
      email: "two@test.local",
      password: "newpassword123",
    }).user,
  );
});
test("reads and writes cannot cross account ownership", (t) => {
  const s = setup(t);
  const p = product(s);
  s.auth("signUp", {
    email: "two@test.local",
    password: "password123",
    options: { data: { name: "Two" } },
  });
  s.auth("signInWithPassword", {
    email: "two@test.local",
    password: "password123",
  });
  assert.equal(list(s, "stock_items").length, 0);
  s.query({
    table: "stock_items",
    action: "update",
    payload: { stock_level: 1 },
    filters: [{ column: "id", op: "eq", value: p.id }],
  });
  assert.throws(() =>
    rpc(s, "rest_create_sale", {
      p_sale: {
        product_id: p.id,
        product_name: "Produto",
        quantity: 1,
        unit_price: 3,
      },
    }),
  );
  assert.throws(() => s.query({ table: "users" }));
  assert.throws(() =>
    s.query({
      table: "stock_items",
      filters: [{ column: "id; DROP TABLE users", op: "eq", value: p.id }],
    }),
  );
  assert.equal(s.info().isAdmin, false);
  assert.throws(() => s.backup(path.join(s.root, "forbidden")));
});
test("invoice total is calculated by service with decimal precision", (t) => {
  const s = setup(t);
  const r = rpc(s, "rest_save_document", {
    p_kind: "invoice",
    p_document: { client: "C", amount: 999 },
    p_items: [
      { description: "A", quantity: 3, unitPrice: 0.1 },
      { description: "B", quantity: 1, unitPrice: 0.005 },
    ],
  });
  assert.equal(r.amount, 0.31);
  assert.equal(list(s, "invoice_items").length, 2);
});
test("partial then final payment changes status and decrements stock once", (t) => {
  const s = setup(t);
  const p = product(s);
  const inv = invoice(s);
  rpc(s, "rest_create_receipt", {
    p_receipt: { invoice_id: inv.id, client: "C", amount: 2 },
  });
  assert.equal(list(s, "invoices")[0].status, "Pending");
  const req = {
    p_request_id: "same",
    p_receipt: { invoice_id: inv.id, client: "C", amount: 4 },
  };
  const a = rpc(s, "rest_create_receipt", req);
  assert.deepEqual(rpc(s, "rest_create_receipt", req), a);
  assert.equal(list(s, "invoices")[0].status, "Paid");
  assert.equal(list(s, "stock_items")[0].stock_level, 8);
  s.rpc("rest_apply_invoice_stock", { p_invoice_id: inv.id });
  assert.equal(list(s, "stock_items")[0].stock_level, 8);
  assert.equal(list(s, "receipts").length, 2);
});
test("overpayment and payment failures roll back the entire transaction", (t) => {
  const s = setup(t);
  const inv = invoice(s);
  assert.throws(() =>
    rpc(s, "rest_create_receipt", {
      p_receipt: { invoice_id: inv.id, amount: 7 },
    }),
  );
  assert.equal(list(s, "receipts").length, 0);
  product(s);
  s.query({
    table: "stock_items",
    action: "update",
    payload: { stock_level: 1 },
    filters: [{ column: "name", op: "eq", value: "Produto" }],
  });
  assert.throws(() =>
    rpc(s, "rest_create_receipt", {
      p_receipt: { invoice_id: inv.id, amount: 6 },
    }),
  );
  assert.equal(list(s, "receipts").length, 0);
  assert.equal(list(s, "invoices")[0].status, "Pending");
});
test("sale is atomic and repeated request cannot reduce stock again", (t) => {
  const s = setup(t);
  const p = product(s);
  const req = {
    p_request_id: "sale-1",
    p_sale: {
      product_id: p.id,
      product_name: p.name,
      quantity: 4,
      unit_price: 2.55,
    },
  };
  const sale = rpc(s, "rest_create_sale", req);
  assert.equal(sale.total_amount, 10.2);
  rpc(s, "rest_create_sale", req);
  assert.equal(list(s, "stock_items")[0].stock_level, 6);
  assert.throws(() =>
    rpc(s, "rest_create_sale", {
      p_sale: {
        product_id: p.id,
        product_name: p.name,
        quantity: 8,
        unit_price: 1,
      },
    }),
  );
  assert.equal(list(s, "general_sales").length, 1);
  assert.throws(() =>
    rpc(s, "rest_create_sale", {
      ...req,
      p_sale: { ...req.p_sale, quantity: 1 },
    }),
  );
});
test("paid invoices and invoices with receipts cannot be edited", (t) => {
  const s = setup(t);
  const inv = invoice(s);
  rpc(s, "rest_create_receipt", {
    p_receipt: { invoice_id: inv.id, amount: 1 },
  });
  assert.throws(() =>
    rpc(s, "rest_save_document", {
      p_kind: "invoice",
      p_id: inv.id,
      p_document: { client: "changed" },
      p_items: [{ description: "A", quantity: 1, unitPrice: 2 }],
    }),
  );
  assert.throws(() =>
    s.query({
      table: "invoices",
      action: "delete",
      filters: [{ column: "id", op: "eq", value: inv.id }],
    }),
  );
});
test("quote conversion rolls back if source does not belong to account", (t) => {
  const s = setup(t);
  assert.throws(() => invoice(s, { source_quote_id: randomUUID() }));
  assert.equal(list(s, "invoices").length, 0);
  assert.equal(list(s, "invoice_items").length, 0);
  assert.equal(list(s, "debt_clients").length, 0);
});
test("duplicate stock names prevent ambiguous inventory deductions", (t) => {
  const s = setup(t);
  product(s);
  product(s);
  assert.throws(() => invoice(s, { status: "Paid" }));
  assert.equal(list(s, "invoices").length, 0);
  assert.equal(list(s, "stock_items")[0].stock_level, 10);
});
test("numbers never repeat after deleting a document", (t) => {
  const s = setup(t);
  const a = invoice(s);
  s.query({
    table: "invoices",
    action: "delete",
    filters: [{ column: "id", op: "eq", value: a.id }],
  });
  assert.equal(invoice(s).seq_number, 2);
});
test("complete reads exceed 1000 rows and filters preserve literal wildcards", (t) => {
  const s = setup(t);
  s.tx(() => {
    for (let i = 0; i < 1207; i++)
      s.insert("contacts", { name: "Cliente " + i });
    s.insert("contacts", { name: "100% especial" });
  });
  assert.equal(list(s, "contacts").length, 1208);
  const result = s.query({
    table: "contacts",
    range: [1000, 1099],
    orders: [{ column: "id" }],
  });
  assert.equal(result.data.length, 100);
  assert.equal(result.count, 1208);
  assert.equal(
    s.query({
      table: "contacts",
      filters: [{ column: "name", op: "ilike", value: "%100\\%%" }],
    }).data.length,
    1,
  );
});
test("attachments are local and account restricted", (t) => {
  const s = setup(t);
  const a = s.attachment("upload", {
    mime: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
  });
  assert.equal(s.attachment("download", { key: a.key }).bytes.length, 3);
  s.auth("signOut");
  assert.throws(() => s.attachment("download", { key: a.key }));
});
test("backup and restore include database, accounts and attachments", (t) => {
  const s = setup(t);
  product(s);
  const a = s.attachment("upload", {
    mime: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
  });
  const backup = path.join(s.root, "copy.restbackup");
  s.backup(backup);
  invoice(s);
  s.restore(backup);
  assert.equal(s.user, null);
  s.auth("signInWithPassword", {
    email: "owner@test.local",
    password: "password123",
  });
  assert.equal(list(s, "invoices").length, 0);
  assert.equal(list(s, "stock_items").length, 1);
  assert.equal(s.attachment("download", { key: a.key }).bytes.length, 3);
});
test("corrupt backup is rejected without replacing live data", (t) => {
  const s = setup(t);
  product(s);
  const backup = path.join(s.root, "bad.restbackup");
  s.backup(backup);
  fs.appendFileSync(backup, "changed");
  assert.throws(() => s.restore(backup));
  assert.equal(list(s, "stock_items").length, 1);
});
test("automatic daily backup is idempotent", (t) => {
  const s = setup(t);
  assert.equal(s.scheduledBackup().created, true);
  assert.equal(s.scheduledBackup().created, false);
});
test("import preview and commit preserve identifiers and sequence", (t) => {
  const s = setup(t);
  const file = path.join(s.root, "import.json");
  const id = randomUUID();
  fs.writeFileSync(
    file,
    JSON.stringify({
      format: "rest-local-import-v1",
      tables: {
        expenses: [
          {
            id,
            seq_number: 12,
            merchant: "Loja",
            amount: 25,
            expense_date: "2026-09-23",
          },
        ],
      },
    }),
  );
  const p = s.importPreview(file);
  s.importData(file, p.digest);
  assert.equal(list(s, "expenses")[0].id, id);
  assert.equal(
    insert(s, "expenses", { merchant: "Next", amount: 1 }).seq_number,
    13,
  );
  assert.throws(() => s.importPreview(file));
});
test("invalid numeric values are rejected", (t) => {
  const s = setup(t);
  for (const v of [NaN, Infinity, -1])
    assert.throws(() =>
      insert(s, "stock_items", { name: "Bad", stock_level: v }),
    );
  assert.equal(list(s, "stock_items").length, 0);
});
