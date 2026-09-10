const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true
};
const migration = path.join(__dirname, "..", "src", "db", "migrations", "001_initial.sql");

async function migrate() {
  const connection = await mysql.createConnection(config);
  try {
    await connection.query(fs.readFileSync(migration, "utf8"));
    console.log(`[MIGRATE] Applied ${path.basename(migration)} to ${process.env.DB_NAME || "buildsmartai"}`);
  } finally {
    await connection.end();
  }
}

migrate().catch(error => {
  console.error(`[MIGRATE] Failed: ${error.message}`);
  process.exitCode = 1;
});
