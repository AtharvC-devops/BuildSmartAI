const express = require("express");
const router = express.Router();
const { projects, bookings, monthlyData, milestones, dailyLogs } = require("../data/sampleData");

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

// ── PUT /api/projects/:id ───────────────────────────────────────────────
router.put("/projects/:id", (req, res) => {
  const projectId = parseInt(req.params.id);
  const index = projects.findIndex((p) => p.id === projectId);
  if (index === -1) return res.status(404).json({ error: "Project not found" });

  const updatedProject = {
    ...projects[index],
    ...req.body,
  };

  if (req.body.assignedAgentId !== undefined) {
    updatedProject.assignedAgentId = req.body.assignedAgentId ? parseInt(req.body.assignedAgentId) : null;
  }
  if (req.body.budget !== undefined) {
    updatedProject.budget = parseInt(req.body.budget);
  }
  if (req.body.progress !== undefined) {
    updatedProject.progress = parseInt(req.body.progress);
  }
  if (req.body.spent !== undefined) {
    updatedProject.spent = parseInt(req.body.spent);
  }

  projects[index] = updatedProject;
  res.json(updatedProject);
});

// ── GET /api/bookings ───────────────────────────────────────────────────
router.get("/bookings", (_req, res) => {
  res.json(bookings);
});

// ── GET /api/monthly-data ───────────────────────────────────────────────
router.get("/monthly-data", (_req, res) => {
  res.json(monthlyData);
});

// ── GET /api/projects/:id/milestones ─────────────────────────────────────
router.get("/projects/:id/milestones", (req, res) => {
  const projectId = parseInt(req.params.id);
  const list = milestones.filter(m => m.projectId === projectId);
  res.json(list);
});

// ── PUT /api/projects/:id/milestones ─────────────────────────────────────
router.put("/projects/:id/milestones", (req, res) => {
  const projectId = parseInt(req.params.id);
  const { milestoneId, status, remarks, date } = req.body;
  const mIdx = milestones.findIndex(m => m.projectId === projectId && m.id === parseInt(milestoneId));
  if (mIdx === -1) return res.status(404).json({ error: "Milestone not found" });

  milestones[mIdx] = {
    ...milestones[mIdx],
    status: status || milestones[mIdx].status,
    remarks: remarks !== undefined ? remarks : milestones[mIdx].remarks,
    date: date !== undefined ? date : milestones[mIdx].date,
  };

  // Auto-calculate project progress based on completed milestones
  const projMilestones = milestones.filter(m => m.projectId === projectId);
  const completedCount = projMilestones.filter(m => m.status === "completed").length;
  const progress = Math.round((completedCount / projMilestones.length) * 100);

  const pIdx = projects.findIndex(p => p.id === projectId);
  if (pIdx !== -1) {
    projects[pIdx].progress = progress;
    if (progress === 100) {
      projects[pIdx].status = "completed";
    }
  }

  res.json(milestones[mIdx]);
});

// ── GET /api/projects/:id/logs ───────────────────────────────────────────
router.get("/projects/:id/logs", (req, res) => {
  const projectId = parseInt(req.params.id);
  const list = dailyLogs.filter(l => l.projectId === projectId);
  res.json(list);
});

// ── POST /api/projects/:id/logs ──────────────────────────────────────────
router.post("/projects/:id/logs", (req, res) => {
  const projectId = parseInt(req.params.id);
  const { date, workers, tasks, cementBags = 0, steelTons = 0, bricks = 0 } = req.body;
  
  const newLog = {
    id: dailyLogs.length + 1,
    projectId,
    date: date || new Date().toISOString().split("T")[0],
    workers: parseInt(workers) || 0,
    tasks: tasks || "",
    cementBags: parseInt(cementBags) || 0,
    steelTons: parseFloat(steelTons) || 0.0,
    bricks: parseInt(bricks) || 0,
  };

  // Auto-update project actual spent budget
  // Cement: ₹420/bag, Steel: ₹65000/ton, Bricks: ₹8/brick, Labor: workers * ₹800/day
  const materialCost = newLog.cementBags * 420 + newLog.steelTons * 65000 + newLog.bricks * 8;
  const laborCost = newLog.workers * 800;
  const totalCost = materialCost + laborCost;

  const pIdx = projects.findIndex(p => p.id === projectId);
  if (pIdx !== -1) {
    projects[pIdx].spent = (projects[pIdx].spent || 0) + totalCost;
  }

  dailyLogs.push(newLog);
  res.status(201).json(newLog);
});

module.exports = router;
