const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { get, run } = require("../db/mysql");
const { successResponse } = require("../utils/response");
const { SCALE_CONFIG, getScaleConfig } = require("../config/scaleFeatures");
const { hashPassword, verifyPassword } = require("../utils/password");
const { JWT_SECRET } = require("../middleware/auth.middleware");

const asyncHelper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function toTierConfig(scale) {
  const config = getScaleConfig(scale);
  return {
    ...config,
    allowedFeatures: [...config.enabledFeatures, ...config.advancedFeatures],
    restrictedFeatures: []
  };
}

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, builderScale: user.builder_scale }, JWT_SECRET, { expiresIn: "8h" });
}

// ── POST /api/auth/login ────────────────────────────────────────────────
router.post("/login", asyncHelper(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw { status: 400, code: "MISSING_CREDENTIALS", message: "Email and password are required" };
  }

  const user = await get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  if (!user || !verifyPassword(password, user.password)) {
    throw { status: 401, code: "INVALID_CREDENTIALS", message: "Invalid email or password" };
  }

  const role = user.role || (user.builder_scale ? "builder" : "client");
  const tierConfig = toTierConfig(user.builder_scale);

  const userProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: role,
    builderScale: user.builder_scale,
    companyName: user.company_name,
    tierConfig
  };

  return successResponse(res, {
    token: issueToken({ ...user, role, builder_scale: user.builder_scale }),
    user: userProfile
  }, 200);
}));

// ── POST /api/auth/signup & /api/auth/register ─────────────────────────────
const handleSignup = asyncHelper(async (req, res) => {
  const { email, password, name, builderScale, companyName, role } = req.body;

  if (!email || !password || !name) {
    throw { status: 400, code: "INVALID_PAYLOAD", message: "Email, password, and name are required" };
  }

  const userRole = role || (builderScale ? "builder" : "client");
  let scaleUpper = "SMALL";

  if (userRole === "builder") {
    const scale = builderScale || "SMALL";
    const validScales = ["SMALL", "MID", "LARGE"];
    scaleUpper = scale.toUpperCase();
    if (!validScales.includes(scaleUpper)) {
      throw { status: 400, code: "INVALID_SCALE", message: "Builder scale must be SMALL, MID, or LARGE" };
    }
  }

  const existing = await get("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  if (existing) {
    throw { status: 409, code: "EMAIL_EXISTS", message: "An account with this email already exists" };
  }

  const result = await run(
    "INSERT INTO users (email, password, name, builder_scale, company_name) VALUES (?, ?, ?, ?, ?)",
    [email, hashPassword(password), name, scaleUpper, companyName || (userRole === "builder" ? `${name}'s Construction Co.` : null)]
  );

  const newUser = await get("SELECT * FROM users WHERE id = ?", [result.lastInsertRowid]);
  const tierConfig = toTierConfig(newUser.builder_scale);

  const userProfile = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: userRole,
    builderScale: newUser.builder_scale,
    companyName: newUser.company_name,
    tierConfig
  };

  return successResponse(res, {
    token: issueToken({ ...newUser, role: userRole, builder_scale: newUser.builder_scale }),
    user: userProfile
  }, 201);
});

router.post("/signup", handleSignup);
router.post("/register", handleSignup);

// ── GET /api/auth/me ────────────────────────────────────────────────────
router.get("/me", asyncHelper(async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || 1;
  const user = await get("SELECT * FROM users WHERE id = ?", [userId]);

  if (!user) {
    throw { status: 404, code: "USER_NOT_FOUND", message: "User profile not found" };
  }

  const role = user.role || (user.builder_scale ? "builder" : "client");
  const tierConfig = toTierConfig(user.builder_scale);

  return successResponse(res, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: role,
    builderScale: user.builder_scale,
    companyName: user.company_name,
    tierConfig
  });
}));

// GET /api/auth/capabilities - the shared feature contract for web and API clients
router.get("/capabilities", asyncHelper(async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || 1;
  const user = await get("SELECT builder_scale FROM users WHERE id = ?", [userId]);
  if (!user) {
    throw { status: 404, code: "USER_NOT_FOUND", message: "User profile not found" };
  }
  return successResponse(res, {
    scale: user.builder_scale,
    ...toTierConfig(user.builder_scale),
    scaleOptions: Object.keys(SCALE_CONFIG)
  });
}));

module.exports = router;
