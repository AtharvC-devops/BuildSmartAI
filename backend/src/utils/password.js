const crypto = require("crypto");

const SCRYPT_PREFIX = "scrypt";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const parts = String(storedHash).split("$");
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX) return false;
  const derived = crypto.scryptSync(String(password), parts[1], 64);
  const expected = Buffer.from(parts[2], "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

module.exports = { hashPassword, verifyPassword };
