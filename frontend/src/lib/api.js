const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ── Helper ──────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  try {
    const savedUser = localStorage.getItem("buildsmart_user");
    if (savedUser) {
      const u = JSON.parse(savedUser);
      if (u && u.id) {
        headers["x-user-id"] = u.id.toString();
      }
    }
  } catch (e) {}

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    let errData;
    try {
      errData = await res.json();
    } catch (_) {}
    const msg = errData?.error?.message || errData?.message || `API Error: ${res.status}`;
    const err = new Error(msg);
    err.code = errData?.error?.code || errData?.code;
    err.status = res.status;
    err.details = errData?.error?.details || errData?.details;
    throw err;
  }
  
  const json = await res.json();
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      const msg = json.error?.message || "API request failed";
      const err = new Error(msg);
      err.code = json.error?.code;
      throw err;
    }
    return json.data;
  }
  return json;
}

// ── AI Endpoints ────────────────────────────────────────────────────────
export const predictCost = (data) =>
  request("/predict-cost", { method: "POST", body: JSON.stringify(data) });

export const predictTime = (data) =>
  request("/predict-time", { method: "POST", body: JSON.stringify(data) });

export const assignAgent = (data) =>
  request("/assign-agent", { method: "POST", body: JSON.stringify(data) });

export const predictMaterials = (data) =>
  request("/predict-materials", { method: "POST", body: JSON.stringify(data) });

export const predictRisk = (data) =>
  request("/predict-risk", { method: "POST", body: JSON.stringify(data) });

export const getSuppliers = (material) =>
  request(`/suppliers${material ? `?material=${material}` : ""}`);

// ── Data Endpoints ──────────────────────────────────────────────────────
export const getProjects = () => request("/projects");
export const getProjectStats = () => request("/projects/stats");
export const getProject = (id) => request(`/projects/${id}`);
export const createProject = (data) =>
  request("/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id, data) =>
  request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const getMonthlyData = () => request("/monthly-data");
export const getAgents = () => request("/agents");
export const getUsers = () => request("/users");
export const getServices = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/services${qs ? `?${qs}` : ""}`);
};
export const getBookings = () => request("/bookings");

export const getProjectMilestones = (projectId) =>
  request(`/projects/${projectId}/milestones`);

export const updateProjectMilestone = (projectId, data) =>
  request(`/projects/${projectId}/milestones`, { method: "PUT", body: JSON.stringify(data) });

export const getProjectLogs = (projectId) =>
  request(`/projects/${projectId}/logs`);

export const createProjectLog = (projectId, logData) =>
  request(`/projects/${projectId}/logs`, { method: "POST", body: JSON.stringify(logData) });

export const askChatAssistant = (question) =>
  request("/qa-chat", { method: "POST", body: JSON.stringify({ question }) });

// ── Real ML Model Endpoints ─────────────────────────────────────────────
export const predictPrice = (data) =>
  request("/predict-price", { method: "POST", body: JSON.stringify(data) });

export const getLocations = () => request("/locations");

// ── BOQ Cost Estimator Endpoints ────────────────────────────────────────
export const getProjectBOQ = (projectId) => request(`/projects/${projectId}/boq`);
export const createProjectBOQItem = (projectId, data) =>
  request(`/projects/${projectId}/boq`, { method: "POST", body: JSON.stringify(data) });
export const updateProjectBOQItem = (projectId, itemId, data) =>
  request(`/projects/${projectId}/boq/${itemId}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProjectBOQItem = (projectId, itemId) =>
  request(`/projects/${projectId}/boq/${itemId}`, { method: "DELETE" });
export const getPWDRates = () => request("/rates/pwd");

// ── Cost Tracking Endpoints ─────────────────────────────────────────────
export const getProjectCostTracking = (projectId) => request(`/projects/${projectId}/cost-tracking`);
export const createProjectExpense = (projectId, data) =>
  request(`/projects/${projectId}/expenses`, { method: "POST", body: JSON.stringify(data) });
export const deleteProjectExpense = (projectId, expenseId) =>
  request(`/projects/${projectId}/expenses/${expenseId}`, { method: "DELETE" });

// ── RA Billing Endpoints ────────────────────────────────────────────────
export const getProjectRABills = (projectId, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/projects/${projectId}/ra-bills${qs ? "?" + qs : ""}`);
};
export const getProjectRABill = (projectId, billId) =>
  request(`/projects/${projectId}/ra-bills/${billId}`);
export const createProjectRABill = (projectId, data) =>
  request(`/projects/${projectId}/ra-bills`, { method: "POST", body: JSON.stringify(data) });
export const updateProjectRABillStatus = (projectId, billId, status, extra = {}) =>
  request(`/projects/${projectId}/ra-bills/${billId}/status`, { method: "PATCH", body: JSON.stringify({ status, ...extra }) });
export const downloadProjectRABillExcel = async (projectId, billId) => {
  const headers = {};
  try {
    const u = JSON.parse(localStorage.getItem("buildsmart_user") || "{}");
    if (u?.id) headers["x-user-id"] = String(u.id);
  } catch (_) {}
  const res = await fetch(`${API_BASE}/projects/${projectId}/ra-bills/${billId}/export`, { headers });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
};
// Legacy alias
export const downloadProjectRABillPdf = (projectId, billId) =>
  downloadProjectRABillExcel(projectId, billId);
export const addProjectRABillItem = (projectId, billId, data) =>
  request(`/projects/${projectId}/ra-bills/${billId}/items`, { method: "POST", body: JSON.stringify(data) });
export const getProjectContractors = (projectId) =>
  request(`/projects/${projectId}/contractors`);
export const getProjectContracts = (projectId) =>
  request(`/projects/${projectId}/contracts`);
export const createProjectContract = (projectId, data) =>
  request(`/projects/${projectId}/contracts`, { method: "POST", body: JSON.stringify(data) });

// ── Site Measurements Endpoints ──────────────────────────────────────────
export const getProjectMeasurements = (projectId, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/projects/${projectId}/measurements${qs ? "?" + qs : ""}`);
};
export const getBOQItemMeasurements = (projectId, boqItemId) =>
  request(`/projects/${projectId}/boq/${boqItemId}/measurements`);
export const createProjectMeasurement = (projectId, data) =>
  request(`/projects/${projectId}/measurements`, { method: "POST", body: JSON.stringify(data) });
export const updateProjectMeasurement = (projectId, measId, data) =>
  request(`/projects/${projectId}/measurements/${measId}`, { method: "PUT", body: JSON.stringify(data) });
export const updateProjectMeasurementStatus = (projectId, measId, status, rejectionReason) =>
  request(`/projects/${projectId}/measurements/${measId}/status`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
export const verifyProjectMeasurement = (projectId, measId, remarks) =>
  request(`/projects/${projectId}/measurements/${measId}/verify`, { method: "PATCH", body: JSON.stringify({ remarks }) });
export const getProjectUnbilledMeasurements = (projectId) =>
  request(`/projects/${projectId}/unbilled-measurements`);


// ── Labour and Muster Roll Endpoints ────────────────────────────────────
export const getProjectLabour = (projectId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/projects/${projectId}/labour${query ? "?" + query : ""}`);
};
export const getProjectWorkers = (projectId) =>
  request(`/projects/${projectId}/workers`);
export const createProjectWorker = (projectId, data) =>
  request(`/projects/${projectId}/workers`, { method: "POST", body: JSON.stringify(data) });
export const logProjectAttendance = (projectId, data) =>
  request(`/projects/${projectId}/attendance`, { method: "POST", body: JSON.stringify(data) });

// ── Material Management Endpoints ────────────────────────────────────────
export const getProjectMaterials = (projectId) =>
  request(`/projects/${projectId}/materials`);
export const createProjectMaterialRate = (projectId, data) =>
  request(`/projects/${projectId}/material-rates`, { method: "POST", body: JSON.stringify(data) });
export const createProjectPO = (projectId, data) =>
  request(`/projects/${projectId}/purchase-orders`, { method: "POST", body: JSON.stringify(data) });
export const logProjectMaterialTransaction = (projectId, data) =>
  request(`/projects/${projectId}/material-logs`, { method: "POST", body: JSON.stringify(data) });

// ── Scheduling & Construction Phase Endpoints ─────────────────────────────
export const getProjectSchedule = (projectId) =>
  request(`/projects/${projectId}/schedule`);
export const updateProjectPhase = (projectId, phaseId, data) =>
  request(`/projects/${projectId}/schedule/phases/${phaseId}`, { method: "POST", body: JSON.stringify(data) });
export const updateProjectScheduleRisks = (projectId, data) =>
  request(`/projects/${projectId}/schedule/risks`, { method: "POST", body: JSON.stringify(data) });

// ── Risk & Compliance Endpoints ──────────────────────────────────────────
export const getProjectRiskCompliance = (projectId) =>
  request(`/projects/${projectId}/risk-compliance`);
export const createProjectComplianceDoc = (projectId, data) =>
  request(`/projects/${projectId}/compliance`, { method: "POST", body: JSON.stringify(data) });
export const updateProjectComplianceDoc = (projectId, docId, data) =>
  request(`/projects/${projectId}/compliance/${docId}`, { method: "PUT", body: JSON.stringify(data) });

// ── Configurable Compliance System Endpoints ──────────────────────────────
export const getProjectComplianceSystem = (projectId) =>
  request(`/projects/${projectId}/compliance-system`);
export const updateProjectComplianceSystemItem = (projectId, itemId, data) =>
  request(`/projects/${projectId}/compliance-system/items/${itemId}`, { method: "PUT", body: JSON.stringify(data) });
export const createComplianceSystemRule = (projectId, data) =>
  request(`/projects/${projectId}/compliance-system/rules`, { method: "POST", body: JSON.stringify(data) });
export const getProjectDashboardData = (projectId) =>
  request(`/projects/${projectId}/dashboard-data`);
export const getProjectWorkflow = (projectId) =>
  request(`/projects/${projectId}/workflow`);
export const getProjectAuditHistory = (projectId) =>
  request(`/projects/${projectId}/audit-history`);
export const getPortfolioSummary = () => request("/portfolio/summary");
export const getPortfolioRABills = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/portfolio/ra-bills${query ? `?${query}` : ""}`);
};
export const getPortfolioProjectDetail = (projectId) => request(`/projects/${projectId}/portfolio-detail`);
export const downloadPortfolioReport = async (reportName = "portfolio") => {
  const savedUser = localStorage.getItem("buildsmart_user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const response = await fetch(`${API_BASE}/${reportName === "ra-bills" ? "reports/ra-bills.csv" : "reports/portfolio.csv"}`, { headers: user?.id ? { "x-user-id": String(user.id) } : {} });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.blob();
};

// ── Project Scale Segmentation Endpoints ───────────────────────────────
export const getProjectSegmentConfig = (projectId) =>
  request(`/projects/${projectId}/segment-config`);
export const updateProjectSegmentConfig = (projectId, scaleSegment) =>
  request(`/projects/${projectId}/segment-config`, { method: "POST", body: JSON.stringify({ scaleSegment }) });
