const express = require("express");
const router = express.Router();
const { query, get, run, withTransaction } = require("../db/mysql");
const { successResponse } = require("../utils/response");

const asyncHelper = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const userId = req => parseInt(req.headers["x-user-id"] || req.query.userId || 1, 10);
const round = value => Math.round(Number(value || 0) * 100) / 100;
const projectExists = async id => Boolean(await get("SELECT id FROM projects WHERE id = ?", [id]));

router.get("/projects/:id/milestones", asyncHelper(async (req, res) => {
  const rows = await query("SELECT id, phase_name AS name, status, actual_end AS date, reason AS remarks, progress, planned_start AS plannedStart, planned_end AS plannedEnd, delay_days AS delayDays FROM project_phases WHERE project_id = ? ORDER BY id", [parseInt(req.params.id)]);
  return successResponse(res, rows);
}));

router.put("/projects/:id/milestones", asyncHelper(async (req, res) => {
  const { milestoneId, status, progress, delayDays, actualEnd } = req.body;
  const result = await run("UPDATE project_phases SET status = ?, progress = ?, delay_days = ?, actual_end = ? WHERE id = ? AND project_id = ?", [status, progress || 0, delayDays || 0, actualEnd || null, milestoneId, parseInt(req.params.id)]);
  if (!result.affectedRows) throw { status: 404, code: "MILESTONE_NOT_FOUND", message: "Milestone not found" };
  return successResponse(res, await get("SELECT id, phase_name AS name, status, actual_end AS date, reason AS remarks, progress, planned_start AS plannedStart, planned_end AS plannedEnd, delay_days AS delayDays FROM project_phases WHERE id = ?", [milestoneId]));
}));

router.get("/projects/:id/boq", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const [items, project] = await Promise.all([
    query("SELECT * FROM boq_items WHERE project_id = ? ORDER BY id", [projectId]),
    get("SELECT area FROM projects WHERE id = ?", [projectId])
  ]);
  const mapped = items.map(item => ({ ...item, projectId: item.project_id, rateSource: item.rate_source, amount: Number(item.total) }));
  const grandTotal = mapped.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0);
  const categoryGroups = Object.values(mapped.reduce((groups, item) => {
    groups[item.category] ||= { category: item.category, items: [], subtotal: 0 };
    groups[item.category].items.push(item);
    groups[item.category].subtotal += Number(item.quantity) * Number(item.rate);
    return groups;
  }, {}));
  // Cost per sq.ft.: use project area if valid, otherwise return null (frontend renders "N/A")
  const area = project && Number(project.area) > 0 ? Number(project.area) : null;
  const costPerSqFt = area !== null ? round(grandTotal / area) : null;
  // NOTE: boq_items schema has no dedicated cost_type (Material/Labour/Other) column.
  // We do NOT fabricate a split. materialSubtotal/labourSubtotal/otherSubtotal are omitted.
  return successResponse(res, {
    items: mapped,
    categoryGroups,
    summary: {
      grandTotal: round(grandTotal),
      contingency: round(grandTotal * 0.05),
      finalEstimatedCost: round(grandTotal * 1.05),
      costPerSqFt
    }
  });
}));

router.post("/projects/:id/boq", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (!await projectExists(projectId)) throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  const { category, description, unit, quantity, rate, rateSource = "Manually entered rate" } = req.body;
  if (!category || !description || !unit || Number(quantity) <= 0 || Number(rate) < 0) throw { status: 400, code: "INVALID_BOQ_ITEM", message: "BOQ category, description, unit, positive quantity, and non-negative rate are required" };
  const result = await run("INSERT INTO boq_items (project_id, category, description, unit, quantity, rate, rate_source, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [projectId, category, description, unit, quantity, rate, rateSource, Number(quantity) * Number(rate)]);
  return successResponse(res, await get("SELECT * FROM boq_items WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.put("/projects/:id/boq/:itemId", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const itemId = parseInt(req.params.itemId);
  const current = await get("SELECT * FROM boq_items WHERE id = ? AND project_id = ?", [itemId, projectId]);
  if (!current) throw { status: 404, code: "BOQ_ITEM_NOT_FOUND", message: "BOQ item not found" };
  const next = { ...current, ...req.body };
  if (Number(next.quantity) <= 0 || Number(next.rate) < 0) throw { status: 400, code: "INVALID_BOQ_ITEM", message: "Quantity must be positive and rate cannot be negative" };
  await run("UPDATE boq_items SET category = ?, description = ?, unit = ?, quantity = ?, rate = ?, rate_source = ?, total = ?, version = version + 1 WHERE id = ? AND project_id = ?", [next.category, next.description, next.unit, next.quantity, next.rate, next.rateSource || next.rate_source, Number(next.quantity) * Number(next.rate), itemId, projectId]);
  return successResponse(res, await get("SELECT * FROM boq_items WHERE id = ?", [itemId]));
}));

router.delete("/projects/:id/boq/:itemId", asyncHelper(async (req, res) => {
  const result = await run("DELETE FROM boq_items WHERE id = ? AND project_id = ?", [parseInt(req.params.itemId), parseInt(req.params.id)]);
  if (!result.affectedRows) throw { status: 404, code: "BOQ_ITEM_NOT_FOUND", message: "BOQ item not found" };
  return successResponse(res, { id: parseInt(req.params.itemId) });
}));

router.get("/projects/:id/cost-tracking", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!project) throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  const boq = await query("SELECT category, quantity, rate, total FROM boq_items WHERE project_id = ?", [projectId]);
  const projectExpenses = await query("SELECT id, category, type, amount, expense_date AS date, description, source FROM expenses WHERE project_id = ? ORDER BY expense_date DESC, id DESC", [projectId]);
  const estimatedCost = boq.reduce((sum, item) => sum + Number(item.total), 0);
  const byType = type => projectExpenses.filter(item => String(item.type).toLowerCase() === type).reduce((sum, item) => sum + Number(item.amount), 0);
  const totalActualCost = projectExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const variance = totalActualCost - estimatedCost;
  const categoryComparisons = [...new Set([...boq.map(item => item.category), ...projectExpenses.map(item => item.category)])].map(category => {
    const estimated = boq.filter(item => item.category === category).reduce((sum, item) => sum + Number(item.total), 0);
    const actual = projectExpenses.filter(item => item.category === category).reduce((sum, item) => sum + Number(item.amount), 0);
    return { category, estimated: round(estimated), actual: round(actual), variance: round(actual - estimated), variancePercentage: estimated ? round(((actual - estimated) / estimated) * 100) : 0 };
  });
  const variancePercentage = estimatedCost ? round((variance / estimatedCost) * 100) : 0;
  return successResponse(res, { projectId, summary: { budget: Number(project.budget), estimatedCost: round(estimatedCost), materialCost: round(byType("material")), labourCost: round(byType("labour") + byType("labor")), contractorCost: round(byType("contractor")), miscCost: round(byType("miscellaneous")), totalActualCost: round(totalActualCost), variance: round(variance), variancePercentage, remainingBudget: round(Number(project.budget) - totalActualCost), budgetUtilization: project.budget ? round((totalActualCost / Number(project.budget)) * 100) : 0, overrunThreshold: 10, alertTriggered: variancePercentage > 10, alertMessage: variancePercentage > 10 ? `Actual cost exceeds estimate by ${variancePercentage}%` : null }, categoryComparisons, expenses: projectExpenses });
}));

router.post("/projects/:id/expenses", asyncHelper(async (req, res) => {
  const { category, type, amount, description } = req.body;
  if (!category || !type || Number(amount) < 0 || !description) throw { status: 400, code: "INVALID_EXPENSE", message: "Expense category, type, non-negative amount, and description are required" };
  const result = await run("INSERT INTO expenses (project_id, category, type, amount, expense_date, description, source) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, 'Manual Entry')", [parseInt(req.params.id), category, type, amount, description]);
  return successResponse(res, await get("SELECT * FROM expenses WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.get("/projects/:id/logs", asyncHelper(async (req, res) => {
  const rows = await query("SELECT id, project_id AS projectId, log_date AS date, workers, tasks, weather, equipment_used AS equipmentUsed, issues, safety_notes AS safetyNotes, progress_percentage AS progressPercentage, materials_received AS materialsReceived, cement_bags AS cementBags, steel_tons AS steelTons, bricks, photos FROM daily_logs WHERE project_id = ? ORDER BY log_date DESC, id DESC", [parseInt(req.params.id)]);
  return successResponse(res, rows.map(row => ({ ...row, photos: typeof row.photos === "string" ? JSON.parse(row.photos || "[]") : (row.photos || []) })));
}));

router.post("/projects/:id/logs", asyncHelper(async (req, res) => {
  const body = req.body;
  if (!body.date || !body.tasks) throw { status: 400, code: "INVALID_DAILY_LOG", message: "Date and work completed are required" };
  const result = await run("INSERT INTO daily_logs (project_id, user_id, log_date, workers, tasks, weather, equipment_used, issues, safety_notes, progress_percentage, materials_received, cement_bags, steel_tons, bricks, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [parseInt(req.params.id), userId(req), body.date, body.workers || 0, body.tasks, body.weather || null, body.equipmentUsed || null, body.issues || null, body.safetyNotes || null, body.progressPercentage || 0, body.materialsReceived || null, body.cementBags || 0, body.steelTons || 0, body.bricks || 0, JSON.stringify(body.photos || [])]);
  if (Number(body.progressPercentage) > 0) await run("UPDATE projects SET progress = LEAST(100, progress + ?) WHERE id = ?", [body.progressPercentage, parseInt(req.params.id)]);
  return successResponse(res, await get("SELECT id, project_id AS projectId, log_date AS date, workers, tasks, weather, equipment_used AS equipmentUsed, issues, safety_notes AS safetyNotes, progress_percentage AS progressPercentage, materials_received AS materialsReceived, cement_bags AS cementBags, steel_tons AS steelTons, bricks, photos FROM daily_logs WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.get("/projects/:id/workers", asyncHelper(async (req, res) => successResponse(res, await query("SELECT * FROM workers WHERE project_id = ? AND status = 'active' ORDER BY name", [parseInt(req.params.id)]))));
router.post("/projects/:id/workers", asyncHelper(async (req, res) => {
  const { name, workerType = "Daily Wage", skill, contractorId, dailyWage } = req.body;
  if (!name || !skill || Number(dailyWage) < 0) throw { status: 400, code: "INVALID_WORKER", message: "Worker name, skill, and non-negative wage are required" };
  const result = await run("INSERT INTO workers (project_id, name, worker_type, skill, contractor_id, daily_wage) VALUES (?, ?, ?, ?, ?, ?)", [parseInt(req.params.id), name, workerType, skill, contractorId || null, dailyWage]);
  return successResponse(res, await get("SELECT * FROM workers WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.get("/projects/:id/labour", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const rows = await query("SELECT a.*, a.attendance_date AS date, w.name AS workerName, w.worker_type AS workerType, w.skill, w.contractor_id AS contractorId, c.name AS contractorName FROM attendance a JOIN workers w ON w.id = a.worker_id LEFT JOIN contractors c ON c.id = w.contractor_id WHERE a.project_id = ? ORDER BY a.attendance_date DESC", [projectId]);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return successResponse(res, { musterRoll: rows, summary: { totalWorkers: (await query("SELECT COUNT(*) AS count FROM workers WHERE project_id = ? AND status = 'active'", [projectId]))[0].count, presentToday: rows.filter(row => row.date === today && ["Present", "Half-Day"].includes(row.status)).length, absentToday: rows.filter(row => row.date === today && row.status === "Absent").length, labourCostToday: rows.filter(row => row.date === today).reduce((sum, row) => sum + Number(row.total_wage), 0), labourCostThisMonth: rows.filter(row => String(row.date).startsWith(month)).reduce((sum, row) => sum + Number(row.total_wage), 0) } });
}));

router.post("/projects/:id/attendance", asyncHelper(async (req, res) => {
  const entries = Array.isArray(req.body.attendance) ? req.body.attendance : [req.body];
  const projectId = parseInt(req.params.id);
  const result = await withTransaction(async transaction => {
    const saved = [];
    for (const entry of entries) {
      const worker = await transaction.get("SELECT * FROM workers WHERE id = ? AND project_id = ?", [entry.workerId, projectId]);
      if (!worker) throw { status: 404, code: "WORKER_NOT_FOUND", message: "Worker not found for this project" };
      const regularWage = entry.status === "Present" ? Number(worker.daily_wage) : entry.status === "Half-Day" ? Number(worker.daily_wage) * 0.5 : 0;
      const overtimeWage = (Number(worker.daily_wage) / 8) * Number(entry.overtimeHours || 0) * 1.5;
      const totalWage = round(regularWage + overtimeWage);
      await transaction.run("INSERT INTO attendance (project_id, worker_id, attendance_date, status, regular_hours, overtime_hours, regular_wage, overtime_wage, total_wage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), regular_hours=VALUES(regular_hours), overtime_hours=VALUES(overtime_hours), regular_wage=VALUES(regular_wage), overtime_wage=VALUES(overtime_wage), total_wage=VALUES(total_wage)", [projectId, entry.workerId, entry.date, entry.status, entry.regularHours || 0, entry.overtimeHours || 0, regularWage, overtimeWage, totalWage]);
      if (totalWage > 0) await transaction.run("INSERT INTO expenses (project_id, category, type, amount, expense_date, description, source) VALUES (?, ?, 'Labour', ?, ?, ?, 'Daily Log')", [projectId, worker.skill, totalWage, entry.date, `Labour payout: ${worker.name}`]);
      saved.push({ workerId: entry.workerId, totalWage });
    }
    return saved;
  });
  return successResponse(res, result, 201);
}));

router.get("/projects/:id/materials", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const rates = await query("SELECT id, material, supplier, location, unit, current_rate AS rate, previous_rate AS previousRate, effective_date AS effectiveDate, source FROM material_rates WHERE project_id = ? OR project_id IS NULL ORDER BY material, effective_date DESC", [projectId]);
  const inventory = await query("SELECT id, material, unit, required_qty AS requiredQty, ordered_qty AS orderedQty, received_qty AS receivedQty, consumed_qty AS consumedQty, received_qty - consumed_qty AS remainingQty FROM material_inventory WHERE project_id = ?", [projectId]);
  const orders = await query("SELECT id, material, supplier_name AS supplierName, ordered_qty AS orderedQty, rate, amount, order_date AS date, status, eta FROM purchase_orders WHERE project_id = ? ORDER BY id DESC", [projectId]);
  const logs = await query("SELECT id, material, transaction_type AS type, quantity, transaction_date AS date, description FROM material_logs WHERE project_id = ? ORDER BY transaction_date DESC", [projectId]);
  const materialRates = rates.map(rate => ({ ...rate, rateChange: Number(rate.rate) - Number(rate.previousRate), rateChangePercent: Number(rate.previousRate) ? round(((Number(rate.rate) - Number(rate.previousRate)) / Number(rate.previousRate)) * 100) : 0 }));
  return successResponse(res, { materialRates, inventory, purchaseOrders: orders, vendorComparison: [], logs, summary: { lowStockCount: inventory.filter(item => Number(item.remainingQty) < Number(item.requiredQty) * 0.2).length, priceHikeCount: materialRates.filter(item => item.rateChangePercent >= 10).length, delayedCount: orders.filter(item => item.status !== "Delivered" && item.eta && item.eta < new Date().toISOString().slice(0, 10)).length } });
}));

router.post("/projects/:id/material-rates", asyncHelper(async (req, res) => {
  const { material, unit, currentRate, date, supplier, location, source } = req.body;
  const previous = await get("SELECT current_rate FROM material_rates WHERE (project_id = ? OR project_id IS NULL) AND material = ? ORDER BY effective_date DESC LIMIT 1", [parseInt(req.params.id), material]);
  const result = await run("INSERT INTO material_rates (project_id, material, supplier, location, unit, current_rate, previous_rate, effective_date, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [parseInt(req.params.id), material, supplier || null, location || null, unit, currentRate, previous?.current_rate || 0, date, source || "Manual entry"]);
  return successResponse(res, await get("SELECT * FROM material_rates WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.post("/projects/:id/purchase-orders", asyncHelper(async (req, res) => {
  const { material, supplierName, orderedQty, rate, eta } = req.body;
  if (!material || !supplierName || Number(orderedQty) <= 0 || Number(rate) < 0 || !eta) throw { status: 400, code: "INVALID_PURCHASE_ORDER", message: "Material, supplier, positive quantity, rate, and ETA are required" };
  const result = await run("INSERT INTO purchase_orders (project_id, material, supplier_name, ordered_qty, rate, amount, order_date, status, eta) VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 'Ordered', ?)", [parseInt(req.params.id), material, supplierName, orderedQty, rate, Number(orderedQty) * Number(rate), eta]);
  return successResponse(res, await get("SELECT * FROM purchase_orders WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.post("/projects/:id/material-logs", asyncHelper(async (req, res) => {
  const { material, type, quantity, description } = req.body;
  if (!material || !type || Number(quantity) <= 0 || !description) throw { status: 400, code: "INVALID_MATERIAL_LOG", message: "Material, type, positive quantity, and description are required" };
  const result = await run("INSERT INTO material_logs (project_id, material, transaction_type, quantity, transaction_date, description) VALUES (?, ?, ?, ?, CURRENT_DATE, ?)", [parseInt(req.params.id), material, type, quantity, description]);
  return successResponse(res, await get("SELECT * FROM material_logs WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.get("/projects/:id/schedule", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const phases = await query("SELECT id, project_id AS projectId, phase_name AS phaseName, planned_start AS plannedStart, planned_end AS plannedEnd, actual_start AS actualStart, actual_end AS actualEnd, status, dependency, progress, delay_days AS delayDays, reason FROM project_phases WHERE project_id = ? ORDER BY id", [projectId]);
  const delayDays = phases.reduce((sum, phase) => sum + Number(phase.delayDays || 0), 0);
  return successResponse(res, { phases, metrics: { delayDays, currentPhase: phases.find(phase => phase.status === "In Progress")?.phaseName || "None", upcomingPhase: phases.find(phase => phase.status === "Not Started")?.phaseName || "None", delayedPhases: phases.filter(phase => Number(phase.delayDays) > 0).map(phase => phase.phaseName) } });
}));

router.post("/projects/:id/schedule/phases/:phaseId", asyncHelper(async (req, res) => {
  const { status, progress, delayDays, actualStart, actualEnd, reason } = req.body;
  await run("UPDATE project_phases SET status = ?, progress = ?, delay_days = ?, actual_start = ?, actual_end = ?, reason = ? WHERE id = ? AND project_id = ?", [status, progress, delayDays || 0, actualStart || null, actualEnd || null, reason || null, parseInt(req.params.phaseId), parseInt(req.params.id)]);
  return successResponse(res, await get("SELECT * FROM project_phases WHERE id = ?", [parseInt(req.params.phaseId)]));
}));

router.get("/projects/:id/compliance-system", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const items = await query("SELECT i.*, r.name, r.jurisdiction, r.project_type AS projectType, r.applicability, r.required_document AS requiredDocument, r.due_date_rule AS dueDateRule, r.source FROM project_compliance_items i LEFT JOIN compliance_rules r ON r.id = i.rule_id WHERE i.project_id = ? ORDER BY i.due_date", [projectId]);
  const today = new Date().toISOString().slice(0, 10);
  return successResponse(res, { complianceItems: items, notifications: items.filter(item => item.status !== "Approved" && item.due_date && item.due_date < today).map(item => ({ type: "danger", message: `OVERDUE: ${item.requirement || item.name}` })), summary: { totalApplicable: items.length, pending: items.filter(item => item.status === "Pending").length, dueSoon: items.filter(item => item.status !== "Approved" && item.due_date >= today).length, overdue: items.filter(item => item.status !== "Approved" && item.due_date < today).length, completed: items.filter(item => item.status === "Approved").length, documentsCount: items.filter(item => item.document_reference || item.document_url).length } });
}));

router.get("/projects/:id/risk-compliance", asyncHelper(async (req, res) => {
  const items = await query("SELECT id, requirement AS documentName, status, submission_date AS submissionDate, due_date AS dueDate, document_reference AS documentReference, remarks FROM project_compliance_items WHERE project_id = ?", [parseInt(req.params.id)]);
  return successResponse(res, { activeRisks: [], complianceDocs: items, summary: { activeCount: 0, highCount: 0, resolvedCount: 0, compliantCount: items.filter(item => item.status === "Approved").length } });
}));

router.put("/projects/:id/compliance-system/items/:itemId", asyncHelper(async (req, res) => {
  const { status, submissionDate, documentReference, remarks, linkedDocumentUrl } = req.body;
  await run("UPDATE project_compliance_items SET status = ?, submission_date = ?, document_reference = ?, remarks = ?, document_url = ?, last_verified_date = CURRENT_DATE WHERE id = ? AND project_id = ?", [status, submissionDate || null, documentReference || null, remarks || null, linkedDocumentUrl || null, parseInt(req.params.itemId), parseInt(req.params.id)]);
  return successResponse(res, await get("SELECT * FROM project_compliance_items WHERE id = ?", [parseInt(req.params.itemId)]));
}));

router.get("/projects/:id/compliance", asyncHelper(async (req, res) => {
  const rows = await query("SELECT id, project_id AS projectId, requirement AS documentName, status, submission_date AS submissionDate, due_date AS dueDate, document_reference AS documentReference, remarks FROM project_compliance_items WHERE project_id = ? ORDER BY due_date", [parseInt(req.params.id)]);
  return successResponse(res, rows);
}));

router.post("/projects/:id/compliance", asyncHelper(async (req, res) => {
  const { complianceType, documentName, status = "Pending", submissionDate, dueDate, documentReference, remarks } = req.body;
  if (!documentName || !dueDate) throw { status: 400, code: "INVALID_COMPLIANCE", message: "Document name and due date are required" };
  const result = await run("INSERT INTO project_compliance_items (project_id, requirement, status, submission_date, due_date, document_reference, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)", [parseInt(req.params.id), documentName, status, submissionDate || null, dueDate, documentReference || null, remarks || complianceType || null]);
  return successResponse(res, await get("SELECT * FROM project_compliance_items WHERE id = ?", [result.lastInsertRowid]), 201);
}));

router.put("/projects/:id/compliance/:docId", asyncHelper(async (req, res) => {
  const { status, submissionDate, documentReference, remarks } = req.body;
  const result = await run("UPDATE project_compliance_items SET status = ?, submission_date = ?, document_reference = ?, remarks = ?, last_verified_date = CURRENT_DATE WHERE id = ? AND project_id = ?", [status, submissionDate || null, documentReference || null, remarks || null, parseInt(req.params.docId), parseInt(req.params.id)]);
  if (!result.affectedRows) throw { status: 404, code: "DOCUMENT_NOT_FOUND", message: "Compliance document not found" };
  return successResponse(res, await get("SELECT * FROM project_compliance_items WHERE id = ?", [parseInt(req.params.docId)]));
}));

router.get("/projects/:id/dashboard-data", asyncHelper(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!project) throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" };
  const boq = await query("SELECT category, total FROM boq_items WHERE project_id = ?", [projectId]);
  const actual = await query("SELECT category, type, amount, expense_date AS date, description FROM expenses WHERE project_id = ? ORDER BY expense_date DESC", [projectId]);
  const phases = await query("SELECT phase_name AS phaseName, status, progress, delay_days AS delayDays, planned_end AS plannedEnd FROM project_phases WHERE project_id = ? ORDER BY id", [projectId]);
  const logs = await query("SELECT workers, progress_percentage AS progressPercentage, tasks, cement_bags AS cementBags, steel_tons AS steelTons, bricks FROM daily_logs WHERE project_id = ? ORDER BY log_date DESC LIMIT 5", [projectId]);
  const bills = await query("SELECT status, net_payable FROM ra_bills WHERE project_id = ?", [projectId]);
  const estimated = boq.reduce((sum, item) => sum + Number(item.total), 0);
  const spent = actual.reduce((sum, item) => sum + Number(item.amount), 0) || Number(project.spent || 0);
  const categoryNames = [...new Set([...boq.map(item => item.category), ...actual.map(item => item.category)])];
  const chartData = categoryNames.map(category => ({ category, estimated: boq.filter(item => item.category === category).reduce((sum, item) => sum + Number(item.total), 0), actual: actual.filter(item => item.category === category).reduce((sum, item) => sum + Number(item.amount), 0) }));
  return successResponse(res, { project, overview: { budget: Number(project.budget), spent, remaining: Number(project.budget) - spent, variance: spent - estimated, progress: Number(project.progress), expectedCompletion: phases.at(-1)?.plannedEnd || project.expected_completion }, costControl: { variancePercent: estimated ? ((spent - estimated) / estimated) * 100 : 0, chartData, recentExpenses: actual.slice(0, 5), topOverruns: chartData.filter(item => item.actual > item.estimated).sort((a, b) => (b.actual - b.estimated) - (a.actual - a.estimated)).slice(0, 3) }, schedule: { delayDays: phases.reduce((sum, phase) => sum + Number(phase.delayDays || 0), 0), currentPhase: phases.find(phase => phase.status === "In Progress")?.phaseName || "None", delayedPhasesCount: phases.filter(phase => Number(phase.delayDays || 0) > 0).length, plannedCompletion: phases.at(-1)?.plannedEnd }, site: { todayLabour: logs[0]?.workers || 0, todayProgress: logs[0]?.progressPercentage || 0, materialsConsumedText: logs[0] ? `Cement: ${logs[0].cementBags || 0} bags, Steel: ${logs[0].steelTons || 0} tons, Bricks: ${logs[0].bricks || 0}` : "None" }, finance: { pendingBillsCount: bills.filter(bill => ["submitted", "under_review"].includes(String(bill.status).toLowerCase())).length, pendingAmount: bills.filter(bill => ["submitted", "under_review"].includes(String(bill.status).toLowerCase())).reduce((sum, bill) => sum + Number(bill.net_payable), 0), approvedAmount: bills.filter(bill => ["approved", "paid"].includes(String(bill.status).toLowerCase())).reduce((sum, bill) => sum + Number(bill.net_payable), 0), totalBillsCount: bills.length }, alerts: [] });
}));

module.exports = router;
