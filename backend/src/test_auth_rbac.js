const http = require("http");
const app = require("./server.js");

let TEST_PORT = 5001;
let BASE_URL = `http://localhost:${TEST_PORT}`;
let serverInstance = null;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = {};
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = { text: data };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("\n==========================================================================");
  console.log("  BUILDSMART AI — COMPREHENSIVE AUTHENTICATION & RBAC TEST SUITE");
  console.log("==========================================================================\n");

  // Start test server on port 5001
  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`[TEST] Test server active on ${BASE_URL}\n`);
      resolve();
    });
  });

  const ts = Date.now();
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // ═════════════════════════════════════════════════════════════════════
    // SECTION 1: ROLE-SPECIFIC COMPANY FIELD VALIDATION & NORMALIZATION
    // ═════════════════════════════════════════════════════════════════════
    console.log("── SECTION 1: ROLE-SPECIFIC COMPANY FIELD VALIDATION TESTS ────────────");

    // Test 1: Builder + valid company -> 201 SUCCESS
    const builderCompEmail = `b_comp_${ts}@example.com`;
    let res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Builder Comp", email: builderCompEmail, password: "password123", role: "builder", company: " ABC Constructions " },
    });
    assert(res.status === 201 && res.data.user?.company === "ABC Constructions", "Test 1: Builder + valid company -> HTTP 201 SUCCESS (Trimmed)", `Status ${res.status}`);

    // Test 2: Builder + empty company -> 400 Bad Request
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Builder EmptyComp", email: `b_emptycomp_${ts}@example.com`, password: "password123", role: "builder", company: "" },
    });
    assert(res.status === 400 && res.data.error.includes("required for Builder"), "Test 2: Builder + empty company -> HTTP 400 Bad Request", `Status ${res.status}`);

    // Test 3: Builder + whitespace-only company -> 400 Bad Request
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Builder SpaceComp", email: `b_spacecomp_${ts}@example.com`, password: "password123", role: "builder", company: "   " },
    });
    assert(res.status === 400 && res.data.error.includes("required for Builder"), "Test 3: Builder + whitespace company -> HTTP 400 Bad Request", `Status ${res.status}`);

    // Test 4: Builder + missing company field -> 400 Bad Request
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Builder NoCompField", email: `b_nocompfield_${ts}@example.com`, password: "password123", role: "builder" },
    });
    assert(res.status === 400 && res.data.error.includes("required for Builder"), "Test 4: Builder + missing company -> HTTP 400 Bad Request", `Status ${res.status}`);

    // Test 5: Client + valid company -> 201 SUCCESS
    const clientCompEmail = `c_comp_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Client Comp", email: clientCompEmail, password: "password123", role: "client", company: " XYZ Homeowners " },
    });
    assert(res.status === 201 && res.data.user?.company === "XYZ Homeowners", "Test 5: Client + valid company -> HTTP 201 SUCCESS (Trimmed)", `Status ${res.status}`);

    // Test 6: Client + empty company -> 201 SUCCESS (Stored as null)
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Client EmptyComp", email: `c_emptycomp_${ts}@example.com`, password: "password123", role: "client", company: "" },
    });
    assert(res.status === 201 && res.data.user?.company === null, "Test 6: Client + empty company -> HTTP 201 SUCCESS (Normalized to null)", `Status ${res.status}`);

    // Test 7: Client + whitespace-only company -> 201 SUCCESS (Stored as null)
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Client SpaceComp", email: `c_spacecomp_${ts}@example.com`, password: "password123", role: "client", company: "   " },
    });
    assert(res.status === 201 && res.data.user?.company === null, "Test 7: Client + whitespace company -> HTTP 201 SUCCESS (Normalized to null)", `Status ${res.status}`);

    // Test 8: Client + missing company field -> 201 SUCCESS (Stored as null)
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Client NoCompField", email: `c_nocompfield_${ts}@example.com`, password: "password123", role: "client" },
    });
    assert(res.status === 201 && res.data.user?.company === null, "Test 8: Client + missing company field -> HTTP 201 SUCCESS (Stored as null)", `Status ${res.status}`);

    // ═════════════════════════════════════════════════════════════════════
    // SECTION 2: EMAIL UNIQUENESS & CROSS-ROLE DUPLICATE TESTS
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n── SECTION 2: EMAIL UNIQUENESS & DUPLICATE REJECTION TESTS ─────────────");

    const builderEmail = `builder_test_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test Builder", email: builderEmail, password: "password123", role: "builder", company: "Test Corp" },
    });
    assert(res.status === 201, "Test 9: New Builder registration -> HTTP 201 SUCCESS", `Status ${res.status}`);
    const builderToken = res.data.token;

    const clientEmail = `client_test_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test Client", email: clientEmail, password: "password123", role: "client" },
    });
    assert(res.status === 201, "Test 10: New Client registration -> HTTP 201 SUCCESS", `Status ${res.status}`);
    const clientToken = res.data.token;

    // Existing Builder email + Client registration -> 409
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cross Client", email: builderEmail, password: "password123", role: "client" },
    });
    assert(res.status === 409 && res.data.existingRole === "builder", "Test 11: Existing Builder email + Client registration -> HTTP 409 Conflict", `Status ${res.status}`);

    // Existing Client email + Builder registration -> 409
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cross Builder", email: clientEmail, password: "password123", role: "builder", company: "Some Corp" },
    });
    assert(res.status === 409 && res.data.existingRole === "client", "Test 12: Existing Client email + Builder registration -> HTTP 409 Conflict", `Status ${res.status}`);

    // Email capitalization difference -> 409 Conflict
    const capEmailUpper = `Cap_User_${ts}@EXAMPLE.COM`;
    const capEmailLower = `cap_user_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cap User", email: capEmailUpper, password: "password123", role: "builder", company: "Cap Corp" },
    });
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cap User 2", email: capEmailLower, password: "password123", role: "client" },
    });
    assert(res.status === 409, "Test 13: Email case insensitivity duplicate detection -> HTTP 409 Conflict", `Status ${res.status}`);

    // Invalid role ('admin') -> 400
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Bad Role User", email: `badrole_${ts}@example.com`, password: "password123", role: "admin" },
    });
    assert(res.status === 400 && res.data.error.includes("Invalid role"), "Test 14: Invalid role ('admin') rejection -> HTTP 400 Bad Request", `Status ${res.status}`);

    // ═════════════════════════════════════════════════════════════════════
    // SECTION 3: LOGIN TESTS & ANTI-SPOOFING
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n── SECTION 3: LOGIN & ANTI-SPOOFING TESTS ─────────────────────────────");

    // Builder credentials -> 200
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "password123" },
    });
    assert(res.status === 200 && res.data.user?.role === "builder", "Test 15: Builder login -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // Client credentials -> 200
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: clientEmail, password: "password123" },
    });
    assert(res.status === 200 && res.data.user?.role === "client", "Test 16: Client login -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // Wrong password -> 401
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "wrongpassword" },
    });
    assert(res.status === 401, "Test 17: Wrong password -> HTTP 401 Unauthorized", `Status ${res.status}`);

    // Builder + requestedRole=client -> 400 Role Mismatch
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "password123", requestedRole: "client" },
    });
    assert(res.status === 400 && res.data.error.includes("registered as a Builder"), "Test 18: Builder credentials + requestedRole=client -> HTTP 400 Role Mismatch", `Status ${res.status}`);

    // Client + requestedRole=builder -> 400 Role Mismatch
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: clientEmail, password: "password123", requestedRole: "builder" },
    });
    assert(res.status === 400 && res.data.error.includes("registered as a Client"), "Test 19: Client credentials + requestedRole=builder -> HTTP 400 Role Mismatch", `Status ${res.status}`);

    // ═════════════════════════════════════════════════════════════════════
    // SECTION 4: AUTHORIZATION & RESOURCE OWNERSHIP TESTS
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n── SECTION 4: AUTHORIZATION & RESOURCE OWNERSHIP TESTS ────────────────");

    // Unauthenticated access to Builder log creation -> 401
    res = await request("/api/projects/1/logs", {
      method: "POST",
      body: { date: "2026-05-15", workers: 10, tasks: "Unauth task" },
    });
    assert(res.status === 401, "Test 20: Unauthenticated access to protected Builder API -> HTTP 401 Unauthorized", `Status ${res.status}`);

    // Client access to Builder log creation -> 403 Forbidden
    res = await request("/api/projects/1/logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { date: "2026-05-15", workers: 10, tasks: "Client task" },
    });
    assert(res.status === 403, "Test 21: Client user calling Builder-only API -> HTTP 403 Forbidden", `Status ${res.status}`);

    // Client A viewing Client A project -> 200 SUCCESS
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: "priya@gmail.com", password: "password123" },
    });
    const priyaToken = res.data.token;
    res = await request("/api/projects/1", {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(res.status === 200 && res.data.id === 1, "Test 22: Client viewing owned project -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // Client A viewing Client B project -> 403 Forbidden
    res = await request("/api/projects/2", {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(res.status === 403, "Test 23: Client viewing another Client's project -> HTTP 403 Forbidden", `Status ${res.status}`);

    console.log("\n==========================================================================");
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("==========================================================================\n");

    if (serverInstance) serverInstance.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test Execution Exception:", err);
    if (serverInstance) serverInstance.close();
    process.exit(1);
  }
}

runTests();
