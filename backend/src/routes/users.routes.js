const express = require("express");
const router = express.Router();
const { users, agents, reviews, services } = require("../data/sampleData");

// ── GET /api/users ──────────────────────────────────────────────────────
router.get("/users", (_req, res) => {
  res.json(users);
});

// ── GET /api/users/:id ──────────────────────────────────────────────────
router.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// ── GET /api/agents ─────────────────────────────────────────────────────
router.get("/agents", (_req, res) => {
  res.json(agents);
});

// ── GET /api/agents/:id ─────────────────────────────────────────────────
router.get("/agents/:id", (req, res) => {
  const agent = agents.find((a) => a.id === parseInt(req.params.id));
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

// ── GET /api/reviews ────────────────────────────────────────────────────
router.get("/reviews", (_req, res) => {
  res.json(reviews);
});

// ── GET /api/services ───────────────────────────────────────────────────
router.get("/services", (req, res) => {
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

  res.json(filtered);
});

module.exports = router;
