const { errorResponse } = require("../utils/response");

function validateSchema(schema) {
  return (req, res, next) => {
    const errors = [];
    const target = req.body || {};

    Object.entries(schema).forEach(([field, rules]) => {
      const value = target[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push({ field, message: `${field} is required` });
        return;
      }

      if (value !== undefined && value !== null && value !== "") {
        // Check type
        if (rules.type === "number") {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({ field, message: `${field} must be a number` });
            return;
          }
          if (rules.positive && num <= 0) {
            errors.push({ field, message: `${field} must be positive` });
          }
          if (rules.min !== undefined && num < rules.min) {
            errors.push({ field, message: `${field} must be at least ${rules.min}` });
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push({ field, message: `${field} must be at most ${rules.max}` });
          }
          if (rules.integer && !Number.isInteger(num)) {
            errors.push({ field, message: `${field} must be an integer` });
          }
        } else if (rules.type === "string") {
          if (typeof value !== "string") {
            errors.push({ field, message: `${field} must be a string` });
          } else if (rules.enum && !rules.enum.includes(value.toLowerCase())) {
            errors.push({ field, message: `${field} must be one of: ${rules.enum.join(", ")}` });
          }
        } else if (rules.type === "array") {
          if (!Array.isArray(value)) {
            errors.push({ field, message: `${field} must be an array` });
          }
        }
      }
    });

    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", "VALIDATION_ERROR", errors, 400);
    }

    next();
  };
}

module.exports = {
  validateSchema
};
