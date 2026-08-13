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
    // SECTION 1: AUTHENTICATION & REGISTRATION TESTS
    // ═════════════════════════════════════════════════════════════════════
    console.log("── SECTION 1: REGISTRATION & AUTHENTICATION TESTS ───────────────────────");

    // Test 1: New Builder Registration -> 201
    const builderEmail = `builder_test_${ts}@example.com`;
    let res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test Builder", email: builderEmail, password: "password123", role: "builder", company: "Test Corp" },
    });
    assert(res.status === 201 && res.data.user?.role === "builder", "Test 1: New Builder registration -> HTTP 201 SUCCESS", `Status ${res.status}`);
    const builderToken = res.data.token;

    // Test 2: New Client Registration -> 201
    const clientEmail = `client_test_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test Client", email: clientEmail, password: "password123", role: "client" },
    });
    assert(res.status === 201 && res.data.user?.role === "client", "Test 2: New Client registration -> HTTP 201 SUCCESS", `Status ${res.status}`);
    const clientToken = res.data.token;

    // Test 3: Existing Builder email + Builder registration -> 409
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Dup Builder", email: builderEmail, password: "password123", role: "builder" },
    });
    assert(res.status === 409 && res.data.existingRole === "builder", "Test 3: Existing Builder email + Builder registration -> HTTP 409 Conflict", `Status ${res.status}`);

    // Test 4: Existing Client email + Client registration -> 409
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Dup Client", email: clientEmail, password: "password123", role: "client" },
    });
    assert(res.status === 409 && res.data.existingRole === "client", "Test 4: Existing Client email + Client registration -> HTTP 409 Conflict", `Status ${res.status}`);

    // Test 5: Existing Builder email + Client registration -> 409 (Targeted Error Payload)
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cross Client", email: builderEmail, password: "password123", role: "client" },
    });
    assert(
      res.status === 409 &&
      res.data.existingRole === "builder" &&
      res.data.error.includes("already exists as a Builder"),
      "Test 5: Existing Builder email + Client registration -> HTTP 409 Targeted Payload",
      `Status ${res.status}: ${res.data.error}`
    );

    // Test 6: Existing Client email + Builder registration -> 409 (Targeted Error Payload)
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cross Builder", email: clientEmail, password: "password123", role: "builder" },
    });
    assert(
      res.status === 409 &&
      res.data.existingRole === "client" &&
      res.data.error.includes("already exists as a Client"),
      "Test 6: Existing Client email + Builder registration -> HTTP 409 Targeted Payload",
      `Status ${res.status}: ${res.data.error}`
    );

    // Test 7: Client with empty company -> 201 SUCCESS
    const emptyCompanyEmail = `client_nocomp_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "NoComp Client", email: emptyCompanyEmail, password: "password123", role: "client", company: "" },
    });
    assert(res.status === 201 && res.data.user?.role === "client", "Test 7: Client with empty company -> HTTP 201 SUCCESS", `Status ${res.status}`);

    // Test 8: Email capitalization difference -> 409 Conflict
    const capEmailUpper = `Cap_User_${ts}@EXAMPLE.COM`;
    const capEmailLower = `cap_user_${ts}@example.com`;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cap User", email: capEmailUpper, password: "password123", role: "builder" },
    });
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Cap User 2", email: capEmailLower, password: "password123", role: "client" },
    });
    assert(res.status === 409, "Test 8: Email case insensitivity duplicate detection -> HTTP 409 Conflict", `Status ${res.status}`);

    // Test 9: Invalid role ('admin') -> 400 Bad Request
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Bad Role User", email: `badrole_${ts}@example.com`, password: "password123", role: "admin" },
    });
    assert(res.status === 400 && res.data.error.includes("Invalid role"), "Test 9: Invalid role ('admin') rejection -> HTTP 400 Bad Request", `Status ${res.status}`);

    // Test 10: Email surrounding whitespace -> correctly normalized
    const spaceEmail = `   spaced_user_${ts}@example.com   `;
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Spaced User", email: spaceEmail, password: "password123", role: "client" },
    });
    assert(res.status === 201 && res.data.user?.email === `spaced_user_${ts}@example.com`, "Test 10: Email surrounding whitespace normalization -> HTTP 201 Normalized", `Status ${res.status}`);

    // Test 11: Duplicate email with surrounding whitespace -> 409 Conflict
    res = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Spaced User 2", email: `spaced_user_${ts}@example.com`, password: "password123", role: "builder" },
    });
    assert(res.status === 409, "Test 11: Duplicate email with surrounding whitespace -> HTTP 409 Conflict", `Status ${res.status}`);

    // Test 12: Missing required fields -> 400
    res = await request("/api/auth/register", {
      method: "POST",
      body: { email: `missing_${ts}@example.com`, password: "password123", role: "client" },
    });
    assert(res.status === 400, "Test 12: Missing required fields (name omitted) -> HTTP 400 Bad Request", `Status ${res.status}`);

    // ═════════════════════════════════════════════════════════════════════
    // SECTION 2: LOGIN TESTS & ANTI-SPOOFING
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n── SECTION 2: LOGIN & ANTI-SPOOFING TESTS ─────────────────────────────");

    // Test 13: Builder credentials -> 200
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "password123" },
    });
    assert(res.status === 200 && res.data.user?.role === "builder", "Test 13: Builder login -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // Test 14: Client credentials -> 200
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: clientEmail, password: "password123" },
    });
    assert(res.status === 200 && res.data.user?.role === "client", "Test 14: Client login -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // Test 15: Wrong password -> 401
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "wrongpassword" },
    });
    assert(res.status === 401, "Test 15: Wrong password -> HTTP 401 Unauthorized", `Status ${res.status}`);

    // Test 16: Unknown email -> 401
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: `nonexistent_${ts}@example.com`, password: "password123" },
    });
    assert(res.status === 401, "Test 16: Nonexistent email -> HTTP 401 Unauthorized", `Status ${res.status}`);

    // Test 17: Builder + requestedRole=client -> 400 Role Mismatch
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "password123", requestedRole: "client" },
    });
    assert(res.status === 400 && res.data.error.includes("registered as a Builder"), "Test 17: Builder credentials + requestedRole=client -> HTTP 400 Role Mismatch", `Status ${res.status}`);

    // Test 18: Client + requestedRole=builder -> 400 Role Mismatch
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: clientEmail, password: "password123", requestedRole: "builder" },
    });
    assert(res.status === 400 && res.data.error.includes("registered as a Client"), "Test 18: Client credentials + requestedRole=builder -> HTTP 400 Role Mismatch", `Status ${res.status}`);

    // Test 19: Builder + requestedRole=builder -> 200 SUCCESS
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: builderEmail, password: "password123", requestedRole: "builder" },
    });
    assert(res.status === 200 && res.data.user?.role === "builder", "Test 19: Builder credentials + correct requestedRole -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // ═════════════════════════════════════════════════════════════════════
    // SECTION 3: AUTHORIZATION & RESOURCE OWNERSHIP TESTS
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n── SECTION 3: AUTHORIZATION & RESOURCE OWNERSHIP TESTS ────────────────");

    // Test 20: Unauthenticated access to Builder log creation -> 401
    res = await request("/api/projects/1/logs", {
      method: "POST",
      body: { date: "2026-05-15", workers: 10, tasks: "Unauth task" },
    });
    assert(res.status === 401, "Test 20: Unauthenticated access to protected Builder API -> HTTP 401 Unauthorized", `Status ${res.status}`);

    // Test 21: Client access to Builder log creation -> 403 Forbidden
    res = await request("/api/projects/1/logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { date: "2026-05-15", workers: 10, tasks: "Client task" },
    });
    assert(res.status === 403, "Test 21: Client user calling Builder-only API -> HTTP 403 Forbidden", `Status ${res.status}`);

    // Test 22: Authorized Builder access to owned project log creation -> 201 SUCCESS
    // Project 1 builderId is 1 (Rajesh Kumar). Login as Rajesh Kumar
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: "rajesh@buildsmart.com", password: "password123" },
    });
    const rajeshToken = res.data.token;
    res = await request("/api/projects/1/logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${rajeshToken}` },
      body: { date: "2026-05-15", workers: 10, tasks: "Builder task" },
    });
    assert(res.status === 201, "Test 22: Authorized Builder updating owned project log -> HTTP 201 SUCCESS", `Status ${res.status}`);

    // Test 23: Client A viewing Client A project -> 200 SUCCESS
    // Priya Sharma is Client 2 (owns Project 1)
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: "priya@gmail.com", password: "password123" },
    });
    const priyaToken = res.data.token;
    res = await request("/api/projects/1", {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(res.status === 200 && res.data.id === 1, "Test 23: Client viewing owned project -> HTTP 200 SUCCESS", `Status ${res.status}`);

    // Test 24: Client A viewing Client B project -> 403 Forbidden (Resource Ownership Protection)
    // Project 2 belongs to Ananya Desai (Client 4). Priya (Client 2) attempts to view Project 2
    res = await request("/api/projects/2", {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(res.status === 403, "Test 24: Client viewing another Client's project -> HTTP 403 Forbidden", `Status ${res.status}`);

    // Test 25: Builder A editing Builder B project -> 403 Forbidden
    // Vikram Singh (Builder 3) attempts to edit Project 1 (owned by Rajesh Kumar, Builder 1)
    res = await request("/api/auth/login", {
      method: "POST",
      body: { email: "vikram@buildtech.in", password: "password123" },
    });
    const vikramToken = res.data.token;
    res = await request("/api/projects/1", {
      method: "PUT",
      headers: { Authorization: `Bearer ${vikramToken}` },
      body: { budget: 9999999 },
    });
    assert(res.status === 403, "Test 25: Builder modifying unassigned Builder project -> HTTP 403 Forbidden", `Status ${res.status}`);

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
