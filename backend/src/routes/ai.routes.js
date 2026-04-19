const express = require("express");
const axios = require("axios");
const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// ── POST /api/predict-cost ──────────────────────────────────────────────
router.post("/predict-cost", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-cost`, req.body);
    res.json(data);
  } catch (err) {
    console.error(`[ERROR] AI service unavailable at ${AI_SERVICE_URL}:`, err.message);
    const { area = 1000, material_quality = 3, location_tier = 2, floors = 1 } = req.body;
    const matMult = [0, 0.7, 0.85, 1.0, 1.3, 1.8][material_quality] || 1;
    const locMult = [0, 1.4, 1.0, 0.7][location_tier] || 1;
    const cost = 1200 * area * matMult * locMult * (1 + 0.15 * (floors - 1));
    res.json({
      predicted_cost: Math.round(cost),
      breakdown: {
        Materials:  Math.round(cost * 0.35),
        Labor:      Math.round(cost * 0.28),
        Foundation: Math.round(cost * 0.10),
        Overhead:   Math.round(cost * 0.08),
        Permits:    Math.round(cost * 0.05),
        Finishing:  Math.round(cost * 0.14),
      },
      confidence: 0.82,
      fallback: true,
    });
  }
});

// ── POST /api/predict-time ──────────────────────────────────────────────
router.post("/predict-time", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-time`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback prediction");
    const { area = 1000, workers = 10, complexity = 3 } = req.body;
    const days = Math.max(Math.round(area * 0.05 * complexity / Math.pow(workers, 0.6)), 30);
    res.json({
      estimated_days: days,
      phases: [
        { name: "Planning & Permits",    days: Math.max(Math.round(days * 0.08), 7),  color: "#6366f1" },
        { name: "Foundation",            days: Math.max(Math.round(days * 0.12), 10), color: "#f59e0b" },
        { name: "Structure & Framing",   days: Math.max(Math.round(days * 0.25), 15), color: "#10b981" },
        { name: "Electrical & Plumbing", days: Math.max(Math.round(days * 0.18), 10), color: "#3b82f6" },
        { name: "Interior Finishing",    days: Math.max(Math.round(days * 0.22), 12), color: "#ec4899" },
        { name: "Final Inspection",      days: Math.max(Math.round(days * 0.08), 5),  color: "#8b5cf6" },
        { name: "Handover",             days: Math.max(Math.round(days * 0.07), 3),  color: "#14b8a6" },
      ],
      confidence: 0.80,
      fallback: true,
    });
  }
});

// ── POST /api/assign-agent ──────────────────────────────────────────────
router.post("/assign-agent", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/allocate-agent`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback allocation");
    const { required_skill, agents = [] } = req.body;
    const rankings = agents
      .map((a) => {
        const distScore = 1 - Math.min(a.distance || 50, 100) / 100;
        const ratScore = (a.rating || 3) / 5;
        const wlScore = 1 - Math.min(a.workload || 5, 10) / 10;
        const skillMatch = (a.skill || "").toLowerCase() === (required_skill || "").toLowerCase() ? 1 : 0.5;
        const score = 0.4 * distScore + 0.3 * ratScore + 0.2 * wlScore + 0.1 * skillMatch;
        return { ...a, score: Math.round(score * 1000) / 1000 };
      })
      .sort((a, b) => b.score - a.score);

    res.json({ rankings, best_agent: rankings[0] || {}, fallback: true });
  }
});

module.exports = router;
