const tables = {
  company_settings:
    "company_name TEXT NOT NULL DEFAULT '', nuit TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', logo_base64 TEXT, stamp_base64 TEXT, bank_accounts TEXT NOT NULL DEFAULT '[]', mobile_contacts TEXT NOT NULL DEFAULT '[]', secondary_company TEXT, setup_complete INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id)",
  stock_items:
    "name TEXT NOT NULL, sku TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', category_pt TEXT NOT NULL DEFAULT '', stock_level TEXT NOT NULL DEFAULT '0', max_stock TEXT NOT NULL DEFAULT '0', price TEXT NOT NULL DEFAULT '0', sale_price TEXT, warehouse TEXT NOT NULL DEFAULT '', warehouse_pt TEXT NOT NULL DEFAULT ''",
  invoices:
    "seq_number INTEGER NOT NULL, client TEXT NOT NULL, client_nuit TEXT, client_phone TEXT, client_email TEXT, description TEXT, issue_date TEXT NOT NULL, due_date TEXT, amount TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Paid','Overdue')), logo_bg TEXT, company_profile_id TEXT NOT NULL DEFAULT 'primary' CHECK(company_profile_id IN ('primary','secondary')), notes TEXT, stock_deducted INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id, seq_number)",
  quotes:
    "seq_number INTEGER NOT NULL, client TEXT NOT NULL, client_nuit TEXT, client_phone TEXT, client_email TEXT, description TEXT, issue_date TEXT NOT NULL, validity_days INTEGER NOT NULL DEFAULT 15 CHECK(validity_days>0), amount TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected','Liquidado')), logo_bg TEXT, company_profile_id TEXT NOT NULL DEFAULT 'primary' CHECK(company_profile_id IN ('primary','secondary')), notes TEXT, UNIQUE(user_id, seq_number)",
  invoice_items:
    "invoice_id TEXT NOT NULL, description TEXT NOT NULL, quantity TEXT NOT NULL, unit_price TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(invoice_id,user_id) REFERENCES invoices(id,user_id) ON DELETE CASCADE",
  quote_items:
    "quote_id TEXT NOT NULL, description TEXT NOT NULL, quantity TEXT NOT NULL, unit_price TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(quote_id,user_id) REFERENCES quotes(id,user_id) ON DELETE CASCADE",
  receipts:
    "seq_number INTEGER NOT NULL, invoice_id TEXT, invoice_ref TEXT, client TEXT NOT NULL, amount TEXT NOT NULL, method TEXT NOT NULL DEFAULT '', method_pt TEXT NOT NULL DEFAULT '', payment_date TEXT NOT NULL, company_profile_id TEXT NOT NULL DEFAULT 'primary' CHECK(company_profile_id IN ('primary','secondary')), notes TEXT, UNIQUE(user_id,seq_number), FOREIGN KEY(invoice_id,user_id) REFERENCES invoices(id,user_id)",
  expenses:
    "seq_number INTEGER NOT NULL, merchant TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', category_pt TEXT NOT NULL DEFAULT '', amount TEXT NOT NULL, expense_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')), notes TEXT, receipt_image_url TEXT, UNIQUE(user_id,seq_number)",
  general_sales:
    "seq_number INTEGER NOT NULL, product_id TEXT, product_name TEXT NOT NULL, sku TEXT NOT NULL DEFAULT '', quantity TEXT NOT NULL, unit_price TEXT NOT NULL, total_amount TEXT NOT NULL, sale_date TEXT NOT NULL, payment_method TEXT NOT NULL DEFAULT '', notes TEXT, UNIQUE(user_id,seq_number), FOREIGN KEY(product_id,user_id) REFERENCES stock_items(id,user_id)",
  contacts:
    "name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', role_pt TEXT NOT NULL DEFAULT '', avatar_color TEXT NOT NULL DEFAULT ''",
  debt_clients:
    "full_name TEXT NOT NULL, movitel_number TEXT NOT NULL DEFAULT '', vodacom_number TEXT NOT NULL DEFAULT '', email TEXT, address TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Pendente' CHECK(status IN ('Pendente','Liquidado'))",
};
function migrate(db) {
  const version = db.prepare("PRAGMA user_version").get().user_version;
  if (version > 1) throw Error("Base de dados de uma versão mais recente.");
  if (version === 1) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(
      "CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE counters(user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(user_id,kind)); CREATE TABLE requests(user_id TEXT NOT NULL REFERENCES users(id), request_id TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(user_id,request_id)); CREATE TABLE attachments(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), mime TEXT NOT NULL, data BLOB NOT NULL, created_at TEXT NOT NULL);",
    );
    for (const [name, fields] of Object.entries(tables)) {
      db.exec(
        `CREATE TABLE ${name}(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, ${fields}, UNIQUE(id,user_id)); CREATE INDEX ${name}_owner ON ${name}(user_id);`,
      );
    }
    db.exec(
      "CREATE INDEX receipts_invoice ON receipts(invoice_id); CREATE INDEX invoice_items_parent ON invoice_items(invoice_id); CREATE INDEX quote_items_parent ON quote_items(quote_id); PRAGMA user_version=1; COMMIT;",
    );
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
module.exports = { tables, migrate };
