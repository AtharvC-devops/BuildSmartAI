const express = require("express");
const router = express.Router();
const { projects: sampleProjects, expenses, purchaseOrders, complianceRules, projectComplianceItems, raBills: sampleBills, raBillItems: sampleBillItems } = require("../data/sampleData");
const { get, query } = require("../db/mysql");
const { successResponse } = require("../utils/response");

const asyncHelper = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function activeUserId(req) {
  return parseInt(req.headers["x-user-id"] || req.query.userId || 1, 10);
}

async function requireLargePermission(req, permissions = []) {
  const user = await get("SELECT role, builder_scale FROM users WHERE id = ?", [activeUserId(req)]);
  const role = String(user?.role || (user?.builder_scale ? "builder" : "client")).toLowerCase();
  if (user?.builder_scale !== "LARGE") throw { status: 403, code: "LARGE_SCALE_REQUIRED", message: "This portfolio capability is available to Large Developer accounts" };
  if (permissions.length && !permissions.includes(role)) throw { status: 403, code: "PERMISSION_REQUIRED", message: `Role ${role} cannot access this capability` };
  return { user, role };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvResponse(res, filename, headers, rows) {
  const csv = [headers, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` });
  return res.send(csv);
}

async function portfolioProjects(req) {
  const userId = activeUserId(req);
  let rows = await query("SELECT * FROM projects WHERE user_id = ? ORDER BY id DESC", [userId]);
  if (!rows.length) rows = sampleProjects.filter(project => project.builderId === userId);
  return rows;
}

async function projectMetrics(project) {
  const projectId = project.id;
  const boq = sampleProjects.some(item => item.id === projectId) ? require("../data/sampleData").boqItems.filter(item => item.projectId === projectId) : [];
  const projectExpenses = expenses.filter(item => item.projectId === projectId);
  const estimatedCost = boq.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
  const actualCost = projectExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) || Number(project.spent || 0);
  const projectBills = await query("SELECT * FROM ra_bills WHERE project_id = ?", [projectId]);
  const bills = projectBills.length ? projectBills : sampleBills.filter(item => item.projectId === projectId);
  const paidAmount = projectBills.length ? (await query("SELECT COALESCE(SUM(amount), 0) AS total FROM ra_bill_payments p JOIN ra_bills b ON b.id = p.ra_bill_id WHERE b.project_id = ? AND p.payment_status = 'completed'", [projectId]))[0]?.total || 0 : 0;
  const approvedBills = bills.filter(bill => ["approved", "paid", "Approved", "Paid"].includes(bill.status));
  const pendingBills = bills.filter(bill => ["submitted", "under_review", "Submitted", "Under Review"].includes(bill.status));
  const committedCost = purchaseOrders.filter(item => item.projectId === projectId).reduce((sum, item) => sum + Number(item.amount || (item.orderedQty || 0) * (item.rate || 0)), 0);
  const complianceItems = projectComplianceItems.filter(item => item.projectId === projectId);
  const complianceAlerts = complianceItems.filter(item => item.status !== "Approved").length;
  const variance = actualCost - estimatedCost;
  return {
    projectId,
    projectName: project.name,
    location: project.location,
    status: project.status,
    budget: Number(project.budget || 0),
    estimatedCost,
    actualCost,
    committedCost,
    remainingBudget: Number(project.budget || 0) - actualCost,
    variance,
    variancePercentage: estimatedCost ? (variance / estimatedCost) * 100 : 0,
    progress: Number(project.progress || 0),
    totalBills: bills.length,
    approvedBills: approvedBills.length,
    pendingBills: pendingBills.length,
    pendingPayments: approvedBills.filter(bill => !["paid", "Paid"].includes(bill.status)).length,
    paidAmount: Number(paidAmount),
    materialCost: projectExpenses.filter(item => String(item.type).toLowerCase() === "material").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    labourCost: projectExpenses.filter(item => ["labour", "labor"].includes(String(item.type).toLowerCase())).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    complianceAlerts
  };
}

router.get("/portfolio/summary", asyncHelper(async (req, res) => {
  await requireLargePermission(req, ["builder", "admin", "project_manager", "finance"]);
  const projects = await portfolioProjects(req);
  const projectMetricsList = [];
  for (const project of projects) projectMetricsList.push(await projectMetrics(project));
  const sum = key => projectMetricsList.reduce((total, project) => total + Number(project[key] || 0), 0);
  return successResponse(res, {
    totals: {
      totalProjects: projectMetricsList.length,
      activeProjects: projectMetricsList.filter(project => ["in_progress", "planning"].includes(project.status)).length,
      completedProjects: projectMetricsList.filter(project => project.status === "completed").length,
      delayedProjects: projectMetricsList.filter(project => project.status === "on_hold" || project.complianceAlerts > 0).length,
      portfolioBudget: sum("budget"),
      portfolioEstimatedCost: sum("estimatedCost"),
      portfolioActualCost: sum("actualCost"),
      remainingBudget: sum("remainingBudget"),
      portfolioVariance: sum("variance"),
      totalBills: sum("totalBills"),
      pendingRABills: sum("pendingBills"),
      approvedRABills: sum("approvedBills"),
      pendingPayments: sum("pendingPayments"),
      complianceAlerts: sum("complianceAlerts")
    },
    projects: projectMetricsList
  });
}));

router.get("/portfolio/ra-bills", asyncHelper(async (req, res) => {
  await requireLargePermission(req, ["builder", "admin", "finance", "project_manager"]);
  const projects = await portfolioProjects(req);
  const projectIds = projects.map(project => project.id).filter(Number.isInteger);
  if (!projectIds.length) return successResponse(res, []);
  const params = [...projectIds];
  const filters = [`b.project_id IN (${projectIds.map(() => "?").join(",")})`];
  if (req.query.projectId) { filters.push("b.project_id = ?"); params.push(parseInt(req.query.projectId)); }
  if (req.query.contractorId) { filters.push("b.contractor_id = ?"); params.push(parseInt(req.query.contractorId)); }
  if (req.query.status) { filters.push("LOWER(b.status) = ?"); params.push(String(req.query.status).toLowerCase().replace(/\s+/g, "_")); }
  if (req.query.billNumber) { filters.push("LOWER(b.bill_number) LIKE ?"); params.push(`%${String(req.query.billNumber).toLowerCase()}%`); }
  if (req.query.from) { filters.push("COALESCE(b.billing_period_start, b.period_start) >= ?"); params.push(req.query.from); }
  if (req.query.to) { filters.push("COALESCE(b.billing_period_end, b.period_end) <= ?"); params.push(req.query.to); }
  const rows = await query(`SELECT b.*, p.name AS project_name, c.name AS contractor_name FROM ra_bills b JOIN projects p ON p.id = b.project_id LEFT JOIN contractors c ON c.id = b.contractor_id WHERE ${filters.join(" AND ")} ORDER BY b.id DESC`, params);
  return successResponse(res, rows);
}));

router.get("/reports/portfolio.csv", asyncHelper(async (req, res) => {
  await requireLargePermission(req, ["builder", "admin", "project_manager", "finance"]);
  const projects = await portfolioProjects(req);
  const metrics = [];
  for (const project of projects) metrics.push(await projectMetrics(project));
  const headers = ["Project", "Location", "Budget", "Estimated Cost", "Actual Cost", "Committed Cost", "Variance", "Variance %", "Progress", "RA Bills", "Pending Payments", "Compliance Alerts"];
  const rows = metrics.map(project => [project.projectName, project.location, project.budget, project.estimatedCost, project.actualCost, project.committedCost, project.variance, project.variancePercentage.toFixed(2), project.progress, project.totalBills, project.pendingPayments, project.complianceAlerts]);
  return csvResponse(res, "buildsmart-portfolio-report.csv", headers, rows);
}));

router.get("/reports/ra-bills.csv", asyncHelper(async (req, res) => {
  await requireLargePermission(req, ["builder", "admin", "finance", "project_manager"]);
  const projects = await portfolioProjects(req);
  const projectIds = projects.map(project => project.id);
  const rows = await query(`SELECT b.*, p.name AS project_name FROM ra_bills b JOIN projects p ON p.id = b.project_id WHERE b.project_id IN (${projectIds.length ? projectIds.map(() => "?").join(",") : "0"}) ORDER BY b.id DESC`, projectIds);
  const headers = ["Project", "Bill Number", "Contractor ID", "Status", "Gross Amount", "Net Payable", "Submission Date", "Rejection Reason"];
  return csvResponse(res, "buildsmart-ra-bill-report.csv", headers, rows.map(row => [row.project_name, row.bill_number, row.contractor_id, row.status, row.gross_amount, row.net_payable, row.submission_date, row.rejection_reason]));
}));

router.get("/projects/:id/portfolio-detail", asyncHelper(async (req, res) => {
  await requireLargePermission(req, ["builder", "admin", "project_manager", "finance"]);
  const project = (await portfolioProjects(req)).find(item => item.id === parseInt(req.params.id));
  if (!project) throw { status: 404, code: "PROJECT_NOT_FOUND", message: "Project is not in the current portfolio" };
  return successResponse(res, await projectMetrics(project));
}));

module.exports = router;
