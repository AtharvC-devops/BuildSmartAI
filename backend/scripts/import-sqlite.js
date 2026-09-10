const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const initSqlJs = require("sql.js");
require("dotenv").config();
const { hashPassword } = require("../src/utils/password");

const sourcePath = process.env.SQLITE_SOURCE || path.join(__dirname, "..", "buildsmart.db");
const mysqlConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "buildsmartai"
};

function sourceRows(db, table) {
  const result = db.exec(`SELECT * FROM ${table}`);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(columns.map((column, index) => [column, row[index]])));
}

async function insertRows(connection, table, columns, rows, mapper = row => columns.map(column => row[column])) {
  let migrated = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await connection.execute(`INSERT IGNORE INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, mapper(row));
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error(`[IMPORT] ${table} record failed: ${error.message}`);
    }
  }
  return { migrated, failed };
}

async function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`SQLite source not found: ${sourcePath}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(sourcePath));
  const connection = await mysql.createConnection(mysqlConfig);
  const report = {};
  try {
    await connection.beginTransaction();
    report.users = await insertRows(connection, "users", ["id", "email", "password", "name", "role", "builder_scale", "company_name", "phone", "created_at"], sourceRows(db, "users"), row => [row.id, row.email, String(row.password || "").startsWith("scrypt$") ? row.password : hashPassword(row.password || "password123"), row.name, row.role || "builder", row.builder_scale || "SMALL", row.company_name, row.phone, row.created_at]);
    report.projects = await insertRows(connection, "projects", ["id", "user_id", "name", "client_id", "client_name", "builder_id", "budget", "spent", "location", "area", "floors", "type", "status", "progress", "start_date", "expected_completion", "risk_level", "scale", "created_at"], sourceRows(db, "projects"), row => [row.id, row.user_id, row.name, row.client_id, row.client_name, row.builder_id, row.budget, row.spent, row.location, row.area, row.floors, row.type, row.status, row.progress, row.start_date, row.expected_completion, row.risk_level, row.scale || "SMALL", row.created_at]);
    report.boq_items = await insertRows(connection, "boq_items", ["id", "project_id", "category", "description", "unit", "quantity", "rate", "rate_source", "total", "created_at"], sourceRows(db, "boq_items"), row => [row.id, row.project_id, row.category, row.description, row.unit, row.quantity, row.rate, row.rate_source || "market_standard", row.total || Number(row.quantity) * Number(row.rate), row.created_at]);
    report.contractors = await insertRows(connection, "contractors", ["id", "project_id", "name", "company_name", "contact", "address", "gst_number", "pan_number", "contract_start_date", "contract_end_date", "status", "created_at"], sourceRows(db, "contractors"));
    report.contracts = await insertRows(connection, "contracts", ["id", "project_id", "contractor_id", "contract_number", "contract_date", "contract_value", "retention_percentage", "gst_applicable", "gst_rate", "status", "created_at"], sourceRows(db, "contracts"));
    report.contract_boq_items = await insertRows(connection, "contract_boq_items", ["id", "contract_id", "boq_item_id", "description", "unit", "contracted_quantity", "contract_rate", "contract_amount"], sourceRows(db, "contract_boq_items"));
    report.ra_bills = await insertRows(connection, "ra_bills", ["id", "project_id", "contract_id", "contractor_id", "bill_number", "period_start", "period_end", "billing_period_start", "billing_period_end", "submission_date", "work_description", "gross_amount", "net_payable", "retention_percent", "gst_applicable", "gst_rate", "created_by", "submitted_by", "reviewed_by", "approved_by", "paid_by", "rejection_reason", "status", "created_at"], sourceRows(db, "ra_bills"), row => [row.id, row.project_id, row.contract_id || 1, row.contractor_id || 1, row.bill_number, row.period_start, row.period_end, row.billing_period_start || row.period_start, row.billing_period_end || row.period_end, row.submission_date, row.work_description, row.gross_amount || 0, row.net_payable || 0, row.retention_percent || 0, row.gst_applicable || 0, row.gst_rate || 0, row.created_by, row.submitted_by, row.reviewed_by, row.approved_by, row.paid_by, row.rejection_reason, row.status || "draft", row.created_at]);
    report.ra_bill_items = await insertRows(connection, "ra_bill_items", ["id", "ra_bill_id", "boq_item_id", "description", "unit", "contract_quantity", "previously_billed_quantity", "current_quantity", "cumulative_quantity", "contract_rate", "current_amount", "cumulative_amount"], sourceRows(db, "ra_bill_items"));
    report.ra_deductions = await insertRows(connection, "ra_deductions", ["id", "ra_bill_id", "retention", "advance_recovery", "penalty", "other_deduction", "gst", "tax_deduction", "total_deduction"], sourceRows(db, "ra_deductions"));
    report.ra_bill_payments = await insertRows(connection, "ra_bill_payments", ["id", "ra_bill_id", "payment_date", "payment_reference", "amount", "payment_status"], sourceRows(db, "ra_bill_payments"));
    await connection.commit();
    console.log(JSON.stringify({ source: sourcePath, report }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(`[IMPORT] Failed: ${error.message}`);
  process.exitCode = 1;
});
