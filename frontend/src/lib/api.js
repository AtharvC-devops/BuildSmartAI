const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ── Helper ──────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// ── AI Endpoints ────────────────────────────────────────────────────────
export const predictCost = (data) =>
  request("/predict-cost", { method: "POST", body: JSON.stringify(data) });

export const predictTime = (data) =>
  request("/predict-time", { method: "POST", body: JSON.stringify(data) });

export const assignAgent = (data) =>
  request("/assign-agent", { method: "POST", body: JSON.stringify(data) });

// ── Data Endpoints ──────────────────────────────────────────────────────
export const getProjects = () => request("/projects");
export const getProjectStats = () => request("/projects/stats");
export const getProject = (id) => request(`/projects/${id}`);
export const getMonthlyData = () => request("/monthly-data");
export const getAgents = () => request("/agents");
export const getUsers = () => request("/users");
export const getServices = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/services${qs ? `?${qs}` : ""}`);
};
export const getBookings = () => request("/bookings");
