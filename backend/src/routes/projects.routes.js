const express = require("express");
const router = express.Router();
const { projects, bookings, monthlyData, milestones, dailyLogs, pwdRates, boqItems, expenses, contractors, contracts, raBills, raBillItems, workers, attendance, materialRates, materialInventory, purchaseOrders, materialLogs, projectPhases, projectCompliance, complianceRules, projectComplianceItems, suppliers } = require("../data/sampleData");
const { validateSchema } = require("../middleware/validation.middleware");
const { successResponse } = require("../utils/response");
const { query, get, run, withTransaction } = require("../db/mysql");
const { getScaleConfig, hasFeature } = require("../config/scaleFeatures");
const {
  toAmount,
  roundAmount,
  normalizeStatus,
  isValidDate,
  calculateRABill,
  canTransition,
  labelForStatus
} = require("../services/raBilling.service");

const asyncHelper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper to determine active user from headers/query
function getActiveUserId(req) {
  const hId = req.headers["x-user-id"];
  if (hId) return parseInt(hId);
  if (req.query.userId) return parseInt(req.query.userId);
  return 1; // Default fallback to small builder
}

async function recordAudit(req, projectId, eventType, entityType, entityId, details = {}, database = { run }) {
  await database.run(
    "INSERT INTO audit_events (project_id, user_id, event_type, entity_type, entity_id, old_value, new_value, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [projectId, getActiveUserId(req), eventType, entityType, entityId || null, JSON.stringify(details.oldValue ?? details.previousStatus ?? null), JSON.stringify(details.newValue ?? details.newStatus ?? null), JSON.stringify(details)]
  );
}

async function requireProjectFeature(req, feature) {
  const user = await get("SELECT builder_scale FROM users WHERE id = ?", [getActiveUserId(req)]);
  const scale = user?.builder_scale || "SMALL";
  if (!hasFeature(scale, feature)) {
    throw { status: 403, code: "FEATURE_NOT_ENABLED", message: `${feature} is not enabled for the ${scale} scale configuration` };
  }
  return getScaleConfig(scale);
}

// ── Validation Schemas ───────────────────────────────────────────────────
const createProjectSchema = {
  name: { type: "string", required: true },
  budget: { type: "number", required: true, positive: true },
  location: { type: "string", required: true },
  area: { type: "number", required: true, positive: true },
  floors: { type: "number", required: true, integer: true, positive: true },
  type: { type: "string", required: true },
  clientName: { type: "string" },
  clientId: { type: "number" },
  builderId: { type: "number" }
};

const updateProjectSchema = {
  status: { type: "string" },
  assignedAgentId: { type: "number" },
  budget: { type: "number", positive: true },
  progress: { type: "number", min: 0, max: 100 },
  spent: { type: "number", min: 0 }
};

const updateMilestoneSchema = {
  milestoneId: { type: "number", required: true, integer: true },
  status: { type: "string", required: true, enum: ["not_started", "in_progress", "completed", "under_review"] }
};

const createLogSchema = {
  workers: { type: "number", required: true, integer: true, min: 0 },
  tasks: { type: "string", required: true },
  weather: { type: "string" },
  equipmentUsed: { type: "string" },
  issues: { type: "string" },
  safetyNotes: { type: "string" },
  progressPercentage: { type: "number", min: 0, max: 100 },
  materialsReceived: { type: "string" },
  cementBags: { type: "number" },
  steelTons: { type: "number" },
  bricks: { type: "number" },
  photos: { type: "array" }
};

const createBoqItemSchema = {
  category: { type: "string", required: true },
  description: { type: "string", required: true },
  unit: { type: "string", required: true },
  quantity: { type: "number", required: true, positive: true },
  rate: { type: "number", required: true, positive: true },
  rateSource: { type: "string", required: true }
};

const updateBoqItemSchema = {
  category: { type: "string" },
  description: { type: "string" },
  unit: { type: "string" },
  quantity: { type: "number", positive: true },
  rate: { type: "number", positive: true },
  rateSource: { type: "string" }
};

const createExpenseSchema = {
  category: { type: "string", required: true },
  type: { type: "string", required: true, enum: ["material", "labour", "contractor", "miscellaneous"] },
  amount: { type: "number", required: true, positive: true },
  description: { type: "string", required: true }
};

const createBillSchema = {
  contractorId: { type: "number", required: true, integer: true },
  billNumber: { type: "string", required: true },
  billingPeriod: { type: "string", required: true },
  workDescription: { type: "string", required: true },
  gstPercent: { type: "number", required: true, min: 0, max: 100 },
  retentionPercent: { type: "number", required: true, min: 0, max: 100 }
};

const addBillItemSchema = {
  boqItemId: { type: "number", required: true, integer: true },
  quantityCompleted: { type: "number", required: true, positive: true },
  rate: { type: "number", required: true, positive: true }
};

const updateBillStatusSchema = {
  status: { type: "string", required: true, enum: ["draft", "submitted", "under_review", "approved", "rejected", "paid"] }
};

const createWorkerSchema = {
  name: { type: "string", required: true },
  workerType: { type: "string", required: true, enum: ["Skilled", "Semi-Skilled", "Unskilled"] },
  skill: { type: "string", required: true },
  contractorId: { type: "number", required: true, integer: true },
  dailyWage: { type: "number", required: true, positive: true }
};

const logAttendanceSchema = {
  date: { type: "string", required: true },
  workerId: { type: "number", required: true, integer: true },
  status: { type: "string", required: true, enum: ["Present", "Absent", "Half-Day"] },
  regularHours: { type: "number", required: true, min: 0, max: 24 },
  overtimeHours: { type: "number", required: true, min: 0, max: 24 }
};

const createPOSchema = {
  material: { type: "string", required: true },
  supplierName: { type: "string", required: true },
  orderedQty: { type: "number", required: true, positive: true },
  rate: { type: "number", required: true, positive: true },
  eta: { type: "string", required: true }
};

const materialLogSchema = {
  material: { type: "string", required: true },
  type: { type: "string", required: true, enum: ["Receipt", "Consumption"] },
  quantity: { type: "number", required: true, positive: true },
  description: { type: "string", required: true }
};

const updatePhaseSchema = {
  status: { type: "string", required: true, enum: ["Not Started", "In Progress", "Completed"] },
  progress: { type: "number", required: true, min: 0, max: 100 },
  delayDays: { type: "number", required: true, min: 0 },
  actualStart: { type: "string" },
  actualEnd: { type: "string" }
};

const updateProjectRisksSchema = {
  monsoonActive: { type: "boolean", required: true },
  materialDelayActive: { type: "boolean", required: true },
  labourShortageActive: { type: "boolean", required: true },
  approvalDelayActive: { type: "boolean", required: true }
};

const createComplianceDocSchema = {
  complianceType: { type: "string", required: true },
  documentName: { type: "string", required: true },
  status: { type: "string", required: true, enum: ["Pending", "Submitted", "Approved", "Expired"] },
  submissionDate: { type: "string" },
  dueDate: { type: "string", required: true },
  documentReference: { type: "string" },
  remarks: { type: "string" }
};

const updateComplianceDocSchema = {
  status: { type: "string", required: true, enum: ["Pending", "Submitted", "Approved", "Expired"] },
  submissionDate: { type: "string" },
  documentReference: { type: "string" },
  remarks: { type: "string" }
};

const createConfigRuleSchema = {
  name: { type: "string", required: true },
  jurisdiction: { type: "string", required: true },
  projectType: { type: "string", required: true },
  applicability: { type: "string", required: true },
  requiredDocument: { type: "string", required: true },
  dueDateRule: { type: "string", required: true }
};

const updateConfigItemSchema = {
  status: { type: "string", required: true, enum: ["Pending", "Submitted", "Approved", "Expired"] },
  submissionDate: { type: "string" },
  documentReference: { type: "string" },
  remarks: { type: "string" },
  linkedDocumentUrl: { type: "string" }
};

// ── GET /api/projects ───────────────────────────────────────────────────
router.get("/projects", asyncHelper(async (req, res) => {
  const userId = getActiveUserId(req);
  const userProjects = await query("SELECT * FROM projects WHERE user_id = ? ORDER BY id DESC", [userId]);
  return successResponse(res, userProjects);
}));

// ── GET /api/projects/stats ─────────────────────────────────────────────
router.get("/projects/stats", asyncHelper(async (req, res) => {
  const userId = getActiveUserId(req);
  const userProjects = await query("SELECT * FROM projects WHERE user_id = ?", [userId]);

  const active = userProjects.filter((p) => p.status === "in_progress").length;
  const totalBudget = userProjects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0);
  const totalSpent = userProjects.reduce((s, p) => s + (parseFloat(p.spent) || 0), 0);
  const delayed = userProjects.filter((p) => p.status === "on_hold").length;
  const completed = userProjects.filter((p) => p.status === "completed").length;
  const planning = userProjects.filter((p) => p.status === "planning").length;

  return successResponse(res, {
    activeProjects: active,
    totalBudget,
    totalSpent,
    budgetUsage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    // RA Billing routes managed in ra-billing.routes.js
    delayedProjects: delayed,
    completedProjects: completed,
    planningProjects: planning,
    totalProjects: userProjects.length,
  });
}));

// ── GET /api/projects/:id ───────────────────────────────────────────────
router.get("/projects/:id", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }
  return successResponse(res, project);
}));

// ── POST /api/projects ──────────────────────────────────────────────────
router.post("/projects", validateSchema(createProjectSchema), asyncHelper(async (req, res) => {
  const userId = getActiveUserId(req);
  const user = await get("SELECT * FROM users WHERE id = ?", [userId]);
  
  if (!user) {
    throw { status: 404, code: "USER_NOT_FOUND", message: "User profile not found" };
  }

  // Check Builder Scale tier project limit
  const countRow = await get("SELECT COUNT(*) as count FROM projects WHERE user_id = ?", [userId]);
  const currentCount = countRow ? countRow.count : 0;
  
  const scale = user.builder_scale || "SMALL";
  const scaleConfig = getScaleConfig(scale);
  if (scaleConfig.maxProjects !== null && currentCount >= scaleConfig.maxProjects) {
    throw { 
      status: 403, 
      code: "SCALE_LIMIT_EXCEEDED", 
      message: "Small Scale Builder limit reached (Max 2 active projects). Please upgrade to Mid or Large Scale to add more projects." 
    };
  } else if (scale === "MID" && currentCount >= 10) {
    throw { 
      status: 403, 
      code: "SCALE_LIMIT_EXCEEDED", 
      message: "Mid Scale Builder limit reached (Max 10 active projects). Please upgrade to Large Scale to add more projects." 
    };
  }

  const { name, clientName, budget, location, area, floors, type } = req.body;
  const cName = clientName || name || "Client";

  const result = await run(`
    INSERT INTO projects (user_id, name, client_name, budget, spent, location, area, floors, type, status, progress, start_date, risk_level, scale)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 'planning', 0, ?, 'low', ?)
  `, [userId, name, cName, parseFloat(budget), location || "Default Location", parseFloat(area), parseInt(floors), type || "residential", new Date().toISOString().split("T")[0], scale]);

  const newProject = await get("SELECT * FROM projects WHERE id = ?", [result.lastInsertRowid]);
  await recordAudit(req, result.lastInsertRowid, "PROJECT_CREATED", "project", result.lastInsertRowid, { scale });
  return successResponse(res, newProject, 201);
}));

// ── PUT /api/projects/:id ───────────────────────────────────────────────
router.put("/projects/:id", validateSchema(updateProjectSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  const newBudget = req.body.budget !== undefined ? parseFloat(req.body.budget) : project.budget;
  const newSpent = req.body.spent !== undefined ? parseFloat(req.body.spent) : project.spent;
  const newProgress = req.body.progress !== undefined ? parseFloat(req.body.progress) : project.progress;
  const newStatus = req.body.status || project.status;

  await run(`
    UPDATE projects 
    SET budget = ?, spent = ?, progress = ?, status = ?
    WHERE id = ?
  `, [newBudget, newSpent, newProgress, newStatus, projectId]);

  const updatedProject = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  return successResponse(res, updatedProject);
}));

// ── GET /api/bookings ───────────────────────────────────────────────────
router.get("/bookings", asyncHelper(async (_req, res) => {
  return successResponse(res, bookings);
}));

// ── GET /api/monthly-data ───────────────────────────────────────────────
router.get("/monthly-data", asyncHelper(async (_req, res) => {
  return successResponse(res, monthlyData);
}));

// ── GET /api/projects/:id/milestones ─────────────────────────────────────
router.get("/projects/:id/milestones", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const list = milestones.filter(m => m.projectId === projectId);
  return successResponse(res, list);
}));

// ── PUT /api/projects/:id/milestones ─────────────────────────────────────
router.put("/projects/:id/milestones", validateSchema(updateMilestoneSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { milestoneId, status, remarks, date } = req.body;
  const mIdx = milestones.findIndex(m => m.projectId === projectId && m.id === parseInt(milestoneId));
  if (mIdx === -1) {
    throw { status: 404, code: "MILESTONE_NOT_FOUND", message: "Milestone not found for this project" };
  }

  milestones[mIdx] = {
    ...milestones[mIdx],
    status: status || milestones[mIdx].status,
    remarks: remarks !== undefined ? remarks : milestones[mIdx].remarks,
    date: date !== undefined ? date : milestones[mIdx].date,
  };

  // Auto-calculate project progress based on completed milestones
  const projMilestones = milestones.filter(m => m.projectId === projectId);
  if (projMilestones.length > 0) {
    const completedCount = projMilestones.filter(m => m.status === "completed").length;
    const progress = Math.round((completedCount / projMilestones.length) * 100);

    const pIdx = projects.findIndex(p => p.id === projectId);
    if (pIdx !== -1) {
      projects[pIdx].progress = progress;
      if (progress === 100) {
        projects[pIdx].status = "completed";
      }
    }
  }

  return successResponse(res, milestones[mIdx]);
}));

// ── GET /api/projects/:id/logs ───────────────────────────────────────────
router.get("/projects/:id/logs", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { date } = req.query;

  let sql = "SELECT * FROM daily_logs WHERE project_id = ?";
  let params = [projectId];

  if (date) {
    sql += " AND date = ?";
    params.push(date);
  }

  sql += " ORDER BY date DESC, id DESC";

  const rows = await query(sql, params);
  const list = rows.map(log => ({
    ...log,
    cementBags: log.cement_bags,
    steelTons: log.steel_tons,
    equipmentUsed: log.equipment_used,
    safetyNotes: log.safety_notes,
    progressPercentage: log.progress_percentage,
    materialsReceived: log.materials_received,
    photos: typeof log.photos === "string" ? JSON.parse(log.photos || "[]") : (log.photos || [])
  }));

  return successResponse(res, list);
}));

// ── POST /api/projects/:id/logs ──────────────────────────────────────────
router.post("/projects/:id/logs", validateSchema(createLogSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = getActiveUserId(req);

  const { 
    date, workers, tasks, cementBags = 0, steelTons = 0, bricks = 0,
    weather, equipmentUsed, issues, safetyNotes, progressPercentage = 0,
    materialsReceived = "", photos = []
  } = req.body;

  const logDate = date || new Date().toISOString().split("T")[0];
  const numWorkers = parseInt(workers) || 0;
  const numCement = parseInt(cementBags) || 0;
  const numSteel = parseFloat(steelTons) || 0.0;
  const numBricks = parseInt(bricks) || 0;
  const numProgress = parseFloat(progressPercentage) || 0;

  // Insert Daily Log into MySQL DB
  const result = await run(`
    INSERT INTO daily_logs 
    (project_id, user_id, date, workers, tasks, weather, equipment_used, issues, safety_notes, progress_percentage, materials_received, cement_bags, steel_tons, bricks, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    projectId,
    userId,
    logDate,
    numWorkers,
    tasks || "",
    weather || "",
    equipmentUsed || "",
    issues || "",
    safetyNotes || "",
    numProgress,
    materialsReceived || "",
    numCement,
    numSteel,
    numBricks,
    JSON.stringify(photos)
  ]);

  // Auto-calculate project actual spent & progress increments
  const materialCost = numCement * 420 + numSteel * 65000 + numBricks * 8;
  const laborCost = numWorkers * 800;
  const totalCost = materialCost + laborCost;

  const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (project) {
    const updatedSpent = (parseFloat(project.spent) || 0) + totalCost;
    const updatedProgress = Math.min(100, (parseFloat(project.progress) || 0) + numProgress);
    const updatedStatus = updatedProgress === 100 ? "completed" : project.status;

    run(`
      UPDATE projects
      SET spent = ?, progress = ?, status = ?
      WHERE id = ?
    `, [updatedSpent, updatedProgress, updatedStatus, projectId]);
  }

  const insertedLog = get("SELECT * FROM daily_logs WHERE id = ?", [result.lastInsertRowid]);
  const formattedLog = {
    ...insertedLog,
    cementBags: insertedLog.cement_bags,
    steelTons: insertedLog.steel_tons,
    equipmentUsed: insertedLog.equipment_used,
    safetyNotes: insertedLog.safety_notes,
    progressPercentage: insertedLog.progress_percentage,
    materialsReceived: insertedLog.materials_received,
    photos: JSON.parse(insertedLog.photos || "[]")
  };

  return successResponse(res, formattedLog, 201);
}));

// ── GET /api/projects/:id/boq ────────────────────────────────────────────
router.get("/projects/:id/boq", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const items = boqItems.filter(item => item.projectId === projectId);

  // Group by category and compute summary aggregates
  const categoryGroups = {};
  let grandTotal = 0;
  let materialSubtotal = 0;
  let labourSubtotal = 0;
  let otherSubtotal = 0;

  items.forEach(item => {
    const amount = Number(item.quantity) * Number(item.rate);
    item.amount = Math.round(amount * 100) / 100;
    
    // Grouping
    if (!categoryGroups[item.category]) {
      categoryGroups[item.category] = {
        category: item.category,
        items: [],
        subtotal: 0
      };
    }
    categoryGroups[item.category].items.push(item);
    categoryGroups[item.category].subtotal += item.amount;
    grandTotal += item.amount;

    // Sub-segmentation rules (Material vs Labor vs Other)
    const descLower = (item.description || "").toLowerCase();
    const catLower = (item.category || "").toLowerCase();

    if (descLower.includes("labor") || descLower.includes("labour") || descLower.includes("workman") || catLower.includes("labor")) {
      labourSubtotal += item.amount;
    } else if (
      ["site preparation", "plumbing", "electrical", "miscellaneous"].includes(catLower)
    ) {
      otherSubtotal += item.amount;
    } else {
      // Split 70% material, 30% labor for standard structural tasks if not explicitly split
      materialSubtotal += item.amount * 0.7;
      labourSubtotal += item.amount * 0.3;
    }
  });

  const contingency = Math.round((grandTotal * 0.05) * 100) / 100; // 5% Contingency
  const finalEstimatedCost = Math.round((grandTotal + contingency) * 100) / 100;

  // Retrieve project area to calculate cost/sq.ft.
  const project = projects.find(p => p.id === projectId);
  const area = project && project.area ? project.area : 1;
  const costPerSqFt = Math.round((finalEstimatedCost / area) * 100) / 100;

  return successResponse(res, {
    items,
    categoryGroups: Object.values(categoryGroups),
    summary: {
      grandTotal: Math.round(grandTotal * 100) / 100,
      materialSubtotal: Math.round(materialSubtotal * 100) / 100,
      labourSubtotal: Math.round(labourSubtotal * 100) / 100,
      otherSubtotal: Math.round(otherSubtotal * 100) / 100,
      contingency,
      finalEstimatedCost,
      costPerSqFt
    }
  });
}));

// ── POST /api/projects/:id/boq ───────────────────────────────────────────
router.post("/projects/:id/boq", validateSchema(createBoqItemSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "boq");
  const { category, description, unit, quantity, rate, rateSource } = req.body;

  const newItem = {
    id: boqItems.length + 1,
    projectId,
    category,
    description,
    unit,
    quantity: parseFloat(quantity),
    rate: parseFloat(rate),
    amount: Math.round((parseFloat(quantity) * parseFloat(rate)) * 100) / 100,
    rateSource
  };

  boqItems.push(newItem);
  await recordAudit(req, projectId, "BOQ_ITEM_CREATED", "boq_item", newItem.id, { amount: newItem.amount });
  return successResponse(res, newItem, 201);
}));

// ── PUT /api/projects/:id/boq/:itemId ────────────────────────────────────
router.put("/projects/:id/boq/:itemId", validateSchema(updateBoqItemSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const itemId = parseInt(req.params.itemId);

  const idx = boqItems.findIndex(item => item.projectId === projectId && item.id === itemId);
  if (idx === -1) {
    throw { status: 404, code: "BOQ_ITEM_NOT_FOUND", message: "BOQ Item not found for this project" };
  }

  const updated = {
    ...boqItems[idx],
    ...req.body
  };

  if (req.body.quantity !== undefined || req.body.rate !== undefined) {
    updated.quantity = parseFloat(updated.quantity);
    updated.rate = parseFloat(updated.rate);
    updated.amount = Math.round((updated.quantity * updated.rate) * 100) / 100;
  }

  boqItems[idx] = updated;
  return successResponse(res, updated);
}));

// ── DELETE /api/projects/:id/boq/:itemId ─────────────────────────────────
router.delete("/projects/:id/boq/:itemId", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const itemId = parseInt(req.params.itemId);

  const idx = boqItems.findIndex(item => item.projectId === projectId && item.id === itemId);
  if (idx === -1) {
    throw { status: 404, code: "BOQ_ITEM_NOT_FOUND", message: "BOQ Item not found for this project" };
  }

  const removed = boqItems.splice(idx, 1);
  return successResponse(res, removed[0]);
}));

// ── GET /api/rates/pwd ───────────────────────────────────────────────────
router.get("/rates/pwd", asyncHelper(async (_req, res) => {
  return successResponse(res, pwdRates);
}));

// ── GET /api/projects/:id/cost-tracking ──────────────────────────────────
router.get("/projects/:id/cost-tracking", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "cost_tracking");
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  // 1. Calculate Estimated Cost from BOQ
  const projectBoqItems = boqItems.filter(item => item.projectId === projectId);
  const estimatedCost = projectBoqItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

  // 2. Fetch Project Expenses and aggregate Actual Costs by Type
  const projExpenses = expenses.filter(e => e.projectId === projectId);
  
  let materialCost = 0;
  let labourCost = 0;
  let contractorCost = 0;
  let miscCost = 0;

  projExpenses.forEach(exp => {
    const amt = Number(exp.amount);
    const typeLower = (exp.type || "").toLowerCase();
    if (typeLower === "material") {
      materialCost += amt;
    } else if (typeLower === "labour" || typeLower === "labor") {
      labourCost += amt;
    } else if (typeLower === "contractor") {
      contractorCost += amt;
    } else {
      miscCost += amt;
    }
  });

  const totalActualCost = materialCost + labourCost + contractorCost + miscCost;

  // 3. Compute Project Variances
  const variance = totalActualCost - estimatedCost;
  const variancePercentage = estimatedCost > 0 ? Math.round((variance / estimatedCost) * 100 * 100) / 100 : 0;

  const budget = Number(project.budget || 0);
  const remainingBudget = Math.max(0, budget - totalActualCost);
  const budgetUtilization = budget > 0 ? Math.round((totalActualCost / budget) * 100 * 100) / 100 : 0;

  // 4. Overrun Alert Logic
  const threshold = project.overrunThreshold !== undefined ? Number(project.overrunThreshold) : 10;
  const alertTriggered = variancePercentage > threshold;
  const alertMessage = alertTriggered 
    ? `Cost Overrun Alert: Actual spending exceeds BOQ estimate by ${variancePercentage.toFixed(1)}% (Threshold: ${threshold}%)`
    : null;

  // 5. Category-level Comparison
  // Pull unique list of categories from both BOQ items and expenses
  const allCategories = Array.from(new Set([
    ...projectBoqItems.map(item => item.category),
    ...projExpenses.map(exp => exp.category)
  ]));

  const categoryComparisons = allCategories.map(cat => {
    const catBoq = projectBoqItems.filter(item => item.category === cat);
    const catEst = catBoq.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    
    const catExp = projExpenses.filter(exp => exp.category === cat);
    const catAct = catExp.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const catVar = catAct - catEst;
    const catVarPct = catEst > 0 ? Math.round((catVar / catEst) * 100 * 100) / 100 : 0;

    return {
      category: cat,
      estimated: Math.round(catEst * 100) / 100,
      actual: Math.round(catAct * 100) / 100,
      variance: Math.round(catVar * 100) / 100,
      variancePercentage: catVarPct
    };
  });

  return successResponse(res, {
    projectId,
    summary: {
      budget,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      labourCost: Math.round(labourCost * 100) / 100,
      contractorCost: Math.round(contractorCost * 100) / 100,
      miscCost: Math.round(miscCost * 100) / 100,
      totalActualCost: Math.round(totalActualCost * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercentage,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
      budgetUtilization,
      overrunThreshold: threshold,
      alertTriggered,
      alertMessage
    },
    categoryComparisons,
    expenses: projExpenses
  });
}));

// ── POST /api/projects/:id/expenses ──────────────────────────────────────
router.post("/projects/:id/expenses", validateSchema(createExpenseSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "cost_tracking");
  const { category, type, amount, description } = req.body;

  const newExpense = {
    id: expenses.length + 1,
    projectId,
    category,
    type,
    amount: parseFloat(amount),
    date: new Date().toISOString().split("T")[0],
    description,
    source: "Manual Entry"
  };

  expenses.push(newExpense);
  await recordAudit(req, projectId, "ACTUAL_COST_RECORDED", "expense", newExpense.id, { amount: newExpense.amount, type });
  return successResponse(res, newExpense, 201);
}));

async function getProjectRecord(projectId) {
  return get("SELECT * FROM projects WHERE id = ?", [projectId]);
}

async function getPersistentBill(projectId, billId) {
  const bill = await get("SELECT * FROM ra_bills WHERE id = ? AND project_id = ?", [billId, projectId]);
  if (!bill) return null;
  const items = await query("SELECT * FROM ra_bill_items WHERE ra_bill_id = ? ORDER BY id", [billId]);
  const deductions = await get("SELECT * FROM ra_deductions WHERE ra_bill_id = ?", [billId]);
  const contractor = bill.contractor_id ? await get("SELECT * FROM contractors WHERE id = ? AND project_id = ?", [bill.contractor_id, projectId]) : null;
  const contract = bill.contract_id ? await get("SELECT * FROM contracts WHERE id = ? AND project_id = ?", [bill.contract_id, projectId]) : null;
  return {
    ...bill,
    status: labelForStatus(bill.status),
    contractor,
    contract,
    contractorName: contractor?.name || "Unknown Contractor",
    contractNumber: contract?.contract_number || "",
    billNumber: bill.bill_number,
    workDescription: bill.work_description,
    date: bill.created_at,
    gstPercent: toAmount(bill.gst_rate),
    retentionPercent: toAmount(bill.retention_percent),
    billingPeriod: `${bill.billing_period_start || bill.period_start || ""} - ${bill.billing_period_end || bill.period_end || ""}`,
    grossAmount: roundAmount(bill.gross_amount),
    netPayable: roundAmount(bill.net_payable),
    items: items.map(item => ({
      ...item,
      boqItemId: item.boq_item_id,
      description: item.description,
      contractQuantity: toAmount(item.contract_quantity),
      quantityCompleted: toAmount(item.current_quantity),
      prevQuantity: toAmount(item.previously_billed_quantity),
      cumulativeQuantity: toAmount(item.cumulative_quantity),
      rate: toAmount(item.contract_rate),
      currentAmount: roundAmount(item.current_amount),
      cumulativeAmount: roundAmount(item.cumulative_amount)
    })),
    deductions: deductions ? {
      retention: roundAmount(deductions.retention),
      advanceRecovery: roundAmount(deductions.advance_recovery),
      penalty: roundAmount(deductions.penalty),
      otherDeduction: roundAmount(deductions.other_deduction),
      gst: roundAmount(deductions.gst),
      taxDeduction: roundAmount(deductions.tax_deduction),
      totalDeduction: roundAmount(deductions.total_deduction)
    } : null
  };
}

async function recalculatePersistentBill(billId) {
  const bill = await get("SELECT * FROM ra_bills WHERE id = ?", [billId]);
  const items = await query("SELECT current_amount AS currentAmount FROM ra_bill_items WHERE ra_bill_id = ?", [billId]);
  const deductions = await get("SELECT * FROM ra_deductions WHERE ra_bill_id = ?", [billId]);
  const contract = await get("SELECT * FROM contracts WHERE id = ?", [bill.contract_id]);
  const grossAmount = roundAmount(items.reduce((sum, item) => sum + toAmount(item.currentAmount), 0));
  const calculated = calculateRABill(items, {
    retention: roundAmount(grossAmount * (toAmount(contract?.retention_percentage ?? bill.retention_percent) / 100)),
    advanceRecovery: deductions?.advance_recovery,
    penalty: deductions?.penalty,
    otherDeduction: deductions?.other_deduction,
    taxDeduction: deductions?.tax_deduction,
    gst: contract?.gst_applicable ? roundAmount(grossAmount * (toAmount(contract.gst_rate) / 100)) : 0
  });
  await run("UPDATE ra_deductions SET retention = ?, gst = ?, total_deduction = ? WHERE ra_bill_id = ?", [calculated.retention, calculated.gst, calculated.totalDeduction, billId]);
  await run("UPDATE ra_bills SET gross_amount = ?, net_payable = ?, retention_percent = ?, gst_applicable = ?, gst_rate = ? WHERE id = ?", [calculated.grossAmount, calculated.netPayable, contract?.retention_percentage || 0, contract?.gst_applicable ? 1 : 0, contract?.gst_rate || 0, billId]);
  return calculated;
}

function buildRABillPdf(bill) {
  const lines = [
    "BuildSmartAI - Running Account Bill",
    `Project: ${bill.project?.name || bill.project_id}`,
    `Contractor: ${bill.contractor?.name || bill.contractorName}`,
    `Contract: ${bill.contractNumber}`,
    `Bill Number: ${bill.bill_number}`,
    `Billing Period: ${bill.billing_period_start} to ${bill.billing_period_end}`,
    "",
    ...bill.items.map(item => `${item.description} | ${item.unit} | Contract ${item.contract_quantity} | Previous ${item.previously_billed_quantity} | Current ${item.current_quantity} | Cumulative ${item.cumulative_quantity} | Rate INR ${item.contract_rate} | Current INR ${item.current_amount} | Cumulative INR ${item.cumulative_amount}`),
    "",
    `Gross Current Bill: INR ${bill.grossAmount.toFixed(2)}`,
    `Retention: INR ${(bill.deductions?.retention || 0).toFixed(2)}`,
    `Advance Recovery: INR ${(bill.deductions?.advanceRecovery || 0).toFixed(2)}`,
    `Penalty: INR ${(bill.deductions?.penalty || 0).toFixed(2)}`,
    `Other Deductions: INR ${(bill.deductions?.otherDeduction || 0).toFixed(2)}`,
    `GST: INR ${(bill.deductions?.gst || 0).toFixed(2)}`,
    `Other Taxes: INR ${(bill.deductions?.taxDeduction || 0).toFixed(2)}`,
    `Net Payable: INR ${bill.netPayable.toFixed(2)}`,
    "Prepared By: BuildSmartAI user",
    `Payment Status: ${bill.status}`
  ];
  const escapePdfText = value => String(value).replace(/[\\()]/g, "\\$&").slice(0, 180);
  const stream = `BT /F1 9 Tf 36 760 Td ${lines.map((line, index) => `(${escapePdfText(line)}) Tj${index < lines.length - 1 ? " 0 -14 Td" : ""}`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, "ascii")); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

// ── Persistent contractor and contract endpoints ───────────────────────
router.get("/projects/:id/contractors", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  return successResponse(res, await query("SELECT * FROM contractors WHERE project_id = ? ORDER BY name", [projectId]));
}));

router.post("/projects/:id/contractors", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { name, companyName, contact, address, gstNumber, panNumber, contractStartDate, contractEndDate, status } = req.body;
  if (!name || (contractStartDate && !isValidDate(contractStartDate)) || (contractEndDate && !isValidDate(contractEndDate))) {
    throw { status: 400, code: "INVALID_CONTRACTOR", message: "Contractor name and valid contract dates are required" };
  }
  if (contractStartDate && contractEndDate && contractStartDate > contractEndDate) {
    throw { status: 400, code: "INVALID_DATE_RANGE", message: "Contract end date must be on or after the start date" };
  }
  const result = await run("INSERT INTO contractors (project_id, name, company_name, contact, address, gst_number, pan_number, contract_start_date, contract_end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [projectId, name.trim(), companyName || null, contact || null, address || null, gstNumber || null, panNumber || null, contractStartDate || null, contractEndDate || null, status || "active"]);
  await recordAudit(req, projectId, "CONTRACTOR_CREATED", "contractor", result.lastInsertRowid, { name });
  return successResponse(res, await get("SELECT * FROM contractors WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.get("/projects/:id/contracts", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const contractsList = await query("SELECT c.*, co.name AS contractor_name FROM contracts c JOIN contractors co ON co.id = c.contractor_id WHERE c.project_id = ? ORDER BY c.contract_date DESC", [projectId]);
  for (const contract of contractsList) {
    contract.boqItems = await query("SELECT * FROM contract_boq_items WHERE contract_id = ? ORDER BY id", [contract.id]);
  }
  return successResponse(res, contractsList);
}));

router.post("/projects/:id/contracts", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { contractorId, contractNumber, contractDate, contractValue, retentionPercentage, gstApplicable, gstRate, status, boqItems: contractItems = [] } = req.body;
  const project = await getProjectRecord(projectId);
  const contractor = await get("SELECT * FROM contractors WHERE id = ? AND project_id = ?", [contractorId, projectId]);
  if (!project || !contractor) throw { status: 400, code: "INVALID_CONTRACTOR_PROJECT", message: "Contractor must belong to the selected project" };
  if (!contractNumber || !isValidDate(contractDate) || toAmount(contractValue) <= 0) throw { status: 400, code: "INVALID_CONTRACT", message: "Contract number, valid date, and positive contract value are required" };
  if (contractItems.some(item => toAmount(item.contractedQuantity) <= 0 || toAmount(item.contractRate) < 0)) throw { status: 400, code: "INVALID_CONTRACT_BOQ", message: "Contract BOQ quantities and rates must be valid" };
  const result = await withTransaction(async transaction => {
    const inserted = await transaction.run("INSERT INTO contracts (project_id, contractor_id, contract_number, contract_date, contract_value, retention_percentage, gst_applicable, gst_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [projectId, contractorId, contractNumber.trim(), contractDate, contractValue, retentionPercentage || 0, gstApplicable ? 1 : 0, gstRate || 0, status || "active"]);
    for (const item of contractItems) {
      const amount = roundAmount(toAmount(item.contractedQuantity) * toAmount(item.contractRate));
      await transaction.run("INSERT INTO contract_boq_items (contract_id, boq_item_id, description, unit, contracted_quantity, contract_rate, contract_amount) VALUES (?, ?, ?, ?, ?, ?, ?)", [inserted.lastInsertRowid, item.boqItemId, item.description, item.unit, item.contractedQuantity, item.contractRate, amount]);
    }
    await recordAudit(req, projectId, "CONTRACT_CREATED", "contract", inserted.lastInsertRowid, { contractNumber }, transaction);
    return inserted;
  });
  return successResponse(res, await get("SELECT * FROM contracts WHERE id = ?", [result.lastInsertRowid]), 201);
}));

// ── Persistent RA bill endpoints ───────────────────────────────────────
router.get("/projects/:id/ra-bills", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "ra_billing");
  const params = [projectId];
  let sql = "SELECT * FROM ra_bills WHERE project_id = ?";
  if (req.query.contractorId) { sql += " AND contractor_id = ?"; params.push(parseInt(req.query.contractorId)); }
  if (req.query.status) { sql += " AND LOWER(status) = ?"; params.push(normalizeStatus(req.query.status)); }
  sql += " ORDER BY id DESC";
  const rows = await query(sql, params);
  const billsList = [];
  for (const row of rows) billsList.push(await getPersistentBill(projectId, row.id));
  const allRows = await query("SELECT * FROM ra_bills WHERE project_id = ?", [projectId]);
  const statusCounts = { draft: 0, submitted: 0, underReview: 0, approved: 0, rejected: 0, paid: 0 };
  let totalBilledAmount = 0;
  let totalPaidAmount = 0;
  for (const row of allRows) {
    const key = normalizeStatus(row.status);
    if (key === "under_review") statusCounts.underReview += 1;
    else if (Object.prototype.hasOwnProperty.call(statusCounts, key)) statusCounts[key] += 1;
    totalBilledAmount += toAmount(row.gross_amount);
    const payments = await query("SELECT amount FROM ra_bill_payments WHERE ra_bill_id = ? AND payment_status = 'completed'", [row.id]);
    totalPaidAmount += payments.reduce((sum, payment) => sum + toAmount(payment.amount), 0);
  }
  const totalNet = allRows.reduce((sum, row) => sum + toAmount(row.net_payable), 0);
  return successResponse(res, {
    bills: billsList,
    summary: {
      ...statusCounts,
      pendingApproval: allRows.filter(row => ["submitted", "under_review"].includes(normalizeStatus(row.status))).reduce((sum, row) => sum + toAmount(row.net_payable), 0),
      approved: allRows.filter(row => normalizeStatus(row.status) === "approved").reduce((sum, row) => sum + toAmount(row.net_payable), 0),
      paid: totalPaidAmount,
      totalPayable: totalNet,
      totalBills: allRows.length,
      totalBilledAmount: roundAmount(totalBilledAmount),
      totalPaidAmount: roundAmount(totalPaidAmount),
      outstandingAmount: roundAmount(Math.max(0, totalNet - totalPaidAmount))
    }
  });
}));

router.post("/projects/:id/ra-bills", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "ra_billing");
  const { contractorId, contractId, billNumber, billingPeriodStart, billingPeriodEnd, workDescription, advanceRecovery = 0, penalty = 0, otherDeduction = 0, taxDeduction = 0 } = req.body;
  const project = await getProjectRecord(projectId);
  const contractor = await get("SELECT * FROM contractors WHERE id = ? AND project_id = ?", [contractorId, projectId]);
  const contract = await get("SELECT * FROM contracts WHERE id = ? AND project_id = ? AND contractor_id = ?", [contractId, projectId, contractorId]);
  if (!project || !contractor || !contract) throw { status: 400, code: "INVALID_BILL_RELATIONSHIP", message: "Project, contractor, and contract must belong together" };
  if (!billNumber || !isValidDate(billingPeriodStart) || !isValidDate(billingPeriodEnd) || billingPeriodStart > billingPeriodEnd) throw { status: 400, code: "INVALID_BILLING_PERIOD", message: "Bill number and a valid billing period are required" };
  for (const value of [advanceRecovery, penalty, otherDeduction, taxDeduction]) if (toAmount(value) < 0) throw { status: 400, code: "NEGATIVE_DEDUCTION", message: "Deductions cannot be negative" };
  const duplicate = await get("SELECT id FROM ra_bills WHERE project_id = ? AND contract_id = ? AND LOWER(bill_number) = LOWER(?)", [projectId, contractId, billNumber.trim()]);
  if (duplicate) throw { status: 400, code: "DUPLICATE_BILL_NUMBER", message: "Bill number already exists within this project and contract" };
  const result = await withTransaction(async transaction => {
    const inserted = await transaction.run("INSERT INTO ra_bills (project_id, contract_id, contractor_id, bill_number, period_start, period_end, billing_period_start, billing_period_end, work_description, retention_percent, gst_applicable, gst_rate, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')", [projectId, contractId, contractorId, billNumber.trim(), billingPeriodStart, billingPeriodEnd, billingPeriodStart, billingPeriodEnd, workDescription || "", contract.retention_percentage, contract.gst_applicable, contract.gst_rate, getActiveUserId(req)]);
    await transaction.run("INSERT INTO ra_deductions (ra_bill_id, advance_recovery, penalty, other_deduction, tax_deduction) VALUES (?, ?, ?, ?, ?)", [inserted.lastInsertRowid, advanceRecovery, penalty, otherDeduction, taxDeduction]);
    await recordAudit(req, projectId, "RA_BILL_CREATED", "ra_bill", inserted.lastInsertRowid, { billNumber: billNumber.trim(), previousStatus: null, newStatus: "Draft" }, transaction);
    return inserted;
  });
  return successResponse(res, await getPersistentBill(projectId, result.lastInsertRowid), 201);
}));

router.post("/projects/:id/ra-bills/:billId/items", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const billId = parseInt(req.params.billId);
  const itemRoleRecord = await get("SELECT role, builder_scale FROM users WHERE id = ?", [getActiveUserId(req)]);
  const itemRole = String(itemRoleRecord?.role || (itemRoleRecord?.builder_scale ? "builder" : "client")).toLowerCase();
  if (!["site_engineer", "project_manager", "admin", "builder"].includes(itemRole)) throw { status: 403, code: "RA_VERIFICATION_ROLE_REQUIRED", message: `Role ${itemRole} cannot verify RA quantities` };
  const bill = await get("SELECT * FROM ra_bills WHERE id = ? AND project_id = ?", [billId, projectId]);
  if (!bill) throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };
  if (normalizeStatus(bill.status) !== "draft") throw { status: 400, code: "BILL_NOT_DRAFT", message: "Only draft bills can be edited" };
  const contractItem = await get("SELECT * FROM contract_boq_items WHERE contract_id = ? AND boq_item_id = ?", [bill.contract_id, req.body.boqItemId]);
  const currentQuantity = toAmount(req.body.currentQuantity ?? req.body.quantityCompleted);
  if (!contractItem) throw { status: 400, code: "BOQ_NOT_IN_CONTRACT", message: "BOQ item is not part of the selected contract" };
  if (currentQuantity <= 0) throw { status: 400, code: "INVALID_QUANTITY", message: "Current executed quantity must be positive" };
  const previousRows = await query("SELECT i.current_quantity FROM ra_bill_items i JOIN ra_bills b ON b.id = i.ra_bill_id WHERE b.contract_id = ? AND i.boq_item_id = ? AND b.id <> ? AND LOWER(b.status) NOT IN ('draft', 'rejected')", [bill.contract_id, req.body.boqItemId, billId]);
  const previousQuantity = previousRows.reduce((sum, row) => sum + toAmount(row.current_quantity), 0);
  const cumulativeQuantity = previousQuantity + currentQuantity;
  if (cumulativeQuantity > toAmount(contractItem.contracted_quantity)) throw { status: 400, code: "QUANTITY_EXCEEDS_CONTRACT", message: `Cumulative quantity ${cumulativeQuantity} exceeds contracted quantity ${contractItem.contracted_quantity}` };
  const currentAmount = roundAmount(currentQuantity * toAmount(contractItem.contract_rate));
  const cumulativeAmount = roundAmount(cumulativeQuantity * toAmount(contractItem.contract_rate));
  const existing = await get("SELECT id FROM ra_bill_items WHERE ra_bill_id = ? AND boq_item_id = ?", [billId, req.body.boqItemId]);
  if (existing) throw { status: 400, code: "DUPLICATE_BILL_ITEM", message: "This BOQ item is already on the draft bill" };
  const result = await run("INSERT INTO ra_bill_items (ra_bill_id, boq_item_id, description, unit, contract_quantity, previously_billed_quantity, current_quantity, cumulative_quantity, contract_rate, current_amount, cumulative_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [billId, contractItem.boq_item_id, contractItem.description, contractItem.unit, contractItem.contracted_quantity, previousQuantity, currentQuantity, cumulativeQuantity, contractItem.contract_rate, currentAmount, cumulativeAmount]);
  await recalculatePersistentBill(billId);
  await recordAudit(req, projectId, "RA_BILL_ITEM_ADDED", "ra_bill_item", result.lastInsertRowid, { currentQuantity, cumulativeQuantity });
  return successResponse(res, await getPersistentBill(projectId, billId), 201);
}));

router.put("/projects/:id/ra-bills/:billId/status", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const billId = parseInt(req.params.billId);
  const nextStatus = normalizeStatus(req.body.status);
  const bill = await get("SELECT * FROM ra_bills WHERE id = ? AND project_id = ?", [billId, projectId]);
  if (!bill) throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };
  if (!canTransition(bill.status, nextStatus)) throw { status: 400, code: "INVALID_STATUS_TRANSITION", message: `Cannot move ${labelForStatus(bill.status)} to ${labelForStatus(nextStatus)}` };
  const roleRecord = await get("SELECT role, builder_scale FROM users WHERE id = ?", [getActiveUserId(req)]);
  const role = String(roleRecord?.role || (roleRecord?.builder_scale ? "builder" : "client")).toLowerCase();
  const roleRules = { submitted: ["site_engineer", "builder", "admin"], under_review: ["project_manager", "builder", "admin"], approved: ["finance", "approver", "builder", "admin"], rejected: ["project_manager", "finance", "approver", "builder", "admin"], paid: ["finance", "admin", "builder"] };
  if (!(roleRules[nextStatus] || []).includes(role)) throw { status: 403, code: "RA_BILL_ROLE_REQUIRED", message: `Role ${role} cannot perform this RA bill action` };
  if (nextStatus === "rejected" && !String(req.body.rejectionReason || "").trim()) throw { status: 400, code: "REJECTION_REASON_REQUIRED", message: "A rejection reason is required" };
  if (nextStatus === "submitted") {
    const itemCount = await get("SELECT COUNT(*) AS count FROM ra_bill_items WHERE ra_bill_id = ?", [billId]);
    if (!itemCount || Number(itemCount.count) === 0) throw { status: 400, code: "EMPTY_RA_BILL", message: "Add at least one completed BOQ item before submission" };
  }
  if (nextStatus === "paid" && (toAmount(req.body.paymentAmount) <= 0 || !req.body.paymentReference || !isValidDate(req.body.paymentDate))) throw { status: 400, code: "PAYMENT_DETAILS_REQUIRED", message: "Payment date, reference, and positive amount are required" };
  const actor = getActiveUserId(req);
  const actorColumn = { submitted: "submitted_by", under_review: "reviewed_by", approved: "approved_by", paid: "paid_by" }[nextStatus];
  const assignments = [`status = ?`, "rejection_reason = ?"];
  const values = [nextStatus, nextStatus === "rejected" ? String(req.body.rejectionReason).trim() : null];
  if (nextStatus === "submitted") { assignments.push("submission_date = ?"); values.push(new Date().toISOString().slice(0, 10)); }
  if (actorColumn) { assignments.push(`${actorColumn} = ?`); values.push(actor); }
  values.push(billId);
  const billAmount = toAmount(bill.net_payable);
  await withTransaction(async transaction => {
    if (nextStatus === "paid") {
      const existingPayment = await transaction.get("SELECT id FROM ra_bill_payments WHERE ra_bill_id = ? AND payment_status = 'completed'", [billId]);
      if (existingPayment) throw { status: 400, code: "DUPLICATE_PAYMENT", message: "This RA bill already has a completed payment" };
    }
    await transaction.run(`UPDATE ra_bills SET ${assignments.join(", ")} WHERE id = ?`, values);
    if (nextStatus === "approved") {
      const existingExpense = await transaction.get("SELECT id FROM expenses WHERE project_id = ? AND source = 'RA Bill' AND description LIKE ?", [projectId, `%${bill.bill_number}%`]);
      if (!existingExpense && billAmount > 0) {
        await transaction.run("INSERT INTO expenses (project_id, category, type, amount, expense_date, description, source) VALUES (?, 'Contractor', 'Contractor', ?, CURRENT_DATE, ?, 'RA Bill')", [projectId, billAmount, `RA Bill Payout: ${bill.bill_number}`]);
      }
      await transaction.run("UPDATE projects SET spent = COALESCE(spent, 0) + ? WHERE id = ?", [billAmount, projectId]);
    }
    await recordAudit(req, projectId, `RA_BILL_${nextStatus.toUpperCase()}`, "ra_bill", billId, { previousStatus: labelForStatus(bill.status), newStatus: labelForStatus(nextStatus), rejectionReason: req.body.rejectionReason || null, approvalComments: req.body.approvalComments || null }, transaction);
    if (nextStatus === "paid") await transaction.run("INSERT INTO ra_bill_payments (ra_bill_id, payment_date, payment_reference, amount, payment_status) VALUES (?, ?, ?, ?, 'completed')", [billId, req.body.paymentDate, req.body.paymentReference, req.body.paymentAmount]);
  });
  if (nextStatus === "approved") {
    const updated = await getPersistentBill(projectId, billId);
    const alreadyLogged = expenses.some(expense => expense.source === "RA Bill" && expense.description.includes(updated.bill_number));
    if (!alreadyLogged && updated.netPayable > 0) expenses.push({ id: expenses.length + 1, projectId, category: "Contractor", type: "Contractor", amount: updated.netPayable, date: new Date().toISOString().slice(0, 10), description: `RA Bill Payout: ${updated.bill_number} (${updated.contractorName})`, source: "RA Bill" });
    const inMemoryProject = projects.find(item => item.id === projectId);
    if (inMemoryProject) inMemoryProject.spent = Number(inMemoryProject.spent || 0) + updated.netPayable;
  }
  return successResponse(res, await getPersistentBill(projectId, billId));
}));

router.get("/projects/:id/ra-bills/:billId/pdf", asyncHelper(async (req, res) => {
  const bill = await getPersistentBill(parseInt(req.params.id), parseInt(req.params.billId));
  if (!bill) throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };
  bill.project = await getProjectRecord(parseInt(req.params.id));
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${bill.bill_number}.pdf"` });
  return res.send(buildRABillPdf(bill));
}));

// ── Legacy array endpoints retained below for non-RA modules ────────────
// ── GET /api/projects/:id/contractors ────────────────────────────────────
router.get("/projects/:id/contractors", asyncHelper(async (_req, res) => {
  return successResponse(res, contractors);
}));

// ── GET /api/projects/:id/ra-bills ───────────────────────────────────────
router.get("/projects/:id/ra-bills", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "ra_billing");
  const { contractorId, status } = req.query;

  let filteredBills = raBills.filter(b => b.projectId === projectId);
  if (contractorId) {
    filteredBills = filteredBills.filter(b => b.contractorId === parseInt(contractorId));
  }
  if (status) {
    filteredBills = filteredBills.filter(b => b.status.toLowerCase() === status.toLowerCase());
  }

  // Enrich bills with calculation fields and contractor info
  const enriched = filteredBills.map(bill => {
    const contr = contractors.find(c => c.id === bill.contractorId) || { name: "Unknown Contractor" };
    const items = raBillItems.filter(item => item.billId === bill.id);
    
    const grossAmount = items.reduce((sum, item) => sum + (Number(item.quantityCompleted) * Number(item.rate)), 0);
    const retentionAmount = Math.round((grossAmount * (bill.retentionPercent / 100)) * 100) / 100;
    const gstAmount = Math.round((grossAmount * (bill.gstPercent / 100)) * 100) / 100;
    const netPayable = Math.round((grossAmount + gstAmount - retentionAmount) * 100) / 100;

    return {
      ...bill,
      contractorName: contr.name,
      grossAmount,
      retentionAmount,
      gstAmount,
      netPayable,
      items
    };
  });

  // Calculate Dashboard Summary Metrics
  let pendingApproval = 0;
  let approved = 0;
  let paid = 0;

  // Aggregate stats across all bills for the project
  const allProjBills = raBills.filter(b => b.projectId === projectId);
  allProjBills.forEach(bill => {
    const items = raBillItems.filter(item => item.billId === bill.id);
    const grossAmount = items.reduce((sum, item) => sum + (Number(item.quantityCompleted) * Number(item.rate)), 0);
    const retentionAmount = grossAmount * (bill.retentionPercent / 100);
    const gstAmount = grossAmount * (bill.gstPercent / 100);
    const netPayable = Math.round((grossAmount + gstAmount - retentionAmount) * 100) / 100;

    const statusLower = (bill.status || "").toLowerCase();
    if (statusLower === "submitted" || statusLower === "under_review") {
      pendingApproval += netPayable;
    } else if (statusLower === "approved") {
      approved += netPayable;
    } else if (statusLower === "paid") {
      paid += netPayable;
    }
  });

  return successResponse(res, {
    bills: enriched,
    summary: {
      pendingApproval: Math.round(pendingApproval * 100) / 100,
      approved: Math.round(approved * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      totalPayable: Math.round(approved * 100) / 100
    }
  });
}));

// ── GET /api/projects/:id/ra-bills/:billId/pdf ────────────────────────────
router.get("/projects/:id/ra-bills/:billId/pdf", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const billId = parseInt(req.params.billId);
  await requireProjectFeature(req, "ra_bill_pdf");

  const bill = raBills.find(item => item.id === billId && item.projectId === projectId);
  if (!bill) {
    throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };
  }

  const items = raBillItems.filter(item => item.billId === bill.id);
  const grossAmount = items.reduce((sum, item) => sum + Number(item.quantityCompleted) * Number(item.rate), 0);
  const retentionAmount = grossAmount * (Number(bill.retentionPercent) / 100);
  const gstAmount = grossAmount * (Number(bill.gstPercent) / 100);
  const netPayable = grossAmount + gstAmount - retentionAmount;
  const contractor = contractors.find(item => item.id === bill.contractorId);
  const lines = [
    "BuildSmart India - Running Account Bill",
    `Bill Number: ${bill.billNumber}`,
    `Billing Period: ${bill.billingPeriod}`,
    `Contractor: ${contractor?.name || "Unknown Contractor"}`,
    "",
    `Gross Amount: INR ${grossAmount.toFixed(2)}`,
    `GST (${bill.gstPercent}%): INR ${gstAmount.toFixed(2)}`,
    `Retention (${bill.retentionPercent}%): INR ${retentionAmount.toFixed(2)}`,
    `Net Payable: INR ${netPayable.toFixed(2)}`,
    `Status: ${bill.status}`
  ];
  const escapePdfText = value => String(value).replace(/[\\()]/g, "\\$&");
  const stream = `BT /F1 12 Tf 50 760 Td ${lines.map((line, index) => `(${escapePdfText(line)}) Tj${index < lines.length - 1 ? " 0 -20 Td" : ""}`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${bill.billNumber}.pdf"` });
  return res.send(Buffer.from(pdf, "ascii"));
}));

// ── POST /api/projects/:id/ra-bills ──────────────────────────────────────
router.post("/projects/:id/ra-bills", validateSchema(createBillSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "ra_billing");
  const { contractorId, billNumber, billingPeriod, workDescription, gstPercent, retentionPercent } = req.body;

  // Check duplicate bill number for the same project/contractor
  const duplicate = raBills.some(b => 
    b.projectId === projectId && 
    b.contractorId === parseInt(contractorId) && 
    b.billNumber.toLowerCase() === billNumber.trim().toLowerCase()
  );
  if (duplicate) {
    throw { status: 400, code: "DUPLICATE_BILL_NUMBER", message: "Bill number already exists for this contractor on this project" };
  }

  const newBill = {
    id: raBills.length + 1,
    projectId,
    contractorId: parseInt(contractorId),
    billNumber: billNumber.trim(),
    billingPeriod,
    workDescription,
    gstPercent: parseFloat(gstPercent),
    retentionPercent: parseFloat(retentionPercent),
    status: "draft",
    date: new Date().toISOString().split("T")[0]
  };

  raBills.push(newBill);
  await recordAudit(req, projectId, "RA_BILL_CREATED", "ra_bill", newBill.id, { billNumber: newBill.billNumber });
  return successResponse(res, newBill, 201);
}));

// ── POST /api/projects/:id/ra-bills/:billId/items ────────────────────────
router.post("/projects/:id/ra-bills/:billId/items", validateSchema(addBillItemSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const billId = parseInt(req.params.billId);
  const { boqItemId, quantityCompleted, rate } = req.body;

  const bill = raBills.find(b => b.id === billId && b.projectId === projectId);
  if (!bill) {
    throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };
  }

  if (bill.status.toLowerCase() !== "draft") {
    throw { status: 400, code: "BILL_NOT_DRAFT", message: "Cannot modify items on non-draft bills" };
  }

  // Retrieve BOQ item to fetch limit constraints
  const boqItem = boqItems.find(item => item.id === parseInt(boqItemId) && item.projectId === projectId);
  if (!boqItem) {
    throw { status: 404, code: "BOQ_ITEM_NOT_FOUND", message: "Project BOQ Item not found" };
  }

  // Calculate cumulative quantity already billed on this item in other non-draft bills
  const prevQty = raBillItems.filter(item => {
    if (item.boqItemId !== parseInt(boqItemId)) return false;
    const parentBill = raBills.find(b => b.id === item.billId);
    return parentBill && parentBill.projectId === projectId && parentBill.id !== billId && ["submitted", "under_review", "approved", "paid"].includes(parentBill.status.toLowerCase());
  }).reduce((sum, item) => sum + Number(item.quantityCompleted), 0);

  const currentQty = parseFloat(quantityCompleted);
  const totalBilledQty = prevQty + currentQty;

  if (totalBilledQty > Number(boqItem.quantity)) {
    throw { 
      status: 400, 
      code: "QUANTITY_EXCEEDS_BOQ", 
      message: `Cumulative billed quantity (${totalBilledQty}) exceeds contract BOQ limit (${boqItem.quantity})` 
    };
  }

  const newItem = {
    id: raBillItems.length + 1,
    billId,
    boqItemId: parseInt(boqItemId),
    quantityCompleted: currentQty,
    rate: parseFloat(rate),
    prevQuantity: prevQty
  };

  raBillItems.push(newItem);
  return successResponse(res, newItem, 201);
}));

// ── PUT /api/projects/:id/ra-bills/:billId/status ────────────────────────
router.put("/projects/:id/ra-bills/:billId/status", validateSchema(updateBillStatusSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  await requireProjectFeature(req, "ra_billing");
  const billId = parseInt(req.params.billId);
  const { status } = req.body;

  const bIdx = raBills.findIndex(b => b.id === billId && b.projectId === projectId);
  if (bIdx === -1) {
    throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };
  }

  const bill = raBills[bIdx];
  const oldStatus = (bill.status || "").toLowerCase();
  const newStatus = status.toLowerCase();

  bill.status = status;
  await recordAudit(req, projectId, "RA_BILL_STATUS_CHANGED", "ra_bill", bill.id, { from: oldStatus, to: newStatus });

  // Cost integration workflow:
  // If transitioned to "Approved" or "Paid", push net payable to actual expenses
  if (["approved", "paid"].includes(newStatus) && !["approved", "paid"].includes(oldStatus)) {
    const items = raBillItems.filter(item => item.billId === bill.id);
    const grossAmount = items.reduce((sum, item) => sum + (Number(item.quantityCompleted) * Number(item.rate)), 0);
    const retentionAmount = grossAmount * (bill.retentionPercent / 100);
    const gstAmount = grossAmount * (bill.gstPercent / 100);
    const netPayable = Math.round((grossAmount + gstAmount - retentionAmount) * 100) / 100;

    // Check if expense is already logged to prevent duplicates
    const alreadyLogged = expenses.some(e => e.projectId === projectId && e.source === "RA Bill" && e.description.includes(bill.billNumber));
    if (!alreadyLogged && netPayable > 0) {
      const contr = contractors.find(c => c.id === bill.contractorId) || { name: "Contractor" };
      // Map to first item's category, or default to Miscellaneous
      const firstItem = items[0];
      const category = firstItem ? (boqItems.find(b => b.id === firstItem.boqItemId)?.category || "Miscellaneous") : "Miscellaneous";

      expenses.push({
        id: expenses.length + 1,
        projectId,
        category,
        type: "Contractor",
        amount: netPayable,
        date: new Date().toISOString().split("T")[0],
        description: `RA Bill Payout: ${bill.billNumber} (${contr.name})`,
        source: "RA Bill"
      });
    }
  }

  return successResponse(res, bill);
}));

// ── GET /api/projects/:id/labour ─────────────────────────────────────────
router.get("/projects/:id/labour", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { contractorId, date, workerType, skill } = req.query;

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7); // "YYYY-MM"

  // 1. Filter project attendance logs
  let filteredAtt = attendance.filter(a => a.projectId === projectId);
  if (date) {
    filteredAtt = filteredAtt.filter(a => a.date === date);
  }
  
  // Enrich attendance logs with worker info
  const enrichedMuster = filteredAtt.map(att => {
    const worker = workers.find(w => w.id === att.workerId) || { name: "Unknown", skill: "Unknown", workerType: "Unknown", contractorId: 0 };
    const contr = contractors.find(c => c.id === worker.contractorId) || { name: "Direct" };
    return {
      ...att,
      workerName: worker.name,
      skill: worker.skill,
      workerType: worker.workerType,
      contractorName: contr.name,
      contractorId: worker.contractorId
    };
  });

  // Apply filters on enriched muster roll
  let resultMuster = enrichedMuster;
  if (contractorId) {
    resultMuster = resultMuster.filter(m => m.contractorId === parseInt(contractorId));
  }
  if (workerType) {
    resultMuster = resultMuster.filter(m => m.workerType.toLowerCase() === workerType.toLowerCase());
  }
  if (skill) {
    resultMuster = resultMuster.filter(m => m.skill.toLowerCase() === skill.toLowerCase());
  }

  // 2. Aggregate dashboard KPI metrics for the project
  const projectLogsAll = attendance.filter(a => a.projectId === projectId);
  
  const presentToday = projectLogsAll.filter(a => a.date === today && ["present", "half-day"].includes(a.status.toLowerCase())).length;
  const absentToday = projectLogsAll.filter(a => a.date === today && a.status.toLowerCase() === "absent").length;
  const totalWorkers = workers.filter(w => w.status === "active").length;

  const labourCostToday = projectLogsAll
    .filter(a => a.date === today)
    .reduce((sum, a) => sum + Number(a.totalWage), 0);

  const labourCostThisMonth = projectLogsAll
    .filter(a => a.date.startsWith(currentMonth))
    .reduce((sum, a) => sum + Number(a.totalWage), 0);

  return successResponse(res, {
    musterRoll: resultMuster,
    summary: {
      totalWorkers,
      presentToday,
      absentToday,
      labourCostToday: Math.round(labourCostToday * 100) / 100,
      labourCostThisMonth: Math.round(labourCostThisMonth * 100) / 100
    }
  });
}));

// ── GET /api/projects/:id/workers ────────────────────────────────────────
router.get("/projects/:id/workers", asyncHelper(async (_req, res) => {
  return successResponse(res, workers.filter(w => w.status === "active"));
}));

// ── POST /api/projects/:id/workers ───────────────────────────────────────
router.post("/projects/:id/workers", validateSchema(createWorkerSchema), asyncHelper(async (req, res) => {
  const { name, workerType, skill, contractorId, dailyWage } = req.body;

  const newWorker = {
    id: workers.length + 1,
    name,
    workerType,
    skill,
    contractorId: parseInt(contractorId),
    dailyWage: parseFloat(dailyWage),
    status: "active"
  };

  workers.push(newWorker);
  return successResponse(res, newWorker, 201);
}));

// ── POST /api/projects/:id/attendance ────────────────────────────────────
router.post("/projects/:id/attendance", validateSchema(logAttendanceSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { date, workerId, status, regularHours, overtimeHours } = req.body;

  const worker = workers.find(w => w.id === parseInt(workerId));
  if (!worker) {
    throw { status: 404, code: "WORKER_NOT_FOUND", message: "Worker not found" };
  }

  // Calculate wages
  const statLower = status.toLowerCase();
  let regularWage = 0;
  if (statLower === "present") {
    regularWage = worker.dailyWage;
  } else if (statLower === "half-day") {
    regularWage = Math.round((worker.dailyWage * 0.5) * 100) / 100;
  }

  const overtimeWage = Math.round(((worker.dailyWage / 8) * parseFloat(overtimeHours) * 1.5) * 100) / 100;
  const totalWage = Math.round((regularWage + overtimeWage) * 100) / 100;

  // Insert or update attendance log
  const existingIdx = attendance.findIndex(a => a.projectId === projectId && a.workerId === worker.id && a.date === date);
  
  const attRecord = {
    id: existingIdx !== -1 ? attendance[existingIdx].id : (attendance.length + 1),
    projectId,
    date,
    workerId: worker.id,
    status,
    regularHours: parseFloat(regularHours),
    overtimeHours: parseFloat(overtimeHours),
    regularWage,
    overtimeWage,
    totalWage
  };

  if (existingIdx !== -1) {
    attendance[existingIdx] = attRecord;
  } else {
    attendance.push(attRecord);
  }

  // Cost integration workflow:
  // Push calculated wages to actual expenses if not already pushed for this worker on this date
  if (totalWage > 0) {
    const expIdx = expenses.findIndex(e => e.projectId === projectId && e.source === "Daily Log" && e.description.includes(worker.name) && e.date === date);
    const expRecord = {
      id: expIdx !== -1 ? expenses[expIdx].id : (expenses.length + 1),
      projectId,
      category: worker.skill || "Miscellaneous",
      type: "Labour",
      amount: totalWage,
      date,
      description: `Labour payout: ${worker.name} (${status} - OT: ${overtimeHours}h)`,
      source: "Daily Log"
    };

    if (expIdx !== -1) {
      expenses[expIdx] = expRecord;
    } else {
      expenses.push(expRecord);
    }
  }

  return successResponse(res, attRecord, 201);
}));

// ── POST /api/projects/:id/material-rates ────────────────────────────────
router.post("/projects/:id/material-rates", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { material, unit, currentRate, date, supplier } = req.body;
  const rate = Number(currentRate);
  if (!material || !unit || !Number.isFinite(rate) || rate < 0 || !isValidDate(date)) {
    throw { status: 400, code: "INVALID_MATERIAL_RATE", message: "Material, unit, non-negative rate, and valid date are required" };
  }
  const previous = materialRates.find(item => item.material.toLowerCase() === material.trim().toLowerCase());
  const newRate = {
    id: materialRates.length + 1,
    projectId,
    material: material.trim(),
    unit,
    rate,
    previousRate: previous ? Number(previous.rate) : 0,
    effectiveDate: date,
    source: supplier || "Manual entry"
  };
  materialRates.unshift(newRate);
  await recordAudit(req, projectId, "MATERIAL_RATE_RECORDED", "material_rate", newRate.id, { material: newRate.material, rate });
  return successResponse(res, newRate, 201);
}));

// ── GET /api/projects/:id/materials ──────────────────────────────────────
router.get("/projects/:id/materials", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const today = new Date().toISOString().split("T")[0];

  // 1. Enrich Material Rates with delta changes
  const enrichedRates = materialRates.map(r => {
    const rateChange = r.rate - r.previousRate;
    const rateChangePercent = r.previousRate > 0 ? Math.round((rateChange / r.previousRate) * 100 * 100) / 100 : 0;
    return {
      ...r,
      rateChange,
      rateChangePercent,
      priceHikeAlert: rateChangePercent >= 10
    };
  });

  // 2. Fetch Project POs and calculate delayed procurement alerts
  const projectPOs = purchaseOrders.filter(po => po.projectId === projectId);
  const enrichedPOs = projectPOs.map(po => {
    const isDelayed = po.status !== "Delivered" && po.eta < today;
    return {
      ...po,
      delayedProcurementAlert: isDelayed
    };
  });

  // 3. Fetch Project Inventory levels and calculate low stock alerts
  // Fetch from in-memory materialInventory
  const projectInv = materialInventory.filter(inv => inv.projectId === projectId);
  const enrichedInv = projectInv.map(inv => {
    const remainingQty = inv.receivedQty - inv.consumedQty;
    const lowStockAlert = remainingQty < (inv.requiredQty * 0.2);
    return {
      ...inv,
      remainingQty,
      lowStockAlert
    };
  });

  // 4. Vendor Comparison list (based on sample data suppliers)
  // Maps materials to suppliers
  const vendorComparison = suppliers.map(s => {
    // Distribute material types amongst the sample suppliers for realism
    let materialType = "Cement";
    if (s.id % 3 === 0) materialType = "Steel";
    else if (s.id % 3 === 1) materialType = "Sand";
    else if (s.id % 5 === 0) materialType = "Aggregate";

    const rateRef = materialRates.find(r => r.material.toLowerCase() === materialType.toLowerCase()) || { rate: 500 };

    return {
      vendorName: s.name,
      material: materialType,
      rate: rateRef.rate,
      availability: s.availScore || 90,
      distance: s.distance || 15,
      lastUpdated: today
    };
  });

  // 5. Aggregate overall alerts
  const lowStockCount = enrichedInv.filter(i => i.lowStockAlert).length;
  const priceHikeCount = enrichedRates.filter(r => r.priceHikeAlert).length;
  const delayedCount = enrichedPOs.filter(po => po.delayedProcurementAlert).length;

  return successResponse(res, {
    materialRates: enrichedRates,
    purchaseOrders: enrichedPOs,
    inventory: enrichedInv,
    vendorComparison,
    logs: materialLogs.filter(log => log.projectId === projectId),
    summary: {
      lowStockCount,
      priceHikeCount,
      delayedCount
    }
  });
}));

// ── POST /api/projects/:id/purchase-orders ────────────────────────────────
router.post("/projects/:id/purchase-orders", validateSchema(createPOSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { material, supplierName, orderedQty, rate, eta } = req.body;

  const newPO = {
    id: purchaseOrders.length + 1,
    projectId,
    material,
    supplierName,
    orderedQty: parseFloat(orderedQty),
    rate: parseFloat(rate),
    amount: Math.round((parseFloat(orderedQty) * parseFloat(rate)) * 100) / 100,
    date: new Date().toISOString().split("T")[0],
    status: "Ordered",
    eta
  };

  purchaseOrders.push(newPO);

  // Automatically update orderedQty in materialInventory for this project
  const invIdx = materialInventory.findIndex(inv => inv.projectId === projectId && inv.material.toLowerCase() === material.toLowerCase());
  if (invIdx !== -1) {
    materialInventory[invIdx].orderedQty += parseFloat(orderedQty);
  }

  // Cost integration workflow:
  // Log PO value to actual project expenses under type "Material"
  // Map category:
  const matLower = material.toLowerCase();
  let category = "Miscellaneous";
  if (matLower === "cement" || matLower === "sand" || matLower === "aggregate") {
    category = "Foundation";
  } else if (matLower === "steel") {
    category = "RCC";
  } else if (matLower === "bricks/blocks") {
    category = "Brick/block work";
  } else if (matLower === "tiles") {
    category = "Flooring";
  } else if (matLower === "paint") {
    category = "Painting";
  } else if (matLower === "electrical materials") {
    category = "Electrical";
  } else if (matLower === "plumbing materials") {
    category = "Plumbing";
  }

  expenses.push({
    id: expenses.length + 1,
    projectId,
    category,
    type: "Material",
    amount: newPO.amount,
    date: newPO.date,
    description: `Material PO: ${material} (${orderedQty} @ ₹${rate}) from ${supplierName}`,
    source: "Purchase Order"
  });

  return successResponse(res, newPO, 201);
}));

// ── POST /api/projects/:id/material-logs ─────────────────────────────────
router.post("/projects/:id/material-logs", validateSchema(materialLogSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { material, type, quantity, description } = req.body;
  const qty = parseFloat(quantity);

  const invIdx = materialInventory.findIndex(inv => inv.projectId === projectId && inv.material.toLowerCase() === material.toLowerCase());
  if (invIdx === -1) {
    throw { status: 404, code: "MATERIAL_NOT_FOUND", message: "Material inventory record not found" };
  }

  const inv = materialInventory[invIdx];

  if (type === "Consumption") {
    const available = inv.receivedQty - inv.consumedQty;
    if (qty > available) {
      throw { status: 400, code: "INSUFFICIENT_STOCK", message: `Cannot consume ${qty} units. Only ${available} units available in stock.` };
    }
    materialInventory[invIdx].consumedQty += qty;
  } else if (type === "Receipt") {
    materialInventory[invIdx].receivedQty += qty;
    // Mark matching purchase order status delivered if applicable
    const poIdx = purchaseOrders.findIndex(po => po.projectId === projectId && po.material.toLowerCase() === material.toLowerCase() && po.status === "Ordered");
    if (poIdx !== -1) {
      purchaseOrders[poIdx].status = "Delivered";
    }
  }

  const logRecord = {
    id: materialLogs.length + 1,
    projectId,
    material,
    type,
    quantity: qty,
    date: new Date().toISOString().split("T")[0],
    description
  };

  materialLogs.push(logRecord);
  return successResponse(res, logRecord, 201);
}));

// Helper to add days to a date string
function addDays(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── GET /api/projects/:id/schedule ───────────────────────────────────────
router.get("/projects/:id/schedule", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  // Get project phases
  const phases = projectPhases.filter(p => p.projectId === projectId);

  // If no phases exist, seed default phases for the project
  if (phases.length === 0) {
    const defaultPhaseNames = [
      "Planning", "Site Preparation", "Excavation", "Foundation", "RCC/Structure",
      "Brickwork", "Plaster", "Electrical", "Plumbing", "Flooring", "Painting",
      "Finishing", "Inspection", "Handover"
    ];
    let currentStart = project.startDate || "2026-01-01";
    defaultPhaseNames.forEach((name, idx) => {
      const duration = name === "RCC/Structure" ? 30 : name === "Foundation" ? 20 : 10;
      const plannedEnd = addDays(currentStart, duration);
      const newP = {
        id: projectPhases.length + 1,
        projectId,
        phaseName: name,
        plannedStart: currentStart,
        plannedEnd,
        actualStart: idx === 0 ? currentStart : "",
        actualEnd: "",
        status: idx === 0 ? "In Progress" : "Not Started",
        dependency: idx === 0 ? "None" : defaultPhaseNames[idx - 1],
        progress: idx === 0 ? 10 : 0,
        delayDays: 0
      };
      projectPhases.push(newP);
      phases.push(newP);
      currentStart = addDays(plannedEnd, 1);
    });
  }

  // Calculate schedule metrics
  const handoverPhase = phases.find(p => p.phaseName === "Handover") || phases[phases.length - 1];
  const plannedCompletion = handoverPhase ? handoverPhase.plannedEnd : project.endDate;

  // Delays from completed phases
  const phaseDelaySum = phases.reduce((sum, p) => sum + (p.delayDays || 0), 0);

  // Delays from active risks
  let riskDelaySum = 0;
  if (project.monsoonActive) riskDelaySum += 15;
  if (project.materialDelayActive) riskDelaySum += 10;
  if (project.labourShortageActive) riskDelaySum += 12;
  if (project.approvalDelayActive) riskDelaySum += 8;

  const overallDelay = phaseDelaySum + riskDelaySum;
  const expectedCompletion = addDays(plannedCompletion, overallDelay);

  // Current, Upcoming, and Delayed Phases
  const currentPhase = phases.find(p => p.status === "In Progress") || phases.find(p => p.status === "Not Started") || phases[phases.length - 1];
  const upcomingPhase = phases.find(p => p.status === "Not Started");
  
  const today = new Date().toISOString().split("T")[0];
  const delayedPhases = phases.filter(p => {
    if (p.delayDays > 0) return true;
    if (p.status === "In Progress" && p.plannedEnd < today) return true;
    return false;
  });

  return successResponse(res, {
    project,
    phases,
    metrics: {
      plannedCompletion,
      expectedCompletion,
      delayDays: overallDelay,
      currentPhase: currentPhase ? currentPhase.phaseName : "None",
      upcomingPhase: upcomingPhase ? upcomingPhase.phaseName : "None",
      delayedPhases: delayedPhases.map(p => p.phaseName)
    }
  });
}));

// ── PUT /api/projects/:id/schedule/phases/:phaseId ───────────────────────
router.post("/projects/:id/schedule/phases/:phaseId", validateSchema(updatePhaseSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const phaseId = parseInt(req.params.phaseId);
  const { status, progress, delayDays, actualStart, actualEnd } = req.body;

  const phaseIdx = projectPhases.findIndex(p => p.projectId === projectId && p.id === phaseId);
  if (phaseIdx === -1) {
    throw { status: 404, code: "PHASE_NOT_FOUND", message: "Project schedule phase not found" };
  }

  projectPhases[phaseIdx] = {
    ...projectPhases[phaseIdx],
    status,
    progress: parseFloat(progress),
    delayDays: parseInt(delayDays) || 0,
    actualStart: actualStart !== undefined ? actualStart : projectPhases[phaseIdx].actualStart,
    actualEnd: actualEnd !== undefined ? actualEnd : projectPhases[phaseIdx].actualEnd
  };

  return successResponse(res, projectPhases[phaseIdx]);
}));

// ── PUT /api/projects/:id/risks ──────────────────────────────────────────
router.put("/projects/:id/risks", validateSchema(updateProjectRisksSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const projIdx = projects.findIndex(p => p.id === projectId);
  if (projIdx === -1) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  const { monsoonActive, materialDelayActive, labourShortageActive, approvalDelayActive } = req.body;

  projects[projIdx] = {
    ...projects[projIdx],
    monsoonActive,
    materialDelayActive,
    labourShortageActive,
    approvalDelayActive
  };

  return successResponse(res, projects[projIdx]);
}));

// ── GET /api/projects/:id/risk-compliance ────────────────────────────────
router.get("/projects/:id/risk-compliance", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  // 1. Evaluate Rule-based Risks
  const activeRisks = [];
  const phases = projectPhases.filter(p => p.projectId === projectId);
  const phaseDelaySum = phases.reduce((sum, p) => sum + (p.delayDays || 0), 0);
  const lowStockItems = materialInventory.filter(inv => inv.projectId === projectId && (inv.receivedQty - inv.consumedQty) < (inv.requiredQty * 0.2));

  // Cost variance calculations
  const boqTotal = boqItems.filter(b => b.projectId === projectId).reduce((sum, b) => sum + (b.quantity * b.rate), 0);
  const spend = project.spent || 0;
  const variance = spend - boqTotal;
  const variancePercent = boqTotal > 0 ? (variance / boqTotal) * 100 : 0;
  const overrunThreshold = project.overrunThreshold || 10;

  const todayStr = new Date().toISOString().split("T")[0];

  // Rule 1: Monsoon / Weather Risk
  if (project.monsoonActive) {
    activeRisks.push({
      id: 1,
      riskType: "Weather Risk",
      severity: "HIGH",
      description: "Active heavy rainfall monsoon period detected. Construction safety hazards elevated.",
      trigger: "Project monsoonActive set to TRUE",
      recommendedAction: "Halt non-critical masonry, reinforce excavation shoring, cover electrical conduits.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 2: Excavation during Heavy Rainfall
  const excavationPhase = phases.find(p => p.phaseName === "Excavation");
  if (project.monsoonActive && excavationPhase && excavationPhase.status === "In Progress") {
    activeRisks.push({
      id: 2,
      riskType: "Excavation Hazard",
      severity: "CRITICAL",
      description: "Active excavation phase during heavy monsoon rains risks soil collapses and water logging.",
      trigger: "Monsoon active during Excavation phase In Progress",
      recommendedAction: "Immediately pause excavation work, drain pits, install temporary structural supports.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 3: Material Procurement Delay
  if (project.materialDelayActive) {
    activeRisks.push({
      id: 3,
      riskType: "Supply Chain Delay",
      severity: "HIGH",
      description: "Supplier delivery delays reported for primary materials.",
      trigger: "Project materialDelayActive set to TRUE",
      recommendedAction: "Expedite backup vendor validation, contact regional buffer warehouses.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 4: Labour Shortage
  if (project.labourShortageActive) {
    activeRisks.push({
      id: 4,
      riskType: "Labour Delay",
      severity: "HIGH",
      description: "Subcontractor labor shortage active. Working crew capacity drops.",
      trigger: "Project labourShortageActive set to TRUE",
      recommendedAction: "Reallocate critical crews to structural works; adjust shift logs.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 5: Milestone Delay
  if (phaseDelaySum > 10) {
    activeRisks.push({
      id: 5,
      riskType: "Schedule Slippage",
      severity: "MEDIUM",
      description: `Project schedule reports cumulative delay of ${phaseDelaySum} days.`,
      trigger: `Total phase delayDays (${phaseDelaySum}) exceeds 10 days`,
      recommendedAction: "Review Gantt path dependencies, crash upcoming flooring or painting phases.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 6: Approval Delay
  if (project.approvalDelayActive) {
    activeRisks.push({
      id: 6,
      riskType: "Regulatory Delay",
      severity: "MEDIUM",
      description: "Local municipal approvals delayed.",
      trigger: "Project approvalDelayActive set to TRUE",
      recommendedAction: "Follow up MCGM/PWD desk clearance, engage liaison officer.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 7: Cost Overrun
  if (variancePercent > overrunThreshold) {
    activeRisks.push({
      id: 7,
      riskType: "Cost Overrun",
      severity: "CRITICAL",
      description: `Project actual spend exceeds estimated budget baseline by ${variancePercent.toFixed(1)}%.`,
      trigger: `Spent variance (${variancePercent.toFixed(1)}%) exceeds project threshold (${overrunThreshold}%)`,
      recommendedAction: "Freeze miscellaneous logs, negotiate PWD rates, audit contractor bills.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Rule 8: Low Material Stock
  if (lowStockItems.length > 0) {
    const materials = lowStockItems.map(i => i.material).join(', ');
    activeRisks.push({
      id: 8,
      riskType: "Material Stockout",
      severity: "MEDIUM",
      description: `Stockout risks detected on: ${materials} (quantity < 20% safety margin).`,
      trigger: `${lowStockItems.length} items flagged low stock`,
      recommendedAction: "Log stock receipts immediately; expedite active Purchase Orders.",
      status: "Active",
      createdAt: todayStr
    });
  }

  // Summary counts
  const activeCount = activeRisks.length;
  const highCount = activeRisks.filter(r => r.severity === "HIGH" || r.severity === "CRITICAL").length;
  const resolvedCount = 3; // Seeded historical resolved risks for realism
  
  // Compliance registry docs
  const complianceDocs = projectCompliance.filter(c => c.projectId === projectId);

  return successResponse(res, {
    activeRisks,
    complianceDocs,
    summary: {
      activeCount,
      highCount,
      resolvedCount,
      compliantCount: complianceDocs.filter(c => c.status === "Approved").length
    }
  });
}));

// ── POST /projects/:id/compliance ────────────────────────────────────
router.post("/projects/:id/compliance", validateSchema(createComplianceDocSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { complianceType, documentName, status, submissionDate, dueDate, documentReference, remarks } = req.body;

  const newDoc = {
    id: projectCompliance.length + 1,
    projectId,
    complianceType,
    documentName,
    status,
    submissionDate: submissionDate || "",
    dueDate,
    documentReference: documentReference || "",
    remarks: remarks || ""
  };

  projectCompliance.push(newDoc);
  return successResponse(res, newDoc, 201);
}));

// ── GET /projects/:id/compliance ────────────────────────────────────────
router.get("/projects/:id/compliance", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const docs = projectCompliance.filter(doc => doc.projectId === projectId);
  return successResponse(res, docs);
}));

// ── PUT /projects/:id/compliance/:docId ──────────────────────────────
router.put("/projects/:id/compliance/:docId", validateSchema(updateComplianceDocSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const docId = parseInt(req.params.docId);
  const { status, submissionDate, documentReference, remarks } = req.body;

  const idx = projectCompliance.findIndex(c => c.projectId === projectId && c.id === docId);
  if (idx === -1) {
    throw { status: 404, code: "DOCUMENT_NOT_FOUND", message: "Compliance document record not found" };
  }

  projectCompliance[idx] = {
    ...projectCompliance[idx],
    status,
    submissionDate: submissionDate !== undefined ? submissionDate : projectCompliance[idx].submissionDate,
    documentReference: documentReference !== undefined ? documentReference : projectCompliance[idx].documentReference,
    remarks: remarks !== undefined ? remarks : projectCompliance[idx].remarks
  };

  return successResponse(res, projectCompliance[idx]);
}));

// ── GET /api/projects/:id/compliance-system ──────────────────────────────
router.get("/projects/:id/compliance-system", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  // Find rules matching project state/jurisdiction or marked "All"
  // Maharashtra projects will seed rules matching "Mumbai" or "Maharashtra"
  const applicableRules = complianceRules.filter(r => 
    r.jurisdiction.toLowerCase() === project.location.toLowerCase() || 
    r.jurisdiction.toLowerCase() === "all"
  );

  // Sync missing project compliance items
  applicableRules.forEach(rule => {
    const exists = projectComplianceItems.some(item => item.projectId === projectId && item.ruleId === rule.id);
    if (!exists) {
      projectComplianceItems.push({
        id: projectComplianceItems.length + 1,
        projectId,
        ruleId: rule.id,
        status: "Pending",
        dueDate: addDays(new Date().toISOString().split("T")[0], 15),
        submissionDate: "",
        documentReference: "",
        remarks: "",
        linkedDocumentUrl: ""
      });
    }
  });

  // Pull items for project and enrich with rule metadata
  const items = projectComplianceItems.filter(it => it.projectId === projectId);
  const enrichedItems = items.map(it => {
    const rule = complianceRules.find(r => r.id === it.ruleId) || {};
    return {
      ...it,
      name: rule.name,
      jurisdiction: rule.jurisdiction,
      projectType: rule.projectType,
      applicability: rule.applicability,
      requiredDocument: rule.requiredDocument,
      dueDateRule: rule.dueDateRule
    };
  });

  // Calculate Metrics
  const today = new Date().toISOString().split("T")[0];
  let pending = 0;
  let dueSoon = 0;
  let overdue = 0;
  let completed = 0;
  let documentsCount = 0;

  const notifications = [];

  enrichedItems.forEach(it => {
    const isApproved = it.status === "Approved";
    
    if (isApproved) {
      completed++;
    } else {
      pending++;
      if (it.dueDate < today) {
        overdue++;
        notifications.push({
          id: `overdue-${it.id}`,
          type: "danger",
          message: `OVERDUE: '${it.name}' was due on ${it.dueDate}.`
        });
      } else {
        // Due soon if within 15 days
        const diffTime = Math.abs(new Date(it.dueDate) - new Date(today));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 15) {
          dueSoon++;
          notifications.push({
            id: `duesoon-${it.id}`,
            type: "warning",
            message: `URGENT: '${it.name}' is due soon on ${it.dueDate}.`
          });
        }
      }
    }

    if (it.documentReference || it.linkedDocumentUrl) {
      documentsCount++;
    }
  });

  return successResponse(res, {
    project,
    complianceItems: enrichedItems,
    notifications,
    summary: {
      totalApplicable: enrichedItems.length,
      pending,
      dueSoon,
      overdue,
      completed,
      documentsCount
    }
  });
}));

// ── PUT /api/projects/:id/compliance-system/items/:itemId ─────────────────
router.put("/api/projects/:id/compliance-system/items/:itemId", validateSchema(updateConfigItemSchema), asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const itemId = parseInt(req.params.itemId);
  const { status, submissionDate, documentReference, remarks, linkedDocumentUrl } = req.body;

  const idx = projectComplianceItems.findIndex(it => it.projectId === projectId && it.id === itemId);
  if (idx === -1) {
    throw { status: 404, code: "ITEM_NOT_FOUND", message: "Project compliance item not found" };
  }

  projectComplianceItems[idx] = {
    ...projectComplianceItems[idx],
    status,
    submissionDate: submissionDate || "",
    documentReference: documentReference || "",
    remarks: remarks || "",
    linkedDocumentUrl: linkedDocumentUrl || ""
  };

  return successResponse(res, projectComplianceItems[idx]);
}));

// ── GET /api/projects/:id/compliance-system/rules ─────────────────────────
router.get("/projects/:id/compliance-system/rules", asyncHelper(async (_req, res) => {
  return successResponse(res, complianceRules);
}));

// ── POST /api/projects/:id/compliance-system/rules ────────────────────────
router.post("/api/projects/:id/compliance-system/rules", validateSchema(createConfigRuleSchema), asyncHelper(async (req, res) => {
  const { name, jurisdiction, projectType, applicability, requiredDocument, dueDateRule } = req.body;

  const newRule = {
    id: complianceRules.length + 1,
    name,
    jurisdiction,
    projectType,
    applicability,
    requiredDocument,
    dueDateRule
  };

  complianceRules.push(newRule);
  return successResponse(res, newRule, 201);
}));

// ── GET /api/projects/:id/workflow ────────────────────────────────────────
router.get("/projects/:id/workflow", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  const projectBoq = boqItems.filter(item => item.projectId === projectId);
  const projectExpenses = expenses.filter(expense => expense.projectId === projectId);
  const projectBills = raBills.filter(bill => bill.projectId === projectId);
  const estimatedCost = projectBoq.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0);
  const actualCost = projectExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const hasApprovedBill = projectBills.some(bill => ["approved", "paid"].includes(String(bill.status).toLowerCase()));
  const hasPaidBill = projectBills.some(bill => String(bill.status).toLowerCase() === "paid");
  const hasWork = Number(project.progress || 0) > 0 || dailyLogs.some(log => log.projectId === projectId);

  const stages = [
    { key: "project", label: "Project", status: project ? "completed" : "pending", evidence: { projectId } },
    { key: "boq", label: "BOQ", status: projectBoq.length ? "completed" : "pending", evidence: { itemCount: projectBoq.length } },
    { key: "estimated_cost", label: "Estimated Cost", status: estimatedCost > 0 ? "completed" : "pending", evidence: { amount: estimatedCost } },
    { key: "contractor_contract", label: "Contractor / Contract", status: contracts.some(contract => contract.projectId === projectId) ? "completed" : "pending", evidence: {} },
    { key: "work_completed", label: "Work Completed", status: hasWork ? "completed" : "pending", evidence: { progress: Number(project.progress || 0) } },
    { key: "ra_bill", label: "RA Bill", status: projectBills.length ? "completed" : "pending", evidence: { count: projectBills.length } },
    { key: "ra_bill_verification", label: "RA Bill Verification", status: projectBills.some(bill => ["under_review", "approved", "paid"].includes(String(bill.status).toLowerCase())) ? "completed" : "pending", evidence: {} },
    { key: "ra_bill_approval", label: "RA Bill Approval", status: hasApprovedBill ? "completed" : "pending", evidence: {} },
    { key: "payment", label: "Payment", status: hasPaidBill ? "completed" : "pending", evidence: {} },
    { key: "actual_cost", label: "Actual Cost", status: actualCost > 0 ? "completed" : "pending", evidence: { amount: actualCost } },
    { key: "estimated_vs_actual", label: "Estimated vs Actual", status: estimatedCost > 0 && actualCost > 0 ? "completed" : "pending", evidence: { estimatedCost, actualCost, variance: actualCost - estimatedCost } },
    { key: "budget_variance", label: "Budget Variance", status: "completed", evidence: { budget: Number(project.budget || 0), variance: actualCost - Number(project.budget || 0) } },
    { key: "risk_alert", label: "Risk / Alert", status: actualCost > Number(project.budget || 0) ? "attention" : "clear", evidence: { overBudget: actualCost > Number(project.budget || 0) } },
    { key: "dashboard", label: "Dashboard", status: "available", evidence: { route: `/projects/${projectId}/dashboard-data` } }
  ];

  return successResponse(res, { projectId, scale: project.scale || "SMALL", stages, calculatedAt: new Date().toISOString() });
}));

// ── GET /api/projects/:id/audit-history ───────────────────────────────────
router.get("/projects/:id/audit-history", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const events = await query("SELECT * FROM audit_events WHERE project_id = ? ORDER BY created_at DESC, id DESC", [projectId]);
  return successResponse(res, events.map(event => ({
    ...event,
    details: typeof event.details === "string" ? JSON.parse(event.details || "{}") : event.details
  })));
}));

// ── GET /api/projects/:id/dashboard-data ──────────────────────────────────
router.get("/projects/:id/dashboard-data", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  const overrunThreshold = project.overrunThreshold || 10;
  const today = new Date().toISOString().split("T")[0];

  // 1. Cost Control Data
  const boqList = boqItems.filter(b => b.projectId === projectId);
  const boqTotal = boqList.reduce((sum, b) => sum + (b.quantity * b.rate), 0);
  const spent = project.spent || 0;
  const variance = spent - boqTotal;
  const variancePercent = boqTotal > 0 ? (variance / boqTotal) * 100 : 0;

  // Recent project expenses
  const recentExpenses = expenses
    .filter(e => e.projectId === projectId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Top cost overruns by category
  // Group actual expenses by category
  const actualByCategory = {};
  expenses.filter(e => e.projectId === projectId).forEach(e => {
    actualByCategory[e.category] = (actualByCategory[e.category] || 0) + e.amount;
  });
  // Group BOQ estimate by category
  const estimatedByCategory = {};
  boqList.forEach(b => {
    estimatedByCategory[b.category] = (estimatedByCategory[b.category] || 0) + (b.quantity * b.rate);
  });

  const categoryComparisons = Object.keys({ ...actualByCategory, ...estimatedByCategory }).map(cat => {
    const est = estimatedByCategory[cat] || 0;
    const act = actualByCategory[cat] || 0;
    const diff = act - est;
    const diffPercent = est > 0 ? (diff / est) * 100 : 0;
    return {
      category: cat,
      estimated: est,
      actual: act,
      variance: diff,
      variancePercent: diffPercent
    };
  });
  const topOverruns = categoryComparisons
    .filter(c => c.variance > 0)
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 3);

  // 2. Schedule Data
  const phases = projectPhases.filter(p => p.projectId === projectId);
  const phaseDelaySum = phases.reduce((sum, p) => sum + (p.delayDays || 0), 0);
  let riskDelaySum = 0;
  if (project.monsoonActive) riskDelaySum += 15;
  if (project.materialDelayActive) riskDelaySum += 10;
  if (project.labourShortageActive) riskDelaySum += 12;
  if (project.approvalDelayActive) riskDelaySum += 8;

  const overallDelay = phaseDelaySum + riskDelaySum;
  const handoverPhase = phases.find(p => p.phaseName === "Handover") || phases[phases.length - 1];
  const plannedCompletion = handoverPhase ? handoverPhase.plannedEnd : project.endDate;
  const expectedCompletion = addDays(plannedCompletion, overallDelay);

  const currentPhase = phases.find(p => p.status === "In Progress") || phases.find(p => p.status === "Not Started") || handoverPhase;
  const delayedPhasesCount = phases.filter(p => p.delayDays > 0 || (p.status === "In Progress" && p.plannedEnd < today)).length;

  // 3. Site Logs Data
  const pLogs = dailyLogs.filter(l => l.projectId === projectId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestLog = pLogs[0] || {};
  
  const todayLabour = latestLog.workers || 0;
  const todayProgress = latestLog.progressPercentage || 0;
  const materialsConsumedText = latestLog.tasks ? `Cement: ${latestLog.cementBags || 0} bags, Steel: ${latestLog.steelTons || 0} tons, Bricks: ${latestLog.bricks || 0}` : "None";

  // 4. Finance (RA Bills) Data
  const bills = raBills.filter(b => b.projectId === projectId);
  const pendingBills = bills.filter(b => ["Draft", "Submitted", "Under Review"].includes(b.status));
  const approvedBills = bills.filter(b => ["Approved", "Paid"].includes(b.status));
  
  const pendingAmount = pendingBills.reduce((sum, b) => sum + (b.netPayable || 0), 0);
  const approvedAmount = approvedBills.reduce((sum, b) => sum + (b.netPayable || 0), 0);

  // 5. Compliance Alerts
  // Pull applicable rules matching location
  const applicableRules = complianceRules.filter(r => 
    r.jurisdiction.toLowerCase() === project.location.toLowerCase() || 
    r.jurisdiction.toLowerCase() === "all"
  );
  const compItems = projectComplianceItems.filter(it => it.projectId === projectId);
  
  let complianceOverdue = 0;
  let complianceDueSoon = 0;
  compItems.forEach(it => {
    if (it.status !== "Approved") {
      if (it.dueDate < today) {
        complianceOverdue++;
      } else {
        const diffTime = Math.abs(new Date(it.dueDate) - new Date(today));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 15) {
          complianceDueSoon++;
        }
      }
    }
  });

  // 6. Build Alerts Matrix
  const alertsList = [];
  if (variancePercent > overrunThreshold) {
    alertsList.push({
      type: "Cost",
      severity: "CRITICAL",
      message: `Project spend exceeds baseline estimate by ${variancePercent.toFixed(1)}%.`
    });
  }
  if (overallDelay > 0) {
    alertsList.push({
      type: "Schedule",
      severity: "HIGH",
      message: `Critical path delayed by ${overallDelay} days. Expected completion: ${expectedCompletion}.`
    });
  }
  const lowStockItems = materialInventory.filter(inv => inv.projectId === projectId && (inv.receivedQty - inv.consumedQty) < (inv.requiredQty * 0.2));
  if (lowStockItems.length > 0) {
    alertsList.push({
      type: "Material",
      severity: "MEDIUM",
      message: `Low stock detected on ${lowStockItems.length} materials (${lowStockItems.map(i => i.material).join(', ')}).`
    });
  }
  if (project.labourShortageActive) {
    alertsList.push({
      type: "Labour",
      severity: "HIGH",
      message: "Subcontractor labor shortage logged. Working crew capacity drops."
    });
  }
  if (complianceOverdue > 0) {
    alertsList.push({
      type: "Compliance",
      severity: "CRITICAL",
      message: `${complianceOverdue} compliance certificates/document permits are OVERDUE.`
    });
  } else if (complianceDueSoon > 0) {
    alertsList.push({
      type: "Compliance",
      severity: "MEDIUM",
      message: `${complianceDueSoon} compliance certificates are due within 15 days.`
    });
  }

  return successResponse(res, {
    project,
    overview: {
      budget: project.budget,
      spent,
      remaining: project.budget - spent,
      variance,
      progress: project.progress,
      expectedCompletion
    },
    costControl: {
      variancePercent,
      topOverruns,
      recentExpenses,
      chartData: categoryComparisons
    },
    schedule: {
      plannedCompletion,
      expectedCompletion,
      delayDays: overallDelay,
      currentPhase: currentPhase ? currentPhase.phaseName : "None",
      delayedPhasesCount
    },
    site: {
      todayLabour,
      todayProgress,
      materialsConsumedText
    },
    finance: {
      pendingBillsCount: pendingBills.length,
      pendingAmount,
      approvedAmount,
      totalBillsCount: bills.length
    },
    alerts: alertsList
  });
}));

// Centralized Segment Feature Matrix Configuration
const segmentFeatures = {
  "Large Developer": [
    "/dashboard",
    "/dashboard/cost-estimator",
    "/dashboard/cost-prediction",
    "/dashboard/time-prediction",
    "/dashboard/resource-allocation",
    "/dashboard/material-sourcing",
    "/dashboard/risk-advisor",
    "/dashboard/daily-logs",
    "/dashboard/project-milestones",
    "/dashboard/ra-billing",
    "/dashboard/muster-roll"
  ],
  "Mid-size Developer": [
    "/dashboard",
    "/dashboard/cost-estimator",
    "/dashboard/material-sourcing",
    "/dashboard/project-milestones",
    "/dashboard/ra-billing"
  ],
  "Small Contractor": [
    "/dashboard",
    "/dashboard/cost-estimator",
    "/dashboard/daily-logs",
    "/dashboard/muster-roll"
  ]
};

// ── GET /api/projects/:id/segment-config ──────────────────────────────────
router.get("/projects/:id/segment-config", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  const segment = project.scaleSegment || "Large Developer";
  const features = segmentFeatures[segment] || segmentFeatures["Large Developer"];

  return successResponse(res, {
    projectId,
    scaleSegment: segment,
    features,
    featureMatrix: segmentFeatures
  });
}));

// ── POST /api/projects/:id/segment-config ─────────────────────────────────
router.post("/projects/:id/segment-config", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  }

  const { scaleSegment } = req.body;
  if (!segmentFeatures[scaleSegment]) {
    throw { status: 400, code: "INVALID_SEGMENT", message: "Invalid scale segment type" };
  }

  project.scaleSegment = scaleSegment;
  const features = segmentFeatures[scaleSegment];

  return successResponse(res, {
    projectId,
    scaleSegment,
    features
  });
}));

module.exports = router;
