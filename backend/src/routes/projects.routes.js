const express = require("express");
const router = express.Router();
const { projects, bookings, monthlyData } = require("../data/sampleData");

// ── GET /api/projects ───────────────────────────────────────────────────
router.get("/projects", (_req, res) => {
  res.json(projects);
});

// ── GET /api/projects/stats ─────────────────────────────────────────────
router.get("/projects/stats", (_req, res) => {
  const active = projects.filter((p) => p.status === "in_progress").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const delayed = projects.filter((p) => p.status === "on_hold").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const planning = projects.filter((p) => p.status === "planning").length;

  res.json({
    activeProjects: active,
    totalBudget,
    totalSpent,
    budgetUsage: Math.round((totalSpent / totalBudget) * 100),
    delayedProjects: delayed,
    completedProjects: completed,
    planningProjects: planning,
    totalProjects: projects.length,
  });
});

// ── GET /api/projects/:id ───────────────────────────────────────────────
router.get("/projects/:id", (req, res) => {
  const project = projects.find((p) => p.id === parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// ── POST /api/projects ──────────────────────────────────────────────────
router.post("/projects", (req, res) => {
  const newProject = {
    id: projects.length + 1,
    ...req.body,
    status: "planning",
    spent: 0,
    progress: 0,
  };
  projects.push(newProject);
  res.status(201).json(newProject);
});

// ── GET /api/bookings ───────────────────────────────────────────────────
router.get("/bookings", (_req, res) => {
  res.json(bookings);
});

// ── GET /api/monthly-data ───────────────────────────────────────────────
router.get("/monthly-data", (_req, res) => {
  res.json(monthlyData);
});

module.exports = router;
