/**
 * RA (Running Account) Billing Routes
 *
 * Implements the standard civil engineering contractor billing chain:
 *   BOQ → Verified Site Measurements → RA Bill → Certification → Payment
 *
 * Status workflow: draft → submitted → verified → certified → paid
 *
 * Key accounting rules:
 *  - Only VERIFIED measurements can be billed
 *  - Previous Qty = sum of cumulative_quantity from all prior non-rejected bills for the same boq_item
 *  - This Bill Qty = verified, unbilled measurement quantities selected for this bill
 *  - Total Qty = Previous Qty + This Bill Qty
 *  - Total Qty cannot exceed BOQ contract_quantity (unless variation)
 *  - Rate is always the BOQ contract rate — never arbitrary
 */

"use strict";

const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const { query, get, run, withTransaction } = require("../db/mysql");
const { successResponse } = require("../utils/response");

const asyncWrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Status workflow ──────────────────────────────────────────────────────────
const RA_STATUSES = ["draft", "submitted", "verified", "certified", "paid", "rejected"];
const STATUS_TRANSITIONS = {
  draft:     ["submitted", "rejected"],
  submitted: ["verified", "rejected"],
  verified:  ["certified", "rejected"],
  certified: ["paid"],
  rejected:  ["draft"],
  paid:      []
};
const STATUS_LABELS = {
  draft:     "Draft",
  submitted: "Submitted",
  verified:  "Verified",
  certified: "Certified",
  paid:      "Paid",
  rejected:  "Rejected"
};

function normalizeStatus(s) {
  return String(s || "").trim().toLowerCase();
}

function canTransition(from, to) {
  return (STATUS_TRANSITIONS[normalizeStatus(from)] || []).includes(normalizeStatus(to));
}

function fmt(n) {
  const v = Number(n);
  return isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Auto-generate bill number: RA-01, RA-02, etc. per project */
async function nextBillNumber(projectId) {
  const row = await get(
    "SELECT COUNT(*) AS cnt FROM ra_bills WHERE project_id = ?",
    [projectId]
  );
  const seq = (Number(row?.cnt) || 0) + 1;
  return { billNumber: `RA-${String(seq).padStart(2, "0")}`, seq };
}

/**
 * For a given project + boq_item, compute already-billed (previous) cumulative quantity
 * from all bills that are NOT rejected and NOT the current bill being created
 */
async function getPreviousQty(projectId, boqItemId, excludeBillId = null) {
  let sql = `
    SELECT COALESCE(SUM(rbi.cumulative_quantity), 0) AS prev_qty
    FROM ra_bill_items rbi
    JOIN ra_bills rb ON rb.id = rbi.ra_bill_id
    WHERE rb.project_id = ?
      AND rbi.boq_item_id = ?
      AND rb.status NOT IN ('rejected', 'draft')
  `;
  const params = [projectId, boqItemId];
  if (excludeBillId) {
    sql += " AND rb.id != ?";
    params.push(excludeBillId);
  }
  const row = await get(sql, params);
  return fmt(row?.prev_qty ?? 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// SITE MEASUREMENTS HANDLED BY MEASUREMENT BOOK ROUTER (measurement-book.routes.js)
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// RA BILLS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/projects/:id/ra-bills
 * List all RA bills for a project with summary
 */
router.get("/projects/:id/ra-bills", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.id);

  const bills = await query(
    `SELECT rb.*,
            c.name            AS contractor_name,
            ct.contract_number,
            ct.contract_value
     FROM ra_bills rb
     LEFT JOIN contractors c  ON c.id  = rb.contractor_id
     LEFT JOIN contracts   ct ON ct.id = rb.contract_id
     WHERE rb.project_id = ?
     ORDER BY rb.bill_sequence ASC, rb.id ASC`,
    [projectId]
  );

  const summary = {
    totalBills: bills.length,
    draft:       bills.filter(b => normalizeStatus(b.status) === "draft").length,
    submitted:   bills.filter(b => normalizeStatus(b.status) === "submitted").length,
    verified:    bills.filter(b => normalizeStatus(b.status) === "verified").length,
    certified:   bills.filter(b => normalizeStatus(b.status) === "certified").length,
    paid:        bills.filter(b => normalizeStatus(b.status) === "paid").length,
    rejected:    bills.filter(b => normalizeStatus(b.status) === "rejected").length,
    totalBilledAmount:  fmt(bills.reduce((s, b) => s + Number(b.subtotal || b.gross_amount || 0), 0)),
    totalPaidAmount:    fmt(bills.filter(b => normalizeStatus(b.status) === "paid").reduce((s, b) => s + Number(b.net_payable || 0), 0)),
    outstandingAmount:  fmt(bills.filter(b => ["certified", "submitted", "verified"].includes(normalizeStatus(b.status))).reduce((s, b) => s + Number(b.net_payable || 0), 0)),
    grossAmount:        fmt(bills.reduce((s, b) => s + Number(b.gross_amount || 0), 0)),
    approved:           bills.filter(b => ["certified", "paid"].includes(normalizeStatus(b.status))).length
  };

  return successResponse(res, { bills, summary });
}));

/**
 * GET /api/projects/:id/ra-bills/:billId
 * Get a single RA bill with all line items (abstract)
 */
router.get("/projects/:id/ra-bills/:billId", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const billId    = parseInt(req.params.billId);

  const bill = await get(
    `SELECT rb.*,
            c.name        AS contractor_name,
            c.company_name AS contractor_company,
            c.gst_number  AS contractor_gst,
            ct.contract_number,
            ct.contract_value,
            ct.retention_percentage AS contract_retention,
            ct.gst_rate AS contract_gst_rate
     FROM ra_bills rb
     LEFT JOIN contractors c  ON c.id  = rb.contractor_id
     LEFT JOIN contracts   ct ON ct.id = rb.contract_id
     WHERE rb.id = ? AND rb.project_id = ?`,
    [billId, projectId]
  );
  if (!bill) throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };

  const items = await query(
    `SELECT rbi.*,
            bi.description AS boq_description,
            bi.category    AS boq_category,
            bi.quantity    AS contract_qty_boq
     FROM ra_bill_items rbi
     JOIN boq_items bi ON bi.id = rbi.boq_item_id
     WHERE rbi.ra_bill_id = ?
     ORDER BY rbi.id ASC`,
    [billId]
  );

  // Map to standard spec field names for frontend
  const abstract = items.map(item => ({
    id:                   item.id,
    boqItemId:            item.boq_item_id,
    description:          item.description || item.boq_description,
    boqCategory:          item.boq_category,
    unit:                 item.unit,
    rate:                 fmt(item.contract_rate),
    partRate:             item.part_rate !== undefined && item.part_rate !== null ? fmt(item.part_rate) : null,
    contractQty:          fmt(item.contract_quantity),
    previousQty:          fmt(item.previously_billed_quantity),
    previousAmount:       fmt(item.previous_billed_amount || Number(item.previously_billed_quantity) * Number(item.contract_rate)),
    thisBillQty:          fmt(item.current_quantity),
    thisBillAmount:       fmt(item.this_bill_amount || item.current_amount),
    totalQty:             fmt(item.cumulative_quantity),
    totalAmount:          fmt(item.cumulative_amount)
  }));

  return successResponse(res, { bill, abstract });
}));

/**
 * POST /api/projects/:id/ra-bills
 * Create a new RA Bill from VERIFIED measurements
 *
 * Body:
 *   contractId, contractorId, billingPeriodStart, billingPeriodEnd,
 *   billDate, workDescription, agreementNumber,
 *   gstRate (%), retentionRate (%), otherDeductions (flat amount),
 *   measurementIds: [array of verified site_measurement IDs to include]
 */
router.post("/projects/:id/ra-bills", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const {
    contractId, contractorId,
    billingPeriodStart, billingPeriodEnd, billDate,
    workDescription, agreementNumber,
    gstRate = 0, retentionRate = 0, otherDeductions = 0,
    measurementIds = []
  } = req.body;

  if (!contractId || !contractorId) {
    throw { status: 400, code: "MISSING_FIELDS", message: "contractId and contractorId are required" };
  }
  if (!measurementIds || measurementIds.length === 0) {
    throw { status: 400, code: "NO_MEASUREMENTS", message: "At least one verified measurement must be selected" };
  }

  // Validate all measurements are VERIFIED and not already billed
  const placeholders = measurementIds.map(() => "?").join(",");
  const measurements = await query(
    `SELECT sm.*, bi.quantity AS boq_contract_qty, bi.rate AS boq_rate, bi.unit AS boq_unit, bi.description AS boq_description
     FROM site_measurements sm
     JOIN boq_items bi ON bi.id = sm.boq_item_id
     WHERE sm.id IN (${placeholders}) AND sm.project_id = ?`,
    [...measurementIds.map(Number), projectId]
  );

  for (const m of measurements) {
    if (normalizeStatus(m.status) !== "verified") {
      throw { status: 400, code: "UNVERIFIED_MEASUREMENT", message: `Measurement ID ${m.id} is not VERIFIED (status: ${m.status}). Only verified measurements can be billed.` };
    }
    if (m.is_billed) {
      throw { status: 409, code: "ALREADY_BILLED", message: `Measurement ID ${m.id} has already been included in a previous RA bill. Double-billing is not allowed.` };
    }
  }

  // Group measurements by boq_item_id → sum quantities for this bill
  const byBoqItem = {};
  for (const m of measurements) {
    if (!byBoqItem[m.boq_item_id]) {
      byBoqItem[m.boq_item_id] = {
        boqItemId:    m.boq_item_id,
        description:  m.boq_description,
        unit:         m.boq_unit || m.unit,
        contractQty:  fmt(m.boq_contract_qty),
        rate:         fmt(m.boq_rate),
        thisBillQty:  0,
        measurementIds: []
      };
    }
    byBoqItem[m.boq_item_id].thisBillQty  = fmt(byBoqItem[m.boq_item_id].thisBillQty + Number(m.quantity));
    byBoqItem[m.boq_item_id].measurementIds.push(m.id);
  }

  // Fetch previous cumulative quantities for each BOQ item
  const lineItems = [];
  for (const [boqItemId, item] of Object.entries(byBoqItem)) {
    const previousQty = await getPreviousQty(projectId, parseInt(boqItemId));
    const totalQty    = fmt(previousQty + item.thisBillQty);

    // Enforce: Total Qty cannot exceed BOQ contract quantity
    if (totalQty > item.contractQty + 0.0001) { // small epsilon for float
      throw {
        status: 400,
        code: "QUANTITY_EXCEEDS_BOQ",
        message: `BOQ item "${item.description}": cumulative quantity (${totalQty} ${item.unit}) would exceed BOQ contract quantity (${item.contractQty} ${item.unit}). Create a Variation Order first.`
      };
    }

    lineItems.push({
      ...item,
      previousQty,
      totalQty,
      previousAmount:  fmt(previousQty * item.rate),
      thisBillAmount:  fmt(item.thisBillQty * item.rate),
      totalAmount:     fmt(totalQty * item.rate)
    });
  }

  // Compute financial totals
  const subtotal       = fmt(lineItems.reduce((s, i) => s + i.thisBillAmount, 0));
  const gstAmount      = fmt(subtotal * Number(gstRate) / 100);
  const retentionAmt   = fmt(subtotal * Number(retentionRate) / 100);
  const otherDeductAmt = fmt(Number(otherDeductions));
  const netPayable     = fmt(subtotal + gstAmount - retentionAmt - otherDeductAmt);

  const { billNumber, seq } = await nextBillNumber(projectId);
  const today = new Date().toISOString().split("T")[0];

  const result = await withTransaction(async (tx) => {
    // Insert the bill
    const billRes = await tx.run(
      `INSERT INTO ra_bills
         (project_id, contract_id, contractor_id, bill_number, bill_sequence, agreement_number,
          billing_period_start, billing_period_end, submission_date,
          work_description, gross_amount, subtotal, gst_applicable, gst_rate, gst_amount,
          retention_percent, retention_amount, other_deductions, net_payable, status,
          period_start, period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        projectId,
        parseInt(contractId),
        parseInt(contractorId),
        billNumber,
        seq,
        agreementNumber || null,
        billingPeriodStart || today,
        billingPeriodEnd   || today,
        billDate || today,
        workDescription || "",
        subtotal,
        subtotal,
        Number(gstRate) > 0 ? 1 : 0,
        fmt(gstRate),
        gstAmount,
        fmt(retentionRate),
        retentionAmt,
        otherDeductAmt,
        netPayable,
        billingPeriodStart || today,
        billingPeriodEnd   || today
      ]
    );
    const billId = billRes.lastInsertRowid;

    // Insert line items
    for (const item of lineItems) {
      await tx.run(
        `INSERT INTO ra_bill_items
           (ra_bill_id, boq_item_id, description, unit,
            contract_quantity, previously_billed_quantity, previous_billed_amount,
            current_quantity, this_bill_amount,
            cumulative_quantity, contract_rate, current_amount, cumulative_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billId,
          item.boqItemId,
          item.description,
          item.unit,
          item.contractQty,
          item.previousQty,
          item.previousAmount,
          item.thisBillQty,
          item.thisBillAmount,
          item.totalQty,
          item.rate,
          item.thisBillAmount,
          item.totalAmount
        ]
      );
    }

    // Mark measurements as billed
    for (const measId of measurementIds) {
      await tx.run(
        "UPDATE site_measurements SET is_billed = 1, ra_bill_id = ? WHERE id = ?",
        [billId, parseInt(measId)]
      );
    }

    return billId;
  });

  const created = await get("SELECT * FROM ra_bills WHERE id = ?", [result]);
  return successResponse(res, { bill: created, billNumber, netPayable }, 201);
}));

/**
 * PATCH /api/projects/:id/ra-bills/:billId/status
 * Transition RA bill status: submitted → verified → certified → paid
 *
 * Body: { status, reason?, paymentDate?, paymentReference? }
 */
router.patch("/projects/:id/ra-bills/:billId/status", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const billId    = parseInt(req.params.billId);
  const { status, reason, paymentDate, paymentReference } = req.body;

  const bill = await get("SELECT * FROM ra_bills WHERE id = ? AND project_id = ?", [billId, projectId]);
  if (!bill) throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };

  const newStatus = normalizeStatus(status);
  if (!canTransition(bill.status, newStatus)) {
    throw {
      status: 400,
      code: "INVALID_TRANSITION",
      message: `Cannot move bill from '${bill.status}' to '${newStatus}'. Valid transitions: ${(STATUS_TRANSITIONS[normalizeStatus(bill.status)] || []).join(", ")||"none"}`
    };
  }

  await run(
    "UPDATE ra_bills SET status = ?, rejection_reason = ? WHERE id = ?",
    [newStatus, reason || null, billId]
  );

  // If transitioning to paid, log a payment record
  if (newStatus === "paid" && paymentDate) {
    const ref = paymentReference || `PAY-${billId}-${Date.now()}`;
    const existing = await get("SELECT id FROM ra_bill_payments WHERE ra_bill_id = ?", [billId]);
    if (!existing) {
      await run(
        "INSERT INTO ra_bill_payments (ra_bill_id, payment_date, payment_reference, amount, payment_status) VALUES (?, ?, ?, ?, 'completed')",
        [billId, paymentDate, ref, bill.net_payable]
      );
    }
  }

  const updated = await get("SELECT * FROM ra_bills WHERE id = ?", [billId]);
  return successResponse(res, { bill: updated, statusLabel: STATUS_LABELS[newStatus] });
}));

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/projects/:id/ra-bills/:billId/export
 * Download a professional Excel RA Bill document
 * Filename: RA_Bill_01_YYYY-MM-DD.xlsx
 */
router.get("/projects/:id/ra-bills/:billId/export", asyncWrap(exportRABillExcel));
router.get("/projects/:id/ra-bills/:billId/pdf", asyncWrap(exportRABillExcel));

async function exportRABillExcel(req, res) {
  const projectId = parseInt(req.params.id);
  const billId    = parseInt(req.params.billId);

  // Fetch bill
  const bill = await get(
    `SELECT rb.*,
            p.name                AS project_name,
            p.location,
            c.name                AS contractor_name,
            c.company_name        AS contractor_company,
            c.gst_number          AS contractor_gst,
            ct.contract_number,
            ct.contract_value
     FROM ra_bills rb
     JOIN projects p    ON p.id  = rb.project_id
     LEFT JOIN contractors c  ON c.id  = rb.contractor_id
     LEFT JOIN contracts   ct ON ct.id = rb.contract_id
     WHERE rb.id = ? AND rb.project_id = ?`,
    [billId, projectId]
  );
  if (!bill) throw { status: 404, code: "BILL_NOT_FOUND", message: "RA Bill not found" };

  const items = await query(
    `SELECT rbi.*,
            bi.description AS boq_description,
            bi.category    AS boq_category,
            bi.id          AS item_no
     FROM ra_bill_items rbi
     JOIN boq_items bi ON bi.id = rbi.boq_item_id
     WHERE rbi.ra_bill_id = ?
     ORDER BY rbi.id ASC`,
    [billId]
  );

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "BuildSmart AI";
  wb.created = new Date();

  const ws = wb.addWorksheet("RA Abstract", { pageSetup: { paperSize: 9, orientation: "landscape", fitToWidth: 1 } });

  // Column widths matching the abstract table
  ws.columns = [
    { width: 6  },  // A: S.No.
    { width: 8  },  // B: Item No.
    { width: 30 },  // C: Description
    { width: 8  },  // D: Unit
    { width: 12 },  // E: Rate
    { width: 10 },  // F: Part Rate
    { width: 12 },  // G: Previous Qty
    { width: 15 },  // H: Previous Amount
    { width: 12 },  // I: This Bill Qty
    { width: 15 },  // J: This Bill Amount
    { width: 12 },  // K: Total Qty
    { width: 15 },  // L: Total Amount
  ];

  const THIN = { style: "thin", color: { argb: "FF000000" } };
  const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  const SUB_FILL   = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
  const GROUP_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
  const INR = (n) => {
    const v = Number(n) || 0;
    return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  let row;

  // ── Title ─────────────────────────────────────────────────────────────────
  row = ws.addRow(["RUNNING ACCOUNT BILL"]);
  ws.mergeCells(`A${ws.rowCount}:L${ws.rowCount}`);
  row.getCell(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  row.getCell(1).fill = HEADER_FILL;
  row.height = 30;

  // ── Project Details ───────────────────────────────────────────────────────
  const details = [
    ["Name of Work:",    bill.project_name || "—"],
    ["Agency / Contractor:", `${bill.contractor_name || "—"}${bill.contractor_company ? " (" + bill.contractor_company + ")" : ""}`],
    ["Agreement No.:",   bill.agreement_number || bill.contract_number || "—"],
    ["RA Bill No.:",     bill.bill_number],
    ["Date of Bill:",    bill.submission_date || bill.created_at?.slice(0, 10) || "—"],
    ["Billing Period:",  `${bill.billing_period_start || "—"} to ${bill.billing_period_end || "—"}`],
    ["Status:",          STATUS_LABELS[normalizeStatus(bill.status)] || bill.status],
  ];

  details.forEach(([label, value]) => {
    row = ws.addRow([label, value]);
    ws.mergeCells(`B${ws.rowCount}:L${ws.rowCount}`);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(2).font = { size: 10 };
    row.height = 18;
  });

  ws.addRow([]); // spacer

  // ── Abstract Header Row 1: Group Labels ──────────────────────────────────
  const hRow1 = ws.addRow(["S.No.", "Item No.", "Description", "Unit", "Rate", "Part Rate",
                            "Previous", "", "This Bill", "", "Total", ""]);
  ws.mergeCells(`G${ws.rowCount}:H${ws.rowCount}`);
  ws.mergeCells(`I${ws.rowCount}:J${ws.rowCount}`);
  ws.mergeCells(`K${ws.rowCount}:L${ws.rowCount}`);
  hRow1.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER;
  });
  hRow1.height = 22;

  // ── Abstract Header Row 2: Sub-labels ────────────────────────────────────
  const hRow2 = ws.addRow(["", "", "", "", "", "", "Qty", "Amount", "Qty", "Amount", "Qty", "Amount"]);
  hRow2.eachCell((cell, colNum) => {
    if (colNum < 7) return; // skip first 6 already labeled
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDER;
  });
  // Re-apply fill to first 6 cells of row2
  for (let c = 1; c <= 6; c++) {
    const cell = hRow2.getCell(c);
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
  }
  hRow2.height = 18;

  // ── Abstract Data Rows ────────────────────────────────────────────────────
  let sno = 1;
  let thisTotal = 0;
  for (const item of items) {
    const prevAmt  = fmt(item.previous_billed_amount ?? Number(item.previously_billed_quantity) * Number(item.contract_rate));
    const thisAmt  = fmt(item.this_bill_amount ?? item.current_amount);
    const totAmt   = fmt(item.cumulative_amount);
    thisTotal += thisAmt;

    const partRateDisplay = (item.part_rate !== null && item.part_rate !== undefined) ? fmt(item.part_rate) : "—";

    const dRow = ws.addRow([
      sno++,
      item.item_no || item.boq_item_id,
      item.description || item.boq_description,
      item.unit,
      INR(item.contract_rate),
      partRateDisplay,
      fmt(item.previously_billed_quantity),
      INR(prevAmt),
      fmt(item.current_quantity),
      INR(thisAmt),
      fmt(item.cumulative_quantity),
      INR(totAmt)
    ]);
    dRow.eachCell((cell, colNum) => {
      cell.font = { size: 9 };
      cell.border = BORDER;
      cell.alignment = { horizontal: colNum <= 3 ? "left" : "center", vertical: "middle", wrapText: true };
    });
    dRow.height = 20;
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  ws.addRow([]); // spacer
  const summaryItems = [
    ["Subtotal (This Bill)", INR(bill.subtotal || bill.gross_amount)],
    [`GST @ ${bill.gst_rate || 0}%`,  INR(bill.gst_amount || 0)],
    [`Retention @ ${bill.retention_percent || 0}%`, `(${INR(bill.retention_amount || 0)})`],
    ["Other Deductions",     `(${INR(bill.other_deductions || 0)})`],
    ["Net Payable",          INR(bill.net_payable)],
  ];
  summaryItems.forEach(([label, value], idx) => {
    row = ws.addRow(["", "", "", "", "", "", "", "", "", label, "", value]);
    ws.mergeCells(`A${ws.rowCount}:I${ws.rowCount}`);
    ws.mergeCells(`J${ws.rowCount}:K${ws.rowCount}`);
    row.getCell(10).font = { bold: idx === summaryItems.length - 1, size: 10 };
    row.getCell(10).alignment = { horizontal: "right" };
    row.getCell(12).font = { bold: idx === summaryItems.length - 1, size: 10 };
    row.getCell(12).alignment = { horizontal: "right" };
    if (idx === summaryItems.length - 1) {
      row.getCell(10).fill = GROUP_FILL;
      row.getCell(11).fill = GROUP_FILL;
      row.getCell(12).fill = GROUP_FILL;
    }
    row.getCell(10).border = BORDER;
    row.getCell(11).border = BORDER;
    row.getCell(12).border = BORDER;
  });

  // ── Certification / Signature Block ──────────────────────────────────────
  ws.addRow([]);
  ws.addRow([]);
  const sigRow = ws.addRow(["Prepared By", "", "", "Verified By", "", "", "Certified By", "", "", "Payment Status", "", bill.status === "paid" ? "PAID" : "PENDING"]);
  ["A", "D", "G", "J"].forEach((col, i) => {
    const c = sigRow.getCell(["A","D","G","J"][i] === "A" ? 1 : ["A","D","G","J"][i] === "D" ? 4 : ["A","D","G","J"][i] === "G" ? 7 : 10);
    c.font = { bold: true, size: 9 };
    c.fill = SUB_FILL;
    c.border = BORDER;
  });
  sigRow.height = 20;
  ws.addRow(["________________", "", "", "________________", "", "", "________________", "", "", "________________"]);

  // ── Stream the file ───────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().split("T")[0];
  const seqStr  = String(bill.bill_sequence || 1).padStart(2, "0");
  const filename = `RA_Bill_${seqStr}_${dateStr}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await wb.xlsx.write(res);
  res.end();
}

module.exports = router;
