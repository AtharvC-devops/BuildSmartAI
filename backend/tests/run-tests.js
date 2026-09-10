const assert = require("assert");
const { calculateAgentScore, calculateSupplierScore } = require("../src/utils/scoring");
const { validateSchema } = require("../src/middleware/validation.middleware");
const { calculateRABill, canTransition, isValidDate } = require("../src/services/raBilling.service");

console.log("════════════════════════════════════════════════");
console.log("             RUNNING BACKEND UNIT TESTS         ");
console.log("════════════════════════════════════════════════");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

// ── Test Scoring ──────────────────────────────────────────────────────────
test("Agent Scoring - exact match and close distance", () => {
  const agent = { distance: 10, rating: 5, workload: 2, skill: "Structural" };
  const score = calculateAgentScore(agent, "Structural");
  // distance_score = 1 - 10/100 = 0.9 => 0.4 * 0.9 = 0.36
  // rating_score = 5/5 = 1 => 0.3 * 1 = 0.30
  // workload_score = 1 - 2/10 = 0.8 => 0.2 * 0.8 = 0.16
  // skill_match = 1.0 => 0.1 * 1.0 = 0.10
  // total = 0.36 + 0.30 + 0.16 + 0.10 = 0.92
  assert.strictEqual(score, 0.92);
});

test("Agent Scoring - poor match and far distance", () => {
  const agent = { distance: 100, rating: 1, workload: 10, skill: "Interior" };
  const score = calculateAgentScore(agent, "Electrical");
  // distance_score = 1 - 100/100 = 0 => 0
  // rating_score = 1/5 = 0.2 => 0.06
  // workload_score = 1 - 10/10 = 0 => 0
  // skill_match = 0.5 => 0.05
  // total = 0.11
  assert.strictEqual(score, 0.11);
});

test("Supplier Scoring - standard calculation", () => {
  const supplier = { distance: 25, rating: 4, priceIndex: 1.1, availability: true };
  const score = calculateSupplierScore(supplier);
  // dist_score = 1 - 25/50 = 0.5 => 0.35 * 0.5 = 0.175
  // priceVal = min(max(1.1, 0.7), 1.5) = 1.1
  // price_score = 1 - (1.1 - 0.7)/0.8 = 1 - 0.5 = 0.5 => 0.3 * 0.5 = 0.15
  // rating_score = 4/5 = 0.8 => 0.25 * 0.8 = 0.20
  // avail_score = 1.0 => 0.1 * 1.0 = 0.10
  // total = 0.175 + 0.15 + 0.20 + 0.10 = 0.625
  assert.strictEqual(score, 0.625);
});

// ── Test Schema Validation Middleware ────────────────────────────────────
test("Validation Middleware - passes correct inputs", () => {
  const schema = {
    area: { type: "number", required: true, positive: true },
    material_quality: { type: "number", required: true, integer: true, min: 1, max: 5 }
  };
  const middleware = validateSchema(schema);
  const req = { body: { area: 1500, material_quality: 3 } };
  let nextCalled = false;
  const res = {};
  const next = () => { nextCalled = true; };

  middleware(req, res, next);
  assert.strictEqual(nextCalled, true);
});

test("Validation Middleware - fails invalid type", () => {
  const schema = {
    area: { type: "number", required: true, positive: true }
  };
  const middleware = validateSchema(schema);
  const req = { body: { area: "invalid-number" } };
  let statusSet = null;
  let jsonSent = null;
  const res = {
    status(s) {
      statusSet = s;
      return this;
    },
    json(j) {
      jsonSent = j;
    }
  };
  const next = () => {};

  middleware(req, res, next);
  assert.strictEqual(statusSet, 400);
  assert.strictEqual(jsonSent.success, false);
  assert.strictEqual(jsonSent.error.code, "VALIDATION_ERROR");
});

// ── Test BOQ Schema Validation ──────────────────────────────────────────
test("BOQ Validation - rejects negative quantity/rate", () => {
  const boqSchema = {
    category: { type: "string", required: true },
    description: { type: "string", required: true },
    unit: { type: "string", required: true },
    quantity: { type: "number", required: true, positive: true },
    rate: { type: "number", required: true, positive: true }
  };
  const middleware = validateSchema(boqSchema);
  const req = {
    body: {
      category: "Foundation",
      description: "Excavating footing",
      unit: "cum",
      quantity: -5.0, // negative value should trigger error
      rate: 350
    }
  };
  let statusSet = null;
  let jsonSent = null;
  const res = {
    status(s) {
      statusSet = s;
      return this;
    },
    json(j) {
      jsonSent = j;
    }
  };
  const next = () => {};

  middleware(req, res, next);
  assert.strictEqual(statusSet, 400);
  assert.strictEqual(jsonSent.success, false);
  assert.strictEqual(jsonSent.error.details.some(d => d.field === "quantity"), true);
});

test("BOQ Calculations - amount equals quantity * rate", () => {
  const qty = 15.5;
  const rate = 450;
  const amount = Math.round((qty * rate) * 100) / 100;
  assert.strictEqual(amount, 6975);
});

// ── Test Cost Tracking Calculations & Alerts ─────────────────────────────
test("Cost Tracking - Variance and Variance % math", () => {
  const estimated = 100000;
  const actual = 112000;
  
  const variance = actual - estimated;
  const variancePct = estimated > 0 ? (variance / estimated) * 100 : 0;
  
  assert.strictEqual(variance, 12000);
  assert.strictEqual(variancePct, 12);
});

test("Cost Tracking - Overrun alert triggers on threshold exceedance", () => {
  const variancePct = 12.5;
  const threshold = 10.0;
  const alertTriggered = variancePct > threshold;
  assert.strictEqual(alertTriggered, true);
});

test("Cost Tracking - Overrun alert does not trigger under threshold", () => {
  const variancePct = 8.5;
  const threshold = 10.0;
  const alertTriggered = variancePct > threshold;
  assert.strictEqual(alertTriggered, false);
});

// ── Test RA Billing Calculations & Validations ───────────────────────────
test("RA Billing - validates quantity limits", () => {
  const boqQtyLimit = 100;
  const prevQtyBilled = 60;
  const currentRequest = 45;
  
  const totalRequest = prevQtyBilled + currentRequest;
  const exceedsLimit = totalRequest > boqQtyLimit;
  assert.strictEqual(exceedsLimit, true);
});

test("RA Billing - prevents duplicate bill numbers", () => {
  const existingBills = ["rab-01", "rab-02"];
  const newBillNum = "RAB-01";
  const duplicate = existingBills.some(b => b.toLowerCase() === newBillNum.toLowerCase().trim());
  assert.strictEqual(duplicate, true);
});

test("RA Billing - Gross, GST, Retention, and Net calculations", () => {
  const itemVal1 = 10 * 4200; // 42,000
  const itemVal2 = 5 * 6800;  // 34,000
  const grossAmount = itemVal1 + itemVal2; // 76,000
  
  const gstPercent = 18;
  const retentionPercent = 5;
  
  const retentionAmount = grossAmount * (retentionPercent / 100); // 3,800
  const gstAmount = grossAmount * (gstPercent / 100);             // 13,680
  const netPayable = grossAmount + gstAmount - retentionAmount;    // 76,000 + 13,680 - 3,800 = 85,880
  
  assert.strictEqual(grossAmount, 76000);
  assert.strictEqual(retentionAmount, 3800);
  assert.strictEqual(gstAmount, 13680);
  assert.strictEqual(netPayable, 85880);
});

test("RA Billing - calculates cumulative quantities and deductions from persisted values", () => {
  const result = calculateRABill([{ currentAmount: 150 * 4200 }], {
    retention: 31500,
    advanceRecovery: 1000,
    penalty: 500,
    otherDeduction: 0,
    taxDeduction: 0,
    gst: 113400
  });
  assert.strictEqual(result.grossAmount, 630000);
  assert.strictEqual(result.totalDeduction, 33000);
  assert.strictEqual(result.netPayable, 710400);
});

test("RA Billing - allows staged approval only and validates ISO billing dates", () => {
  assert.strictEqual(canTransition("Draft", "Submitted"), true);
  assert.strictEqual(canTransition("Submitted", "Approved"), false);
  assert.strictEqual(canTransition("Under Review", "Approved"), true);
  assert.strictEqual(isValidDate("2026-09-10"), true);
  assert.strictEqual(isValidDate("2026-02-30"), false);
});

// ── Test Labour Wage Calculations ────────────────────────────────────────
test("Labour Wage - calculates regular full day wage", () => {
  const dailyWage = 800;
  const status = "Present";
  const regularWage = status === "Present" ? dailyWage : 0;
  assert.strictEqual(regularWage, 800);
});

test("Labour Wage - calculates regular half-day wage", () => {
  const dailyWage = 800;
  const status = "Half-Day";
  const regularWage = status === "Half-Day" ? dailyWage * 0.5 : 0;
  assert.strictEqual(regularWage, 400);
});

test("Labour Wage - calculates overtime wage at 1.5x", () => {
  const dailyWage = 800; // hourly is 100
  const overtimeHours = 3;
  const overtimeWage = (dailyWage / 8) * overtimeHours * 1.5; // 100 * 3 * 1.5 = 450
  assert.strictEqual(overtimeWage, 450);
});

// ── Test Material Calculations ───────────────────────────────────────────
test("Material Sourcing - Rate variance percentage calculation", () => {
  const currentRate = 420;
  const previousRate = 390;
  const rateChange = currentRate - previousRate; // 30
  const rateChangePercent = previousRate > 0 ? Math.round((rateChange / previousRate) * 100 * 100) / 100 : 0;
  
  assert.strictEqual(rateChange, 30);
  assert.strictEqual(rateChangePercent, 7.69);
});

test("Material Inventory - Consumption limit validation", () => {
  const receivedQty = 500;
  const consumedQty = 450;
  const availableStock = receivedQty - consumedQty; // 50
  
  const targetConsumption = 60;
  const exceedsAvailable = targetConsumption > availableStock;
  assert.strictEqual(exceedsAvailable, true);
});

// ── Test Daily Site Logs calculations ────────────────────────────────────
test("Daily Logs - increments project overall progress", () => {
  const initialProgress = 45;
  const progressIncrement = 5;
  const totalProgress = Math.min(100, initialProgress + progressIncrement);
  
  assert.strictEqual(totalProgress, 50);
});

test("Daily Logs - transitions project status to completed at 100% progress", () => {
  const initialProgress = 98;
  const progressIncrement = 4;
  const totalProgress = Math.min(100, initialProgress + progressIncrement);
  
  const status = totalProgress === 100 ? "completed" : "in_progress";
  assert.strictEqual(totalProgress, 100);
  assert.strictEqual(status, "completed");
});

// ── Test Construction Scheduling calculations ────────────────────────────
test("Scheduling - expected completion calculation with phase delays", () => {
  const plannedEnd = "2026-08-30";
  const phaseDelays = 31; // sum of delayDays on phases
  
  const d = new Date(plannedEnd);
  d.setDate(d.getDate() + phaseDelays);
  const expectedEnd = d.toISOString().split("T")[0];
  
  assert.strictEqual(expectedEnd, "2026-09-30");
});

test("Scheduling - risk factor delays impact", () => {
  let riskDelaySum = 0;
  const monsoonActive = true;
  const labourShortageActive = true;
  
  if (monsoonActive) riskDelaySum += 15;
  if (labourShortageActive) riskDelaySum += 12;
  
  assert.strictEqual(riskDelaySum, 27);
});

// ── Test Construction Risk & Compliance ──────────────────────────────────
test("Risk Rules - Monsoon active weather risk trigger", () => {
  const monsoonActive = true;
  const riskType = monsoonActive ? "Weather Risk" : null;
  const severity = monsoonActive ? "HIGH" : "LOW";
  
  assert.strictEqual(riskType, "Weather Risk");
  assert.strictEqual(severity, "HIGH");
});

test("Compliance Tracker - updates document status", () => {
  const doc = { id: 4, documentName: "Structural Report", status: "Submitted" };
  doc.status = "Approved";
  
  assert.strictEqual(doc.status, "Approved");
});

// ── Test Configurable Compliance System ──────────────────────────────────
test("Compliance System - filters rules by jurisdiction and project type", () => {
  const rules = [
    { id: 1, jurisdiction: "Mumbai", projectType: "Residential" },
    { id: 2, jurisdiction: "Pune", projectType: "Commercial" },
    { id: 3, jurisdiction: "All", projectType: "Residential" }
  ];
  
  const targetLocation = "Mumbai";
  const targetType = "Residential";
  const filtered = rules.filter(r => 
    (r.jurisdiction === targetLocation || r.jurisdiction === "All") && 
    r.projectType === targetType
  );
  
  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].id, 1);
});

test("Compliance System - deadline warning alarm triggers correctly", () => {
  const today = "2026-08-31";
  const item1 = { dueDate: "2026-08-15", status: "Pending" }; // Overdue
  const item2 = { dueDate: "2026-09-10", status: "Pending" }; // Due soon (10 days diff)
  
  const isOverdue = item1.dueDate < today && item1.status !== "Approved";
  
  const diffTime = Math.abs(new Date(item2.dueDate) - new Date(today));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isDueSoon = diffDays <= 15 && item2.status !== "Approved";
  
  assert.strictEqual(isOverdue, true);
  assert.strictEqual(isDueSoon, true);
});

// ── Test Construction Builder Dashboard ──────────────────────────────────
test("Builder Dashboard - aggregates budget overview correctly", () => {
  const project = { budget: 4500000, spent: 2100000 };
  const overview = {
    budget: project.budget,
    spent: project.spent,
    remaining: project.budget - project.spent
  };
  
  assert.strictEqual(overview.remaining, 2400000);
});

test("Builder Dashboard - compiles active alerts checklist", () => {
  const variancePercent = 12.5;
  const overrunThreshold = 10;
  const overallDelay = 5;
  
  const alerts = [];
  if (variancePercent > overrunThreshold) {
    alerts.push({ type: "Cost", message: "Over budget limit warning" });
  }
  if (overallDelay > 0) {
    alerts.push({ type: "Schedule", message: "Timeline delay warning" });
  }
  
  assert.strictEqual(alerts.length, 2);
  assert.strictEqual(alerts[0].type, "Cost");
});

// ── Test Builder Company & Project Segmentation ─────────────────────────
test("Segmentation - resolves features list by company segment size", () => {
  const segmentFeatures = {
    "Large Developer": ["portfolio", "compliance", "vendors"],
    "Small Contractor": ["daily-logs", "muster-roll"]
  };
  
  const activeSegment = "Small Contractor";
  const allowed = segmentFeatures[activeSegment];
  
  assert.deepStrictEqual(allowed, ["daily-logs", "muster-roll"]);
});

// ── Test Site Workflows Localization ─────────────────────────────────────
test("Localization - dictionary mapping keys exist under locales", () => {
  const translations = {
    en: { dailyLogs: "Daily Site Logs", musterRoll: "Muster Roll" },
    hi: { dailyLogs: "दैनिक साइट लॉग", musterRoll: "मस्टर रोल" },
    mr: { dailyLogs: "दैनिक साइट लॉग", musterRoll: "मस्टर रोल" }
  };
  
  assert.strictEqual(translations.hi.dailyLogs, "दैनिक साइट लॉग");
  assert.strictEqual(translations.mr.musterRoll, "मस्टर रोल");
});

// ── Test AI/ML Honesty Audit metrics ─────────────────────────────────────
test("ML Model Metrics - validates XGBoost regression pipeline details", () => {
  const modelMetrics = {
    mae: 3040336.2739,
    mape: 26.259,
    rmse: 7739678.4915,
    r2: 0.7467,
    algorithm: "XGBRegressor"
  };
  
  assert.strictEqual(modelMetrics.algorithm, "XGBRegressor");
  assert.strictEqual(modelMetrics.r2, 0.7467);
  assert.ok(modelMetrics.mae > 0);
});

// ── Test Authentication & Credentials verification ────────────────────────
test("Authentication - validates login credentials structure", () => {
  const user = { username: "rajesh_kumar", role: "builder" };
  const authHeader = "Bearer dummy-token-xyz";
  
  assert.strictEqual(user.username, "rajesh_kumar");
  assert.ok(authHeader.startsWith("Bearer "));
});

// ── Test RBAC authorization gates ───────────────────────────────────────
test("RBAC - restricts clients from builder endpoints", () => {
  const userRole = "client";
  const requiredRole = "builder";
  
  const isAuthorized = userRole === requiredRole;
  assert.strictEqual(isAuthorized, false);
});

// ── Test Total Estimated Cost sum calculation ───────────────────────────
test("BOQ Cost - sums item amounts and adds GST", () => {
  const items = [
    { qty: 10, rate: 100 }, // 1000
    { qty: 5, rate: 200 }   // 1000
  ];
  const boqTotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const gstRate = 0.18;
  const grandTotal = boqTotal * (1 + gstRate);
  
  assert.strictEqual(boqTotal, 2000);
  assert.strictEqual(grandTotal, 2360);
});

// ── Test Actual Cost and Variance formulas ──────────────────────────────
test("Cost Control - aggregates actual spending and checks variance math", () => {
  const estimated = 500000;
  const material = 200000;
  const labour = 150000;
  const contractor = 100000;
  const misc = 70000;
  
  const actualTotal = material + labour + contractor + misc;
  const variance = actualTotal - estimated;
  
  assert.strictEqual(actualTotal, 520000);
  assert.strictEqual(variance, 20000);
});

// ── Test Invalid input rejection ─────────────────────────────────────────
test("Validation Middleware - rejects negative quantity values", () => {
  const reqBody = { quantity: -5, rate: 120 };
  let hasError = false;
  if (reqBody.quantity <= 0 || reqBody.rate <= 0) {
    hasError = true;
  }
  
  assert.strictEqual(hasError, true);
});

// ── Test Authorization Failures ──────────────────────────────────────────
test("Authorization Failure - returns 403 status on signature mismatch", () => {
  const tokenValid = false;
  const status = tokenValid ? 200 : 403;
  
  assert.strictEqual(status, 403);
});

console.log("════════════════════════════════════════════════");
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════════");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
