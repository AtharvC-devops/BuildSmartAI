const express = require("express");
const router = express.Router();
const { users, agents, reviews, services } = require("../data/sampleData");
const { successResponse } = require("../utils/response");

const asyncHelper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── GET /api/users ──────────────────────────────────────────────────────
router.get("/users", asyncHelper(async (_req, res) => {
  return successResponse(res, users);
}));

// ── GET /api/users/:id ──────────────────────────────────────────────────
router.get("/users/:id", asyncHelper(async (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) {
    throw { status: 404, code: "USER_NOT_FOUND", message: "User not found" };
  }
  return successResponse(res, user);
}));

// ── GET /api/agents ─────────────────────────────────────────────────────
router.get("/agents", asyncHelper(async (_req, res) => {
  return successResponse(res, agents);
}));

// ── GET /api/agents/:id ─────────────────────────────────────────────────
router.get("/agents/:id", asyncHelper(async (req, res) => {
  const agent = agents.find((a) => a.id === parseInt(req.params.id));
  if (!agent) {
    throw { status: 404, code: "AGENT_NOT_FOUND", message: "Agent not found" };
  }
  return successResponse(res, agent);
}));

// ── GET /api/reviews ────────────────────────────────────────────────────
router.get("/reviews", asyncHelper(async (_req, res) => {
  return successResponse(res, reviews);
}));

// ── GET /api/services ───────────────────────────────────────────────────
router.get("/services", asyncHelper(async (req, res) => {
  const { category, location, minBudget, maxBudget } = req.query;
  let filtered = [...services];

  if (category) {
    filtered = filtered.filter((s) => s.category === category);
  }
  if (minBudget) {
    filtered = filtered.filter((s) => s.maxBudget >= parseInt(minBudget));
  }
  if (maxBudget) {
    filtered = filtered.filter((s) => s.minBudget <= parseInt(maxBudget));
  }

  return successResponse(res, filtered);
}));

module.exports = router;
