/**
 * Measurement Book Module - Step 1 Automated Test Suite
 * Standalone test runner using native Node fetch
 */

"use strict";

const express = require("express");
const { initDatabase, run } = require("../src/db/mysql");
const aiRoutes = require("../src/routes/ai.routes");
const persistentRoutes = require("../src/routes/persistent.routes");
const raBillingRoutes = require("../src/routes/ra-billing.routes");
const measurementBookRoutes = require("../src/routes/measurement-book.routes");
const projectRoutes = require("../src/routes/projects.routes");
const errorHandler = require("../src/middleware/error.middleware");

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", aiRoutes);
  app.use("/api", persistentRoutes);
  app.use("/api", raBillingRoutes);
  app.use("/api", measurementBookRoutes);
  app.use("/api", projectRoutes);
  app.use(errorHandler);
  return app;
}

async function runTests() {
  console.log("=================================================");
  console.log("   MEASUREMENT BOOK MODULE - AUTOMATED TESTS     ");
  console.log("=================================================\n");

  await initDatabase();
  const app = buildTestApp();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Test server running at ${baseUrl}\n`);

  let testProjectId;
  let testBoqItemId;
  const uniqueTimestamp = Date.now();

  // Create a clean test project & BOQ item
  const pRes = await run(
    `INSERT INTO projects (user_id, client_name, name, status, budget, spent, location, area, floors, type, scale, created_at)
     VALUES (1, 'Test Client', ?, 'in_progress', 500000.00, 0.00, 'Test Location', 1000.00, 1, 'residential', 'SMALL', CURRENT_TIMESTAMP)`,
    [`Test Measurement Project ${uniqueTimestamp}`]
  );
  testProjectId = pRes.lastInsertRowid;

  const boqRes = await run(
    `INSERT INTO boq_items (project_id, category, description, unit, quantity, rate, total)
     VALUES (?, 'Excavation', 'Earthwork Excavation in foundation', 'cum', 100.0000, 500.00, 50000.00)`,
    [testProjectId]
  );
  testBoqItemId = boqRes.lastInsertRowid;

  console.log(`Initialized Test Project ID: ${testProjectId}, BOQ Item ID: ${testBoqItemId} (Contract Qty: 100.00 cum)\n`);

  let draftMeasId;
  let dimMeasId;
  let directMeasId;

  // -------------------------------------------------------------------------
  // Test 1: Create draft measurement
  // -------------------------------------------------------------------------
  console.log("Test 1: Create draft measurement...");
  const res1 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boqItemId: testBoqItemId,
      measurementDate: "2026-09-11",
      description: "Initial foundation excavation",
      location: "Grid A1-A5",
      quantity: 15.5,
      unit: "cum",
      recordedBy: "Junior Site Engineer",
      remarks: "Draft entry for review"
    })
  });
  const body1 = await res1.json();

  if (res1.status === 201 && body1.data.status === "DRAFT" && body1.data.quantity === 15.5) {
    draftMeasId = body1.data.id;
    console.log("  ✅ PASSED - Created draft measurement ID:", draftMeasId);
  } else {
    console.error("  ❌ FAILED:", res1.status, body1);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 2: Calculate quantity from dimensions
  // -------------------------------------------------------------------------
  console.log("\nTest 2: Calculate quantity from dimensions (L=10, B=5, D=2, N=2)...");
  const res2 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boqItemId: testBoqItemId,
      measurementDate: "2026-09-11",
      description: "Trench excavation block 1",
      location: "Grid B1",
      length: 10,
      breadth: 5,
      depthOrHeight: 2,
      numberOfUnits: 2,
      unit: "cum"
    })
  });
  const body2 = await res2.json();

  // 10 * 5 * 2 * 2 = 200
  if (res2.status === 201 && body2.data.quantity === 200) {
    dimMeasId = body2.data.id;
    console.log("  ✅ PASSED - Calculated dimension quantity: 200 cum (L*B*D*N)");
  } else {
    console.error("  ❌ FAILED:", res2.status, body2);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 3: Direct quantity measurement
  // -------------------------------------------------------------------------
  console.log("\nTest 3: Direct quantity measurement...");
  const res3 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boqItemId: testBoqItemId,
      measurementDate: "2026-09-11",
      description: "Direct spot excavation",
      location: "Grid C1",
      quantity: 25.0,
      unit: "cum"
    })
  });
  const body3 = await res3.json();

  if (res3.status === 201 && body3.data.quantity === 25.0) {
    directMeasId = body3.data.id;
    console.log("  ✅ PASSED - Direct quantity stored: 25.0 cum");
  } else {
    console.error("  ❌ FAILED:", res3.status, body3);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 4: Verify measurement
  // -------------------------------------------------------------------------
  console.log("\nTest 4: Verify measurement (ID: " + directMeasId + ")...");
  const res4 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements/${directMeasId}/verify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks: "Site engineer verified on site" })
  });
  const body4 = await res4.json();

  if (res4.status === 200 && body4.data.status === "VERIFIED") {
    console.log("  ✅ PASSED - Measurement verified successfully");
  } else {
    console.error("  ❌ FAILED:", res4.status, body4);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 5: Reject measurement
  // -------------------------------------------------------------------------
  console.log("\nTest 5: Reject measurement (ID: " + draftMeasId + ")...");
  const res5 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements/${draftMeasId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks: "Incorrect depth recorded" })
  });
  const body5 = await res5.json();

  if (res5.status === 200 && body5.data.status === "REJECTED") {
    console.log("  ✅ PASSED - Measurement rejected successfully");
  } else {
    console.error("  ❌ FAILED:", res5.status, body5);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 6: Verified quantity updates executed quantity
  // -------------------------------------------------------------------------
  console.log("\nTest 6: Verified quantity updates executed quantity...");
  const res6 = await fetch(`${baseUrl}/api/projects/${testProjectId}/boq/${testBoqItemId}/measurements`);
  const body6 = await res6.json();

  if (
    res6.status === 200 &&
    body6.data.summary.executedQuantity === 25.0 &&
    body6.data.summary.remainingQuantity === 75.0
  ) {
    console.log(`  ✅ PASSED - Executed Qty: ${body6.data.summary.executedQuantity} cum, Remaining Qty: ${body6.data.summary.remainingQuantity} cum (Only VERIFIED measurements counted)`);
  } else {
    console.error("  ❌ FAILED:", res6.status, body6);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 7: Prevent verification when BOQ quantity would be exceeded
  // -------------------------------------------------------------------------
  console.log("\nTest 7: Prevent verification when BOQ quantity would be exceeded...");
  const res7 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements/${dimMeasId}/verify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks: "Attempting to verify oversized measurement" })
  });
  const body7 = await res7.json();
  const code7 = body7.code || body7.error?.code;

  if (res7.status === 400 && code7 === "BOQ_EXCEEDED") {
    console.log("  ✅ PASSED - Verification blocked cleanly with HTTP 400 BOQ_EXCEEDED");
  } else {
    console.error("  ❌ FAILED:", res7.status, body7);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 8: Unit mismatch validation
  // -------------------------------------------------------------------------
  console.log("\nTest 8: Unit mismatch validation...");
  const res8 = await fetch(`${baseUrl}/api/projects/${testProjectId}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boqItemId: testBoqItemId,
      measurementDate: "2026-09-11",
      description: "Plastering measurement",
      quantity: 10,
      unit: "sqm" // Contract unit is 'cum'
    })
  });
  const body8 = await res8.json();
  const code8 = body8.code || body8.error?.code;

  if (res8.status === 400 && code8 === "UNIT_MISMATCH") {
    console.log("  ✅ PASSED - Blocked creation due to unit mismatch ('sqm' vs 'cum')");
  } else {
    console.error("  ❌ FAILED:", res8.status, body8);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 9: Invalid project/BOQ relationship
  // -------------------------------------------------------------------------
  console.log("\nTest 9: Invalid project/BOQ relationship...");
  const otherP = await run(
    `INSERT INTO projects (user_id, client_name, name, status, budget, spent, location, area, floors, type, scale, created_at)
     VALUES (1, 'Test Client 2', 'Other Project', 'in_progress', 500000.00, 0.00, 'Location 2', 1000.00, 1, 'residential', 'SMALL', CURRENT_TIMESTAMP)`
  );
  const otherProjectId = otherP.lastInsertRowid;

  const res9 = await fetch(`${baseUrl}/api/projects/${otherProjectId}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boqItemId: testBoqItemId, // Belongs to testProjectId, not otherProjectId
      measurementDate: "2026-09-11",
      quantity: 10,
      unit: "cum"
    })
  });
  const body9 = await res9.json();
  const code9 = body9.code || body9.error?.code;

  if (res9.status === 400 && code9 === "INVALID_BOQ_RELATIONSHIP") {
    console.log("  ✅ PASSED - Blocked creation due to BOQ item / Project mismatch");
  } else {
    console.error("  ❌ FAILED:", res9.status, body9);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 10: Confirm existing RA Billing + Excel export still works
  // -------------------------------------------------------------------------
  console.log("\nTest 10: Confirm existing RA Billing + Excel export still works...");
  const res10a = await fetch(`${baseUrl}/api/projects/${testProjectId}/ra-bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contractId: 1,
      contractorId: 1,
      measurementIds: [directMeasId],
      gstRate: 18,
      retentionRate: 5
    })
  });
  const body10a = await res10a.json();

  if (res10a.status !== 201) {
    console.error("  ❌ FAILED to create RA bill:", res10a.status, body10a);
    process.exit(1);
  }
  const raBillId = body10a.data.bill?.id || body10a.data.id;
  console.log(`  Created RA Bill ID: ${raBillId} (${body10a.data.bill?.billNumber || body10a.data.billNumber})`);

  const res10b = await fetch(`${baseUrl}/api/projects/${testProjectId}/ra-bills/${raBillId}/export`);
  const buf = await res10b.arrayBuffer();

  if (res10b.status === 200 && res10b.headers.get("content-type").includes("spreadsheetml") && buf.byteLength > 1000) {
    console.log(`  ✅ PASSED - RA Bill created & Excel export downloaded successfully (HTTP 200, XLSX size: ${buf.byteLength} bytes)`);
  } else {
    console.error("  ❌ FAILED Excel export:", res10b.status, res10b.headers);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("   ALL 10 TEST CASES PASSED SUCCESSFULLY! 🎉      ");
  console.log("=================================================");

  server.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
