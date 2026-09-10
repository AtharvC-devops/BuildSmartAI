/**
 * Measurement Book Routes & Business Logic
 * Step 1: Site Measurements + BOQ Verification Chain
 *
 * Implements civil engineering Measurement Book standards:
 * - Dimension-based quantity calculation (Length × Breadth × Depth/Height × No. of Units)
 * - Direct quantity entry fallback
 * - BOQ contract quantity cap enforcement for VERIFIED measurements
 * - Immutability of VERIFIED measurements
 */

"use strict";

const express = require("express");
const router = express.Router();
const { query, get, run } = require("../db/mysql");
const { successResponse } = require("../utils/response");

const asyncWrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function roundDecimal(val, decimals = 4) {
  const num = parseFloat(val);
  if (!isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

function normalizeStatus(s) {
  const norm = String(s || "").trim().toUpperCase();
  if (["DRAFT", "VERIFIED", "REJECTED"].includes(norm)) {
    return norm;
  }
  return "DRAFT";
}

/**
 * Quantity calculation from dimensions or direct entry fallback
 */
function computeQuantity({ length, breadth, depthOrHeight, numberOfUnits, quantity }) {
  const l = length != null && length !== "" ? parseFloat(length) : null;
  const b = breadth != null && breadth !== "" ? parseFloat(breadth) : null;
  const d = depthOrHeight != null && depthOrHeight !== "" ? parseFloat(depthOrHeight) : null;
  const n = numberOfUnits != null && numberOfUnits !== "" ? parseFloat(numberOfUnits) : null;

  // Check if at least one dimension is explicitly provided
  if (l !== null || b !== null || d !== null || n !== null) {
    const len = l !== null ? l : 1;
    const brd = b !== null ? b : 1;
    const dep = d !== null ? d : 1;
    const num = n !== null ? n : 1;
    return roundDecimal(len * brd * dep * num);
  }

  if (quantity != null && quantity !== "") {
    return roundDecimal(quantity);
  }

  return 0;
}

/**
 * Compute total VERIFIED executed quantity for a BOQ item
 */
async function getExecutedQuantity(boqItemId, excludeMeasurementId = null) {
  let sql = `
    SELECT COALESCE(SUM(quantity), 0) AS executed_qty
    FROM site_measurements
    WHERE boq_item_id = ?
      AND LOWER(status) = 'verified'
  `;
  const params = [parseInt(boqItemId)];
  if (excludeMeasurementId) {
    sql += " AND id != ?";
    params.push(parseInt(excludeMeasurementId));
  }
  const row = await get(sql, params);
  return roundDecimal(row?.executed_qty ?? 0);
}

/**
 * Format measurement response to include clean camelCase and status fields
 */
function formatMeasurement(row) {
  if (!row) return null;
  const statusUpper = normalizeStatus(row.status);
  return {
    id: row.id,
    projectId: row.project_id,
    boqItemId: row.boq_item_id,
    measurementDate: row.measurement_date ? new Date(row.measurement_date).toISOString().split("T")[0] : null,
    description: row.description || "",
    location: row.location || null,
    length: row.length != null ? parseFloat(row.length) : null,
    breadth: row.breadth != null ? parseFloat(row.breadth) : null,
    depthOrHeight: row.depth_or_height != null ? parseFloat(row.depth_or_height) : null,
    numberOfUnits: row.number_of_units != null ? parseFloat(row.number_of_units) : null,
    quantity: parseFloat(row.quantity || 0),
    unit: row.unit || "",
    recordedBy: row.recorded_by || "Site Engineer",
    status: statusUpper,
    remarks: row.remarks || row.rejection_reason || null,
    isBilled: Boolean(row.is_billed),
    raBillId: row.ra_bill_id || null,
    createdAt: row.created_at,
    // Joined BOQ info
    boqDescription: row.boq_description || null,
    boqCategory: row.boq_category || null,
    boqContractQty: row.boq_contract_qty != null ? parseFloat(row.boq_contract_qty) : null,
    boqRate: row.boq_rate != null ? parseFloat(row.boq_rate) : null
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MEASUREMENT BOOK ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/projects/:projectId/measurements
 * Create a new measurement entry
 */
router.post("/projects/:projectId/measurements", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const {
    boqItemId,
    measurementDate,
    description,
    location,
    length,
    breadth,
    depthOrHeight,
    numberOfUnits,
    quantity,
    unit,
    recordedBy,
    status,
    remarks
  } = req.body;

  if (!boqItemId || !measurementDate) {
    throw { status: 400, code: "MISSING_FIELDS", message: "boqItemId and measurementDate are required" };
  }

  // 1. BOQ & Project relationship validation
  const boqItem = await get(
    "SELECT * FROM boq_items WHERE id = ? AND project_id = ?",
    [parseInt(boqItemId), projectId]
  );
  if (!boqItem) {
    throw { status: 400, code: "INVALID_BOQ_RELATIONSHIP", message: "BOQ item does not belong to specified project" };
  }

  // 2. Unit mismatch validation
  const measurementUnit = (unit || boqItem.unit || "").trim();
  if (measurementUnit.toLowerCase() !== (boqItem.unit || "").trim().toLowerCase()) {
    throw {
      status: 400,
      code: "UNIT_MISMATCH",
      message: `Measurement unit (${measurementUnit}) does not match BOQ item unit (${boqItem.unit})`
    };
  }

  // 3. Quantity calculation
  const computedQty = computeQuantity({ length, breadth, depthOrHeight, numberOfUnits, quantity });
  if (computedQty <= 0) {
    throw { status: 400, code: "INVALID_QUANTITY", message: "Calculated quantity must be greater than 0" };
  }

  const initialStatus = normalizeStatus(status);

  // 4. Verification BOQ cap check if created directly as VERIFIED
  if (initialStatus === "VERIFIED") {
    const executedQty = await getExecutedQuantity(boqItemId);
    const contractQty = roundDecimal(boqItem.quantity);
    if (executedQty + computedQty > contractQty + 0.0001) {
      throw {
        status: 400,
        code: "BOQ_EXCEEDED",
        message: `Verification blocked: Total executed quantity (${roundDecimal(executedQty + computedQty)}) would exceed BOQ contract quantity (${contractQty})`
      };
    }
  }

  const result = await run(
    `INSERT INTO site_measurements
       (project_id, boq_item_id, measurement_date, description, location,
        length, breadth, depth_or_height, number_of_units, quantity, unit,
        recorded_by, status, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      parseInt(boqItemId),
      measurementDate,
      description || "",
      location || null,
      length != null && length !== "" ? parseFloat(length) : null,
      breadth != null && breadth !== "" ? parseFloat(breadth) : null,
      depthOrHeight != null && depthOrHeight !== "" ? parseFloat(depthOrHeight) : null,
      numberOfUnits != null && numberOfUnits !== "" ? parseFloat(numberOfUnits) : null,
      computedQty,
      measurementUnit,
      recordedBy || "Site Engineer",
      initialStatus.toLowerCase(),
      remarks || null
    ]
  );

  const row = await get(
    `SELECT sm.*, bi.description AS boq_description, bi.category AS boq_category, bi.quantity AS boq_contract_qty, bi.rate AS boq_rate
     FROM site_measurements sm
     JOIN boq_items bi ON bi.id = sm.boq_item_id
     WHERE sm.id = ?`,
    [result.lastInsertRowid]
  );

  return successResponse(res, formatMeasurement(row), 201);
}));

/**
 * GET /api/projects/:projectId/measurements
 * Get all measurements for a project (optionally filter by boqItemId or status)
 */
router.get("/projects/:projectId/measurements", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { boqItemId, status } = req.query;

  let sql = `
    SELECT sm.*,
           bi.description AS boq_description,
           bi.category    AS boq_category,
           bi.quantity    AS boq_contract_qty,
           bi.rate        AS boq_rate
    FROM site_measurements sm
    JOIN boq_items bi ON bi.id = sm.boq_item_id
    WHERE sm.project_id = ?
  `;
  const params = [projectId];

  if (boqItemId) {
    sql += " AND sm.boq_item_id = ?";
    params.push(parseInt(boqItemId));
  }
  if (status) {
    sql += " AND LOWER(sm.status) = ?";
    params.push(String(status).toLowerCase());
  }

  sql += " ORDER BY sm.measurement_date DESC, sm.id DESC";

  const rows = await query(sql, params);
  return successResponse(res, rows.map(formatMeasurement));
}));

/**
 * GET /api/projects/:projectId/boq/:boqItemId/measurements
 * Get measurements for a specific BOQ item with executed vs remaining summary
 */
router.get("/projects/:projectId/boq/:boqItemId/measurements", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const boqItemId = parseInt(req.params.boqItemId);

  const boqItem = await get(
    "SELECT * FROM boq_items WHERE id = ? AND project_id = ?",
    [boqItemId, projectId]
  );
  if (!boqItem) {
    throw { status: 400, code: "INVALID_BOQ_RELATIONSHIP", message: "BOQ item does not belong to specified project" };
  }

  const rows = await query(
    `SELECT sm.*, bi.description AS boq_description, bi.category AS boq_category, bi.quantity AS boq_contract_qty, bi.rate AS boq_rate
     FROM site_measurements sm
     JOIN boq_items bi ON bi.id = sm.boq_item_id
     WHERE sm.project_id = ? AND sm.boq_item_id = ?
     ORDER BY sm.measurement_date DESC, sm.id DESC`,
    [projectId, boqItemId]
  );

  const executedQty = await getExecutedQuantity(boqItemId);
  const contractQty = roundDecimal(boqItem.quantity);
  const remainingQty = roundDecimal(contractQty - executedQty);

  return successResponse(res, {
    boqItem: {
      id: boqItem.id,
      projectId: boqItem.project_id,
      category: boqItem.category,
      description: boqItem.description,
      unit: boqItem.unit,
      contractQuantity: contractQty,
      rate: roundDecimal(boqItem.rate, 2)
    },
    summary: {
      contractQuantity: contractQty,
      executedQuantity: executedQty,
      remainingQuantity: remainingQty
    },
    measurements: rows.map(formatMeasurement)
  });
}));

/**
 * PUT /api/projects/:projectId/measurements/:id
 * Edit an existing DRAFT or REJECTED measurement.
 * Disallowed if status is VERIFIED.
 */
router.put("/api/projects/:projectId/measurements/:id", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const measId = parseInt(req.params.id);

  const existing = await get(
    "SELECT * FROM site_measurements WHERE id = ? AND project_id = ?",
    [measId, projectId]
  );
  if (!existing) {
    throw { status: 404, code: "MEASUREMENT_NOT_FOUND", message: "Measurement not found" };
  }

  // Rule: A verified measurement cannot be edited directly
  if (normalizeStatus(existing.status) === "VERIFIED") {
    throw {
      status: 400,
      code: "VERIFIED_IMMUTABLE",
      message: "Verified measurements cannot be edited directly"
    };
  }

  const {
    description,
    location,
    length,
    breadth,
    depthOrHeight,
    numberOfUnits,
    quantity,
    unit,
    recordedBy,
    remarks
  } = req.body;

  const boqItem = await get("SELECT * FROM boq_items WHERE id = ?", [existing.boq_item_id]);

  if (unit && (unit.trim().toLowerCase() !== (boqItem.unit || "").trim().toLowerCase())) {
    throw {
      status: 400,
      code: "UNIT_MISMATCH",
      message: `Measurement unit (${unit}) does not match BOQ item unit (${boqItem.unit})`
    };
  }

  const computedQty = computeQuantity({
    length: length !== undefined ? length : existing.length,
    breadth: breadth !== undefined ? breadth : existing.breadth,
    depthOrHeight: depthOrHeight !== undefined ? depthOrHeight : existing.depth_or_height,
    numberOfUnits: numberOfUnits !== undefined ? numberOfUnits : existing.number_of_units,
    quantity: quantity !== undefined ? quantity : existing.quantity
  });

  await run(
    `UPDATE site_measurements
     SET description = ?, location = ?, length = ?, breadth = ?, depth_or_height = ?,
         number_of_units = ?, quantity = ?, unit = ?, recorded_by = ?, remarks = ?
     WHERE id = ?`,
    [
      description !== undefined ? description : existing.description,
      location !== undefined ? location : existing.location,
      length !== undefined ? (length != null ? parseFloat(length) : null) : existing.length,
      breadth !== undefined ? (breadth != null ? parseFloat(breadth) : null) : existing.breadth,
      depthOrHeight !== undefined ? (depthOrHeight != null ? parseFloat(depthOrHeight) : null) : existing.depth_or_height,
      numberOfUnits !== undefined ? (numberOfUnits != null ? parseFloat(numberOfUnits) : null) : existing.number_of_units,
      computedQty,
      unit ? unit.trim() : existing.unit,
      recordedBy !== undefined ? recordedBy : existing.recorded_by,
      remarks !== undefined ? remarks : existing.remarks,
      measId
    ]
  );

  const updated = await get(
    `SELECT sm.*, bi.description AS boq_description, bi.category AS boq_category, bi.quantity AS boq_contract_qty, bi.rate AS boq_rate
     FROM site_measurements sm
     JOIN boq_items bi ON bi.id = sm.boq_item_id
     WHERE sm.id = ?`,
    [measId]
  );
  return successResponse(res, formatMeasurement(updated));
}));

/**
 * Status Transition Helper
 */
async function updateMeasurementStatus(projectId, measId, targetStatus, remarks = null) {
  const normTarget = normalizeStatus(targetStatus);

  const meas = await get(
    "SELECT * FROM site_measurements WHERE id = ? AND project_id = ?",
    [measId, projectId]
  );
  if (!meas) {
    throw { status: 404, code: "MEASUREMENT_NOT_FOUND", message: "Measurement not found" };
  }

  if (meas.is_billed) {
    throw { status: 400, code: "ALREADY_BILLED", message: "Cannot change status of an already-billed measurement" };
  }

  const boqItem = await get("SELECT * FROM boq_items WHERE id = ?", [meas.boq_item_id]);

  // If transitioning to VERIFIED, check BOQ contract quantity cap
  if (normTarget === "VERIFIED" && normalizeStatus(meas.status) !== "VERIFIED") {
    const executedQty = await getExecutedQuantity(meas.boq_item_id, measId);
    const candidateQty = parseFloat(meas.quantity || 0);
    const contractQty = roundDecimal(boqItem.quantity);

    if (executedQty + candidateQty > contractQty + 0.0001) {
      throw {
        status: 400,
        code: "BOQ_EXCEEDED",
        message: `Verification blocked: Total executed quantity (${roundDecimal(executedQty + candidateQty)}) would exceed BOQ contract quantity (${contractQty})`
      };
    }
  }

  await run(
    `UPDATE site_measurements
     SET status = ?, remarks = ?, rejection_reason = ?
     WHERE id = ?`,
    [
      normTarget.toLowerCase(),
      remarks || meas.remarks || null,
      normTarget === "REJECTED" ? (remarks || "Rejected by Site Engineer") : meas.rejection_reason,
      measId
    ]
  );

  const updated = await get(
    `SELECT sm.*, bi.description AS boq_description, bi.category AS boq_category, bi.quantity AS boq_contract_qty, bi.rate AS boq_rate
     FROM site_measurements sm
     JOIN boq_items bi ON bi.id = sm.boq_item_id
     WHERE sm.id = ?`,
    [measId]
  );
  return formatMeasurement(updated);
}

/**
 * PATCH /api/projects/:projectId/measurements/:id/status
 * Update status (DRAFT, VERIFIED, REJECTED)
 */
router.patch("/projects/:projectId/measurements/:id/status", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const measId = parseInt(req.params.id);
  const { status, remarks, rejectionReason } = req.body;

  const result = await updateMeasurementStatus(projectId, measId, status, remarks || rejectionReason);
  return successResponse(res, result);
}));

/**
 * PATCH /api/projects/:projectId/measurements/:id/verify
 * Verification endpoint shortcut
 */
router.patch("/projects/:projectId/measurements/:id/verify", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const measId = parseInt(req.params.id);
  const { remarks } = req.body || {};

  const result = await updateMeasurementStatus(projectId, measId, "VERIFIED", remarks);
  return successResponse(res, result);
}));

/**
 * PATCH /api/projects/:projectId/measurements/:id/reject
 * Rejection endpoint shortcut
 */
router.patch("/projects/:projectId/measurements/:id/reject", asyncWrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const measId = parseInt(req.params.id);
  const { remarks, rejectionReason } = req.body || {};

  const result = await updateMeasurementStatus(projectId, measId, "REJECTED", remarks || rejectionReason);
  return successResponse(res, result);
}));

module.exports = router;
