const { errorResponse } = require("../utils/response");

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.stack || err.message);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected error occurred on the server";
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const details = err.details || [];

  return errorResponse(res, message, code, details, statusCode);
}

module.exports = errorHandler;
