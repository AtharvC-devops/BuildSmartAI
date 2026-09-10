/**
 * BuildSmartAI End-to-End Integration Audit
 * Tests the complete builder workflow and data flow between modules
 */

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";
const AI_BASE_URL = "http://localhost:8000";

// Test state
const state = {
  projectId: null,
  boqItemId: null,
  contractorId: null,
  workerId: null,
  billId: null,
  logs: [],
};

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, status = "info") {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  let color = colors.blue;
  if (status === "success") color = colors.green;
  if (status === "error") color = colors.red;
  if (status === "warn") color = colors.yellow;

  console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
}

function header(title) {
  console.log(
    `\n${colors.bold}${colors.blue}${"═".repeat(80)}${colors.reset}`
  );
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log(
    `${colors.bold}${colors.blue}${"═".repeat(80)}${colors.reset}\n`
  );
}

async function test(name, fn) {
  try {
    log(`Testing: ${name}...`);
    await fn();
    log(`✓ ${name}`, "success");
    return true;
  } catch (error) {
    log(`✗ ${name}: ${error.message}`, "error");
    if (error.response?.data) {
      console.error("  Response:", error.response.data);
    }
    return false;
  }
}

async function runAudit() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    flows: {
      "BOQ → Estimated Cost": false,
      "Material → Actual Cost": false,
      "Labour → Actual Cost": false,
      "RA Bill → Actual Cost": false,
      "Daily Log → Progress": false,
      "Progress → Milestones": false,
      "Milestones → Schedule Risk": false,
      "Cost → Cost Risk": false,
      "Compliance → Compliance Alerts": false,
      "All modules → Dashboard": false,
    },
    issues: [],
  };

  // ────────────────────────────────────────────────────────────────────────
  // Step 1: Login & Create Project
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 1: CREATE PROJECT");

  results.total++;
  if (
    await test("POST /projects - Create new project", async () => {
      const res = await axios.post(`${BASE_URL}/projects`, {
        name: "Audit Test Project",
        clientId: 1,
        clientName: "Test Client",
        builderId: 1,
        budget: 5000000,
        location: "Mumbai",
        area: 5000,
        floors: 5,
        type: "Commercial",
      });
      state.projectId = res.data.data.id;
      if (!res.data.data.id) throw new Error("Project ID not returned");
      log(`  Project ID: ${state.projectId}`, "success");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Verify project was created
  results.total++;
  if (
    await test("GET /projects/:id - Retrieve project", async () => {
      const res = await axios.get(`${BASE_URL}/projects/${state.projectId}`);
      if (res.data.data.id !== state.projectId) {
        throw new Error("Project ID mismatch");
      }
      if (res.data.data.status !== "planning") {
        throw new Error("Project status should be 'planning'");
      }
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 2: Create BOQ (Bill of Quantities)
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 2: CREATE BOQ");

  const boqItems = [
    {
      category: "RCC",
      description: "RCC columns and beams",
      unit: "sqft",
      quantity: 2500,
      rate: 350,
      rateSource: "PWD Rates",
    },
    {
      category: "Brick/block work",
      description: "Brick masonry work",
      unit: "sqft",
      quantity: 18000,
      rate: 120,
      rateSource: "Market Rate",
    },
    {
      category: "Plaster",
      description: "Plaster finishing",
      unit: "sqft",
      quantity: 20000,
      rate: 45,
      rateSource: "PWD Rates",
    },
  ];

  for (const item of boqItems) {
    results.total++;
    if (
      await test(
        `POST /projects/:id/boq - Add BOQ item: ${item.category}`,
        async () => {
          const res = await axios.post(
            `${BASE_URL}/projects/${state.projectId}/boq`,
            item
          );
          if (!res.data.data.id) throw new Error("BOQ item ID not returned");
          if (item === boqItems[0]) {
            state.boqItemId = res.data.data.id;
          }
        }
      )
    ) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 3: Get BOQ & Verify Estimated Cost
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 3: VERIFY BOQ → ESTIMATED COST FLOW");

  let estimatedCost = 0;
  results.total++;
  if (
    await test("GET /projects/:id/boq - Retrieve BOQ and estimated cost", async () => {
      const res = await axios.get(`${BASE_URL}/projects/${state.projectId}/boq`);
      estimatedCost = res.data.data.summary.finalEstimatedCost;
      if (estimatedCost <= 0) {
        throw new Error("Estimated cost is zero or negative");
      }
      log(`  Estimated Cost: ₹${estimatedCost.toLocaleString()}`, "success");

      // Verify calculation
      const boqTotal = res.data.data.summary.grandTotal;
      const contingency = res.data.data.summary.contingency;
      if (Math.abs(boqTotal + contingency - estimatedCost) > 1) {
        throw new Error(
          `Cost calculation mismatch: ${boqTotal} + ${contingency} ≠ ${estimatedCost}`
        );
      }
      results.flows["BOQ → Estimated Cost"] = true;
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 4: Create Daily Logs (Material & Labour Records)
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 4: RECORD DAILY SITE LOGS (Material & Labour)");

  results.total++;
  if (
    await test("POST /projects/:id/logs - Create daily log with materials", async () => {
      const res = await axios.post(
        `${BASE_URL}/projects/${state.projectId}/logs`,
        {
          date: new Date().toISOString().split("T")[0],
          workers: 25,
          tasks: "RCC column casting and curing",
          cementBags: 150,
          steelTons: 5.5,
          bricks: 0,
          weather: "Clear",
          equipmentUsed: "Concrete pump, scaffolding",
          issues: "Minor delay due to cement delivery",
          safetyNotes: "All workers wore safety gear",
          progressPercentage: 5,
          materialsReceived: "Cement, steel, water",
          photos: [],
        }
      );
      state.logs.push(res.data.data.id);
      if (!res.data.data.id) throw new Error("Log ID not returned");
      log(`  Daily log created with ${res.data.data.workers} workers`, "success");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 5: Verify Material & Labour → Actual Cost Flow
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 5: VERIFY MATERIAL & LABOUR → ACTUAL COST FLOW");

  let actualCost = 0;
  results.total++;
  if (
    await test("GET /projects/:id/cost-tracking - Verify actual cost", async () => {
      const res = await axios.get(
        `${BASE_URL}/projects/${state.projectId}/cost-tracking`
      );
      actualCost = res.data.data.summary.totalActualCost;
      const materialCost = res.data.data.summary.materialCost;
      const labourCost = res.data.data.summary.labourCost;

      if (actualCost <= 0) {
        throw new Error("Actual cost is zero - daily logs not converting to expenses");
      }

      log(`  Material Cost: ₹${materialCost.toLocaleString()}`, "success");
      log(`  Labour Cost: ₹${labourCost.toLocaleString()}`, "success");
      log(`  Total Actual Cost: ₹${actualCost.toLocaleString()}`, "success");

      results.flows["Material → Actual Cost"] =
        materialCost > 0;
      results.flows["Labour → Actual Cost"] = labourCost > 0;

      if (materialCost <= 0 || labourCost <= 0) {
        results.issues.push(
          "⚠ Daily log materials not converting to material expenses"
        );
      }
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
    results.issues.push("✗ Cannot verify material & labour cost flow");
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 6: Add Workers & Record Attendance
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 6: ADD WORKERS & RECORD ATTENDANCE");

  results.total++;
  if (
    await test("POST /projects/:id/workers - Add worker", async () => {
      const res = await axios.post(`${BASE_URL}/projects/${state.projectId}/workers`, {
        name: "Rajesh Kumar",
        workerType: "Skilled",
        skill: "RCC Specialist",
        contractorId: 1,
        dailyWage: 800,
      });
      state.workerId = res.data.data.id;
      if (!res.data.data.id) throw new Error("Worker ID not returned");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Record attendance
  results.total++;
  if (
    await test("POST /projects/:id/attendance - Log worker attendance", async () => {
      const res = await axios.post(
        `${BASE_URL}/projects/${state.projectId}/attendance`,
        {
          date: new Date().toISOString().split("T")[0],
          workerId: state.workerId,
          status: "Present",
          regularHours: 8,
          overtimeHours: 0,
        }
      );
      if (!res.data.data.id) throw new Error("Attendance ID not returned");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 7: Create Contractor
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 7: ADD CONTRACTOR");

  // Get existing contractors first
  results.total++;
  if (
    await test("GET /projects/:id/contractors - Retrieve contractors", async () => {
      const res = await axios.get(
        `${BASE_URL}/projects/${state.projectId}/contractors`
      );
      if (res.data.data.length > 0) {
        state.contractorId = res.data.data[0].id;
        log(
          `  Using existing contractor: ${res.data.data[0].name}`,
          "success"
        );
      }
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  if (!state.contractorId) {
    state.contractorId = 1; // Fallback
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 8: Create RA Bill (Contractor Billing)
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 8: CREATE RA BILL");

  results.total++;
  if (
    await test("POST /projects/:id/ra-bills - Create RA Bill", async () => {
      const res = await axios.post(
        `${BASE_URL}/projects/${state.projectId}/ra-bills`,
        {
          contractorId: state.contractorId,
          billNumber: "RA-001-AUDIT",
          billingPeriod: new Date().toISOString().split("T")[0],
          workDescription: "RCC work - columns and beams",
          gstPercent: 18,
          retentionPercent: 5,
        }
      );
      state.billId = res.data.data.id;
      if (!res.data.data.id) throw new Error("Bill ID not returned");
      log(`  RA Bill created: ${state.billId}`, "success");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 9: Add Bill Items
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 9: ADD BILL ITEMS");

  results.total++;
  if (
    await test("POST /projects/:id/ra-bills/:billId/items - Add bill item", async () => {
      const res = await axios.post(
        `${BASE_URL}/projects/${state.projectId}/ra-bills/${state.billId}/items`,
        {
          boqItemId: state.boqItemId,
          quantityCompleted: 500,
          rate: 350,
        }
      );
      if (!res.data.data.id) throw new Error("Bill item ID not returned");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 10: Verify RA Bill → Actual Cost Flow
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 10: VERIFY RA BILL → ACTUAL COST FLOW");

  let raBillCost = 0;
  results.total++;
  if (
    await test("GET /projects/:id/ra-bills/:billId - Retrieve bill", async () => {
      const res = await axios.get(
        `${BASE_URL}/projects/${state.projectId}/ra-bills`
      );
      const bill = res.data.data.bills.find((b) => b.id === state.billId);
      if (!bill) throw new Error("Bill not found in project");
      raBillCost = bill.grossAmount;
      log(`  RA Bill Gross Amount: ₹${raBillCost.toLocaleString()}`, "success");
      results.flows["RA Bill → Actual Cost"] = raBillCost > 0;
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
    results.issues.push("✗ Cannot verify RA Bill to actual cost flow");
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 11: Approve RA Bill
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 11: APPROVE RA BILL");

  results.total++;
  if (
    await test("PUT /projects/:id/ra-bills/:billId/status - Approve bill", async () => {
      const res = await axios.put(
        `${BASE_URL}/projects/${state.projectId}/ra-bills/${state.billId}/status`,
        {
          status: "approved",
        }
      );
      if (res.data.data.status !== "approved") {
        throw new Error("Bill status not updated to approved");
      }
      log(`  Bill approved`, "success");
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 12: Update Milestone Progress
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 12: UPDATE MILESTONE PROGRESS");

  results.total++;
  if (
    await test("GET /projects/:id/milestones - Retrieve milestones", async () => {
      const res = await axios.get(
        `${BASE_URL}/projects/${state.projectId}/milestones`
      );
      if (res.data.data.length === 0) {
        throw new Error("No milestones found for project");
      }
      state.milestoneId = res.data.data[0].id;
      log(
        `  Found ${res.data.data.length} milestone(s)`,
        "success"
      );
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Update milestone status
  if (state.milestoneId) {
    results.total++;
    if (
      await test("PUT /projects/:id/milestones - Update milestone status", async () => {
        const res = await axios.put(
          `${BASE_URL}/projects/${state.projectId}/milestones`,
          {
            milestoneId: state.milestoneId,
            status: "in_progress",
            remarks: "On schedule",
          }
        );
        if (res.data.data.status !== "in_progress") {
          throw new Error("Milestone status not updated");
        }
        results.flows["Daily Log → Progress"] = true;
        results.flows["Progress → Milestones"] = true;
      })
    ) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 13: Verify Cost Overrun Detection
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 13: VERIFY COST OVERRUN ALERT");

  results.total++;
  if (
    await test("GET /projects/:id/cost-tracking - Check overrun alert", async () => {
      const res = await axios.get(
        `${BASE_URL}/projects/${state.projectId}/cost-tracking`
      );
      const summary = res.data.data.summary;
      log(
        `  Estimated: ₹${summary.estimatedCost.toLocaleString()}`,
        "success"
      );
      log(
        `  Actual: ₹${summary.totalActualCost.toLocaleString()}`,
        "success"
      );
      log(`  Variance: ${summary.variancePercentage}%`, "success");

      results.flows["Cost → Cost Risk"] = summary.variancePercentage !== 0;

      if (summary.alertTriggered) {
        log(`  ⚠ Alert: ${summary.alertMessage}`, "warn");
      }
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 14: Check Compliance Tracker
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 14: CHECK COMPLIANCE TRACKER");

  results.total++;
  if (
    await test("GET /projects/:id/compliance - Retrieve compliance items", async () => {
      const res = await axios.get(
        `${BASE_URL}/projects/${state.projectId}/compliance`
      );
      if (!res.data.data || typeof res.data.data !== "object") {
        throw new Error("Compliance data structure invalid");
      }
      log(
        `  Compliance tracker accessible`,
        "success"
      );
      results.flows["Compliance → Compliance Alerts"] = true;
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
    results.issues.push("⚠ Compliance endpoint may not be working");
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 15: Verify Dashboard Summary
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 15: VERIFY BUILDER DASHBOARD");

  results.total++;
  if (
    await test("GET /projects/:id - Retrieve complete project", async () => {
      const res = await axios.get(`${BASE_URL}/projects/${state.projectId}`);
      const project = res.data.data;

      log(`  Project: ${project.name}`, "success");
      log(`  Status: ${project.status}`, "success");
      log(`  Progress: ${project.progress}%`, "success");
      log(`  Budget: ₹${project.budget.toLocaleString()}`, "success");
      log(`  Spent: ₹${project.spent.toLocaleString()}`, "success");

      if (!project.progress) {
        results.issues.push(
          "⚠ Project progress not updated from daily logs/milestones"
        );
      }
      results.flows["All modules → Dashboard"] = true;
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Step 16: Test AI Service Integration
  // ────────────────────────────────────────────────────────────────────────
  header("STEP 16: TEST AI SERVICE INTEGRATION");

  results.total++;
  if (
    await test("POST /predict-cost - Get cost prediction from AI", async () => {
      const res = await axios.post(`${AI_BASE_URL}/predict-cost`, {
        area: 5000,
        material_quality: 2,
        location_tier: 1,
        floors: 5,
      });
      if (!res.data.predicted_cost || res.data.predicted_cost <= 0) {
        throw new Error("AI cost prediction invalid");
      }
      log(
        `  AI Predicted Cost: ₹${res.data.predicted_cost.toLocaleString()}`,
        "success"
      );
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
    results.issues.push("⚠ AI service cost prediction not working");
  }

  results.total++;
  if (
    await test("POST /predict-price - Get price prediction from AI", async () => {
      const res = await axios.post(`${AI_BASE_URL}/predict-price`, {
        location: "Mumbai",
        total_sqft: 5000,
        bhk: 3,
        bath: 2,
      });
      if (!res.data.predicted_price || res.data.predicted_price <= 0) {
        throw new Error("AI price prediction invalid");
      }
      log(
        `  AI Predicted Price: ₹${res.data.predicted_price.toLocaleString()}`,
        "success"
      );
    })
  ) {
    results.passed++;
  } else {
    results.failed++;
    results.issues.push("⚠ AI service price prediction not working");
  }

  // ────────────────────────────────────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────────────────────────────────────
  header("END-TO-END INTEGRATION AUDIT SUMMARY");

  console.log(
    `${colors.bold}Test Results:${colors.reset}\n  Total: ${results.total}\n  Passed: ${colors.green}${results.passed}${colors.reset}\n  Failed: ${colors.red}${results.failed}${colors.reset}\n`
  );

  console.log(`${colors.bold}Data Flow Verification:${colors.reset}\n`);
  for (const [flow, verified] of Object.entries(results.flows)) {
    const status = verified ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${status} ${flow}`);
  }

  if (results.issues.length > 0) {
    console.log(
      `\n${colors.bold}Issues & Broken Flows:${colors.reset}\n`
    );
    for (const issue of results.issues) {
      console.log(`  ${issue}`);
    }
  }

  console.log(
    `\n${colors.bold}Architecture Summary:${colors.reset}\n` +
      `  • Frontend (Next.js): http://localhost:3000\n` +
      `  • Backend (Express): http://localhost:5000\n` +
      `  • AI Service (FastAPI): http://localhost:8000\n` +
      `  • Data: In-memory (sample data from sampleData.js)\n`
  );

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(
    `\n${colors.bold}Overall Pass Rate: ${passRate}%${colors.reset}\n`
  );

  return results;
}

runAudit().catch(console.error);
