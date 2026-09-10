/**
 * RA Billing ↔ Measurement Book Backend Integration Test Suite
 * Validates the 12 integration requirements for Step 3B
 */

"use strict";

const express = require("express");
const { initDatabase, run, get, query } = require("../src/db/mysql");
const raBillingRoutes = require("../src/routes/ra-billing.routes");
const measurementBookRoutes = require("../src/routes/measurement-book.routes");
const projectRoutes = require("../src/routes/projects.routes");
const errorHandler = require("../src/middleware/error.middleware");

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", raBillingRoutes);
  app.use("/api", measurementBookRoutes);
  app.use("/api", projectRoutes);
  app.use(errorHandler);
  return app;
}

async function runRABillingIntegrationTests() {
  console.log("=================================================");
  console.log(" RA BILLING ↔ MEASUREMENT BOOK INTEGRATION TESTS ");
  console.log("=================================================\n");

  await initDatabase();
  const app = buildTestApp();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  
  // Create Test Project, Contractor, Contract, and BOQ Item
  const pRes = await run(
    `INSERT INTO projects (user_id, client_name, name, status, budget, spent, location, area, floors, type, scale, created_at)
     VALUES (1, 'RA Test Client', ?, 'in_progress', 1000000.00, 0.00, 'Test Location', 1000.00, 1, 'residential', 'SMALL', CURRENT_TIMESTAMP)`,
    [`RA Integration Test Project ${timestamp}`]
  );
  const projectId = pRes.lastInsertRowid;

  const cRes = await run(
    `INSERT INTO contractors (project_id, name, company_name, contact, status) VALUES (?, ?, 'BuildCorp', '9876543210', 'active')`,
    [projectId, `Contractor ${timestamp}`]
  );
  const contractorId = cRes.lastInsertRowid;

  const ctRes = await run(
    `INSERT INTO contracts (project_id, contractor_id, contract_number, contract_date, contract_value, status) VALUES (?, ?, ?, '2026-01-01', 5000000.00, 'active')`,
    [projectId, contractorId, `CNTR-${timestamp}`]
  );
  const contractId = ctRes.lastInsertRowid;

  const boqRes = await run(
    `INSERT INTO boq_items (project_id, category, description, unit, quantity, rate, total)
     VALUES (?, 'Concrete', 'RCC M25 Structural Grade', 'cum', 600.0000, 8000.00, 4800000.00)`,
    [projectId]
  );
  const boqItemId = boqRes.lastInsertRowid;

  console.log(`Initialized Test Context: Project #${projectId}, BOQ #${boqItemId} (Contract: 600 cum @ ₹8,000/cum)\n`);

  let measA_Id, measB_Id, measDraft_Id, measRejected_Id;

  try {
    // -----------------------------------------------------------------------
    // Setup Measurements
    // -----------------------------------------------------------------------
    // Meas A: 25 cum (VERIFIED)
    const ma = await run(
      `INSERT INTO site_measurements (project_id, boq_item_id, measurement_date, description, quantity, unit, recorded_by, status)
       VALUES (?, ?, '2026-09-10', 'Beam Casting Block A', 25.0000, 'cum', 'Engineer A', 'VERIFIED')`,
      [projectId, boqItemId]
    );
    measA_Id = ma.lastInsertRowid;

    // Meas B: 40 cum (VERIFIED)
    const mb = await run(
      `INSERT INTO site_measurements (project_id, boq_item_id, measurement_date, description, quantity, unit, recorded_by, status)
       VALUES (?, ?, '2026-09-11', 'Slab Casting Block A', 40.0000, 'cum', 'Engineer B', 'VERIFIED')`,
      [projectId, boqItemId]
    );
    measB_Id = mb.lastInsertRowid;

    // Meas Draft: 10 cum (DRAFT)
    const md = await run(
      `INSERT INTO site_measurements (project_id, boq_item_id, measurement_date, description, quantity, unit, recorded_by, status)
       VALUES (?, ?, '2026-09-11', 'Column Casting Block A', 10.0000, 'cum', 'Engineer C', 'DRAFT')`,
      [projectId, boqItemId]
    );
    measDraft_Id = md.lastInsertRowid;

    // Meas Rejected: 15 cum (REJECTED)
    const mr = await run(
      `INSERT INTO site_measurements (project_id, boq_item_id, measurement_date, description, quantity, unit, recorded_by, status)
       VALUES (?, ?, '2026-09-11', 'Parapet Casting Block A', 15.0000, 'cum', 'Engineer D', 'REJECTED')`,
      [projectId, boqItemId]
    );
    measRejected_Id = mr.lastInsertRowid;

    // -----------------------------------------------------------------------
    // Test 1: Verified measurement can be billed & produces correct quantities/amounts
    // -----------------------------------------------------------------------
    console.log("Test 1: Create RA-01 with Measurement A (25 cum)...");
    const ra1Res = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        contractorId,
        measurementIds: [measA_Id]
      })
    });
    const ra1Data = await ra1Res.json();
    assert(ra1Res.status === 201, "RA-01 created with HTTP 201");
    assert(ra1Data.data?.billNumber === "RA-01", "Bill number generated as RA-01");

    const bill1Id = ra1Data.data?.bill?.id;

    // Check RA bill items for RA-01
    const item1 = await get("SELECT * FROM ra_bill_items WHERE ra_bill_id = ?", [bill1Id]);
    assert(Number(item1.previously_billed_quantity) === 0, "RA-01 Previous Qty = 0");
    assert(Number(item1.current_quantity) === 25, "RA-01 Current Qty = 25");
    assert(Number(item1.cumulative_quantity) === 25, "RA-01 Cumulative Qty = 25");
    assert(Number(item1.contract_rate) === 8000, "RA-01 Rate derived from BOQ contract rate (8000)");
    assert(Number(item1.this_bill_amount) === 200000, "RA-01 This Bill Amount = ₹200,000 (25 × 8000)");
    assert(Number(item1.cumulative_amount) === 200000, "RA-01 Cumulative Amount = ₹200,000");

    // Check Measurement A links
    const measACheck = await get("SELECT * FROM site_measurements WHERE id = ?", [measA_Id]);
    assert(measACheck.is_billed === 1, "Measurement A marked is_billed = 1");
    assert(measACheck.ra_bill_id === bill1Id, "Measurement A ra_bill_id linked");
    assert(measACheck.ra_bill_item_id === item1.id, "Measurement A ra_bill_item_id linked");

    // -----------------------------------------------------------------------
    // Test 2: Double billing protection (Already billed measurement)
    // -----------------------------------------------------------------------
    console.log("\nTest 2: Attempting to bill already-billed Measurement A again...");
    const raDupRes = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        contractorId,
        measurementIds: [measA_Id]
      })
    });
    const raDupData = await raDupRes.json();
    assert(raDupRes.status === 400, "Duplicate billing returned HTTP 400");
    assert(raDupData.error?.code === "ALREADY_BILLED", "Error code ALREADY_BILLED returned");

    // -----------------------------------------------------------------------
    // Test 3: Unverified / Draft measurement rejection
    // -----------------------------------------------------------------------
    console.log("\nTest 3: Attempting to bill DRAFT measurement...");
    const raDraftRes = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        contractorId,
        measurementIds: [measDraft_Id]
      })
    });
    const raDraftData = await raDraftRes.json();
    assert(raDraftRes.status === 400, "Draft measurement billing returned HTTP 400");
    assert(raDraftData.error?.code === "UNVERIFIED_MEASUREMENT", "Error code UNVERIFIED_MEASUREMENT returned");

    // -----------------------------------------------------------------------
    // Test 4: Create RA-02 with Measurement B (40 cum) & test previous quantity logic
    // -----------------------------------------------------------------------
    // Submit RA-01 so it's counted in previous quantity for RA-02
    await run("UPDATE ra_bills SET status = 'submitted' WHERE id = ?", [bill1Id]);

    console.log("\nTest 4: Create RA-02 with Measurement B (40 cum)...");
    const ra2Res = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        contractorId,
        measurementIds: [measB_Id]
      })
    });
    const ra2Data = await ra2Res.json();
    assert(ra2Res.status === 201, "RA-02 created with HTTP 201");
    
    const bill2Id = ra2Data.data?.bill?.id;
    const item2 = await get("SELECT * FROM ra_bill_items WHERE ra_bill_id = ?", [bill2Id]);
    assert(Number(item2.previously_billed_quantity) === 25, "RA-02 Previous Qty = 25 (from RA-01)");
    assert(Number(item2.current_quantity) === 40, "RA-02 Current Qty = 40");
    assert(Number(item2.cumulative_quantity) === 65, "RA-02 Cumulative Qty = 65 (25 + 40)");
    assert(Number(item2.this_bill_amount) === 320000, "RA-02 This Bill Amount = ₹320,000 (40 × 8000)");
    assert(Number(item2.cumulative_amount) === 520000, "RA-02 Cumulative Amount = ₹520,000 (65 × 8000)");

    // -----------------------------------------------------------------------
    // Test 5: BOQ contract quantity cap enforcement
    // -----------------------------------------------------------------------
    console.log("\nTest 5: BOQ contract quantity cap enforcement...");
    // Create large verified measurement (600 cum - 65 cum = 535 cum remaining, insert 600 cum)
    const mExceed = await run(
      `INSERT INTO site_measurements (project_id, boq_item_id, measurement_date, description, quantity, unit, recorded_by, status)
       VALUES (?, ?, '2026-09-11', 'Excessive Excavation', 600.0000, 'cum', 'Engineer E', 'VERIFIED')`,
      [projectId, boqItemId]
    );
    const measExceed_Id = mExceed.lastInsertRowid;

    const raCapRes = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        contractorId,
        measurementIds: [measExceed_Id]
      })
    });
    const raCapData = await raCapRes.json();
    assert(raCapRes.status === 400, "Excess quantity returned HTTP 400");
    assert(raCapData.error?.code === "QUANTITY_EXCEEDS_BOQ", "Error code QUANTITY_EXCEEDS_BOQ returned");

    // -----------------------------------------------------------------------
    // Test 6: RA Bill Rejection releases linked measurements
    // -----------------------------------------------------------------------
    console.log("\nTest 6: Rejecting RA-02 releases Measurement B...");
    // Transition RA-02: draft → submitted → rejected
    await run("UPDATE ra_bills SET status = 'submitted' WHERE id = ?", [bill2Id]);
    
    const rejectRes = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills/${bill2Id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", reason: "Quantity discrepancy" })
    });
    assert(rejectRes.status === 200, "RA-02 status updated to rejected (HTTP 200)");

    const measBCheck = await get("SELECT * FROM site_measurements WHERE id = ?", [measB_Id]);
    assert(measBCheck.is_billed === 0, "Measurement B released: is_billed = 0");
    assert(measBCheck.ra_bill_id === null, "Measurement B released: ra_bill_id = NULL");
    assert(measBCheck.ra_bill_item_id === null, "Measurement B released: ra_bill_item_id = NULL");
    assert(measBCheck.status.toUpperCase() === "VERIFIED", "Measurement B retains VERIFIED status");

    // Check Measurement A from RA-01 was NOT released
    const measACheckStill = await get("SELECT * FROM site_measurements WHERE id = ?", [measA_Id]);
    assert(measACheckStill.is_billed === 1, "Measurement A from RA-01 remains billed (is_billed = 1)");

    // -----------------------------------------------------------------------
    // Test 7: Excel Export still returns XLSX successfully
    // -----------------------------------------------------------------------
    console.log("\nTest 7: Excel export downloads XLSX successfully...");
    const excelRes = await fetch(`${baseUrl}/api/projects/${projectId}/ra-bills/${bill1Id}/export`);
    assert(excelRes.status === 200, "Excel export returns HTTP 200");
    assert(excelRes.headers.get("content-type").includes("spreadsheetml"), "Content-Type is Excel spreadsheet");

  } finally {
    server.close();
  }

  console.log("\n=================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRABillingIntegrationTests().catch(err => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
