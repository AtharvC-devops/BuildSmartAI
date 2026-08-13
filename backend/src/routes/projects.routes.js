const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { projects, bookings, monthlyData, milestones, dailyLogs } = require("../data/sampleData");
const { JWT_SECRET, authenticateToken, requireRole } = require("../middleware/auth.middleware");

// Optional user extractor helper
function getOptionalUser(req) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// ── GET /api/projects ───────────────────────────────────────────────────
router.get("/projects", (req, res) => {
  const user = getOptionalUser(req);
  if (user) {
    if (user.role === "client") {
      const clientProjects = projects.filter((p) => p.clientId === user.id);
      return res.json(clientProjects);
    }
    if (user.role === "builder") {
      const builderProjects = projects.filter((p) => p.builderId === user.id || p.assignedAgentId);
      return res.json(builderProjects);
    }
  }
  res.json(projects);
});

// ── GET /api/projects/stats ─────────────────────────────────────────────
router.get("/projects/stats", (req, res) => {
  const user = getOptionalUser(req);
  let filteredProjects = projects;
  if (user) {
    if (user.role === "client") {
      filteredProjects = projects.filter((p) => p.clientId === user.id);
    } else if (user.role === "builder") {
      filteredProjects = projects.filter((p) => p.builderId === user.id || p.assignedAgentId);
    }
  }

  const active = filteredProjects.filter((p) => p.status === "in_progress").length;
  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + p.spent, 0);
  const delayed = filteredProjects.filter((p) => p.status === "on_hold").length;
  const completed = filteredProjects.filter((p) => p.status === "completed").length;
  const planning = filteredProjects.filter((p) => p.status === "planning").length;

  res.json({
    activeProjects: active,
    totalBudget,
    totalSpent,
    budgetUsage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    delayedProjects: delayed,
    completedProjects: completed,
    planningProjects: planning,
    totalProjects: filteredProjects.length,
  });
});

// ── GET /api/projects/:id ───────────────────────────────────────────────
router.get("/projects/:id", authenticateToken, (req, res) => {
  const project = projects.find((p) => p.id === parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: "Project not found" });

  // Resource Ownership Check
  if (req.user.role === "client" && project.clientId !== req.user.id) {
    return res.status(403).json({ error: "Access denied. You do not own this project." });
  }
  if (req.user.role === "builder" && project.builderId !== req.user.id && project.assignedAgentId !== req.user.id) {
    return res.status(403).json({ error: "Access denied. You are not assigned to this project." });
  }

  res.json(project);
});

// ── POST /api/projects ──────────────────────────────────────────────────
router.post("/projects", authenticateToken, (req, res) => {
  const isClient = req.user.role === "client";
  const newProject = {
    id: projects.length + 1,
    ...req.body,
    clientId: isClient ? req.user.id : (req.body.clientId || 2),
    clientName: isClient ? req.user.name : (req.body.clientName || "Client"),
    builderId: isClient ? 1 : req.user.id,
    status: req.body.status || "planning",
    spent: 0,
    progress: 0,
  };
  projects.push(newProject);
  res.status(201).json(newProject);
});

// ── PUT /api/projects/:id ───────────────────────────────────────────────
router.put("/projects/:id", authenticateToken, requireRole("builder"), (req, res) => {
  const projectId = parseInt(req.params.id);
  const index = projects.findIndex((p) => p.id === projectId);
  if (index === -1) return res.status(404).json({ error: "Project not found" });

  // Resource Ownership Check for Builder
  if (projects[index].builderId !== req.user.id && projects[index].assignedAgentId !== req.user.id) {
    return res.status(403).json({ error: "Access denied. You do not have permission to modify this project." });
  }

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
router.put("/projects/:id/milestones", authenticateToken, requireRole("builder"), (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  // Ownership Check
  if (project.builderId !== req.user.id && project.assignedAgentId !== req.user.id) {
    return res.status(403).json({ error: "Access denied. You do not have permission to update milestones for this project." });
  }

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
router.post("/projects/:id/logs", authenticateToken, requireRole("builder"), (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  // Ownership Check
  if (project.builderId !== req.user.id && project.assignedAgentId !== req.user.id) {
    return res.status(403).json({ error: "Access denied. You do not have permission to post daily logs for this project." });
  }

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
