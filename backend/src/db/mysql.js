const mysql = require("mysql2/promise");
require("dotenv").config();

let pool = null;

function databaseConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "buildsmartai",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    decimalNumbers: false,
    dateStrings: true
  };
}

function unavailableError(error) {
  const err = new Error("Unable to connect to MySQL database. Verify that MySQL is running and database credentials are configured.");
  err.code = "MYSQL_UNAVAILABLE";
  err.cause = error;
  return err;
}

async function initDatabase() {
  if (pool) return pool;
  const config = databaseConfig();
  try {
    pool = mysql.createPool(config);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log(`[MYSQL] Connected to '${config.database}' at ${config.host}:${config.port}`);
    return pool;
  } catch (error) {
    if (pool) await pool.end().catch(() => { });
    pool = null;
    console.error(`[MYSQL] ${error.code || "CONNECTION_ERROR"}: database unavailable`);
    throw unavailableError(error);
  }
}

function activePool() {
  if (!pool) throw new Error("MySQL database has not been initialized");
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await activePool().execute(sql, params);
  return rows;
}

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

async function run(sql, params = []) {
  const [result] = await activePool().execute(sql, params);
  return { lastInsertRowid: result.insertId, affectedRows: result.affectedRows };
}

async function withTransaction(work) {
  const connection = await activePool().getConnection();
  const transaction = {
    query: async (sql, params = []) => (await connection.execute(sql, params))[0],
    get: async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows.length ? rows[0] : null;
    },
    run: async (sql, params = []) => {
      const [result] = await connection.execute(sql, params);
      return { lastInsertRowid: result.insertId, affectedRows: result.affectedRows };
    }
  };

  try {
    await connection.beginTransaction();
    const result = await work(transaction);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => { });
    throw error;
  } finally {
    connection.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initDatabase,
  closeDatabase,
  query,
  get,
  run,
  withTransaction,
  get pool() { return pool; }
};
