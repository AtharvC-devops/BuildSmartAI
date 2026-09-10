/**
 * Standard API Response helpers
 */

function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

function errorResponse(res, message, code = "INTERNAL_ERROR", details = [], statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details
    }
  });
}

module.exports = {
  successResponse,
  errorResponse
};
