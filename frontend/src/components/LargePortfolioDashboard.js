"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, Building2, CheckCircle2, CircleDollarSign, Download, FileText, IndianRupee, Loader2, Plus, Receipt, ShieldCheck, Users, X } from "lucide-react";
import { createProject, downloadPortfolioReport, getPortfolioProjectDetail, getPortfolioRABills, getPortfolioSummary } from "@/lib/api";

function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

export default function LargePortfolioDashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [detail, setDetail] = useState(null);
  const [bills, setBills] = useState([]);
  const [billFilters, setBillFilters] = useState({ projectId: "", contractorId: "", status: "", billNumber: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [creatingProj, setCreatingProj] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    location: "",
    budget: 10000000,
    area: 5000,
    floors: 5,
    type: "residential"
  });

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const data = await getPortfolioSummary();
      setPortfolio(data);
      const firstProject = data.projects?.[0];
      if (firstProject && !selectedProjectId) setSelectedProjectId(String(firstProject.projectId));
      const activeFilters = Object.fromEntries(Object.entries(billFilters).filter(([, value]) => value));
      const billRows = await getPortfolioRABills(activeFilters);
      setBills(billRows || []);
    } catch (err) {
      setError(err.message || "Could not load portfolio dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPortfolio(); }, [billFilters]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreatingProj(true);
    setError(null);
    try {
      const created = await createProject({
        name: projectForm.name,
        location: projectForm.location || "Prime Location",
        budget: parseFloat(projectForm.budget),
        area: parseFloat(projectForm.area),
        floors: parseInt(projectForm.floors),
        type: projectForm.type
      });
      setProjectModalOpen(false);
      setProjectForm({ name: "", location: "", budget: 10000000, area: 5000, floors: 5, type: "residential" });
      await loadPortfolio();
      if (created?.id) setSelectedProjectId(String(created.id));
    } catch (err) {
      setError(err.message || "Failed to create project.");
    } finally {
      setCreatingProj(false);
    }
  };

  const renderProjectModal = () => (
    projectModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Plus className="h-5 w-5 text-purple-600" /> Create New Construction Project
            </h3>
            <button
              onClick={() => setProjectModalOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Project Name *</label>
              <input
                type="text"
                required
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="e.g. Imperial Heights Tower 1"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Location *</label>
                <input
                  type="text"
                  required
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                  placeholder="e.g. Worli Sea Face, Mumbai"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Project Type</label>
                <select
                  value={projectForm.type}
                  onChange={(e) => setProjectForm({ ...projectForm, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Budget (₹) *</label>
                <input
                  type="number"
                  required
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Area (sqft) *</label>
                <input
                  type="number"
                  required
                  value={projectForm.area}
                  onChange={(e) => setProjectForm({ ...projectForm, area: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Floors *</label>
                <input
                  type="number"
                  required
                  value={projectForm.floors}
                  onChange={(e) => setProjectForm({ ...projectForm, floors: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingProj}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {creatingProj ? "Saving..." : "Save Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  useEffect(() => {
    if (!selectedProjectId) return;
    getPortfolioProjectDetail(Number(selectedProjectId)).then(setDetail).catch(() => setDetail(null));
  }, [selectedProjectId]);

  const downloadReport = async (name) => {
    const blob = await downloadPortfolioReport(name);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `buildsmart-${name}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !portfolio) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;
  const totals = portfolio?.totals || {};
  const project = portfolio?.projects?.find(item => String(item.projectId) === selectedProjectId);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-2xl bg-purple-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-200">Large developer portfolio</p>
            <h2 className="mt-1 text-2xl font-bold">Construction management layer</h2>
            <p className="mt-1 text-sm text-purple-100">Portfolio visibility for execution, cost, contractors, materials, compliance, and reporting.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setProjectModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-purple-500"
            >
              <Plus className="h-3.5 w-3.5" /> Add New Project
            </button>
            <button onClick={() => downloadReport("portfolio")} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-purple-900"><Download className="h-3.5 w-3.5" /> Portfolio CSV</button>
            <button onClick={() => downloadReport("ra-bills")} className="inline-flex items-center gap-1 rounded-lg bg-purple-800 px-3 py-2 text-xs font-bold text-white"><Receipt className="h-3.5 w-3.5" /> RA CSV</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7"><Metric label="Total Projects" value={totals.totalProjects} icon={Building2} /><Metric label="Active" value={totals.activeProjects} icon={CheckCircle2} tone="blue" /><Metric label="Completed" value={totals.completedProjects} icon={CheckCircle2} tone="emerald" /><Metric label="Delayed" value={totals.delayedProjects} icon={AlertTriangle} tone="red" /><Metric label="Portfolio Budget" value={formatINR(totals.portfolioBudget)} icon={CircleDollarSign} /><Metric label="Actual Cost" value={formatINR(totals.portfolioActualCost)} icon={IndianRupee} tone="indigo" /><Metric label="Remaining" value={formatINR(totals.remainingBudget)} icon={CircleDollarSign} tone="emerald" /></div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-800">Portfolio financial health</h3><span className={`text-sm font-black ${Number(totals.portfolioVariance) > 0 ? "text-red-700" : "text-emerald-700"}`}>{formatINR(totals.portfolioVariance)} variance</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniStat label="Variance" value={formatINR(totals.portfolioVariance)} /><MiniStat label="RA Bills" value={totals.totalBills} /><MiniStat label="Pending RA" value={totals.pendingRABills} /><MiniStat label="Pending Payments" value={totals.pendingPayments} /></div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-800"><AlertTriangle className="h-4 w-4 text-amber-600" /> Portfolio alerts</h3><div className="mt-3 space-y-2"><Alert text={`${totals.complianceAlerts || 0} compliance alerts across projects`} /><Alert text={`${totals.delayedProjects || 0} projects need schedule attention`} /><Alert text="Review material and contractor cost changes before the next payment run" /></div></section></div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold text-slate-800"><Building2 className="h-4 w-4 text-purple-600" /> Project portfolio</h3><span className="text-xs text-slate-500">Select a project to drill into costs and bills</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400"><th className="py-3">Project</th><th>Budget</th><th>Actual</th><th>Variance</th><th>Progress</th><th>RA Bills</th><th>Compliance</th><th /></tr></thead><tbody>{(portfolio?.projects || []).map(item => <tr key={item.projectId} className={`border-b border-slate-100 ${String(item.projectId) === selectedProjectId ? "bg-purple-50/50" : ""}`}><td className="py-3 font-bold text-slate-800">{item.projectName}<div className="font-normal text-slate-400">{item.location}</div></td><td>{formatINR(item.budget)}</td><td>{formatINR(item.actualCost)}</td><td className={item.variance > 0 ? "font-bold text-red-700" : "text-emerald-700"}>{formatINR(item.variance)}</td><td>{item.progress}%</td><td>{item.totalBills}</td><td>{item.complianceAlerts}</td><td><button onClick={() => setSelectedProjectId(String(item.projectId))} className="font-bold text-purple-700">Open</button></td></tr>)}</tbody></table></div></section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-800"><BarChart3 className="h-4 w-4 text-purple-600" /> Project drill-down</h3>{project ? <div className="mt-4 space-y-3 text-sm"><p className="font-bold text-slate-800">{project.projectName}</p><MiniStat label="Committed Cost" value={formatINR(project.committedCost)} /><MiniStat label="Material Cost" value={formatINR(project.materialCost)} /><MiniStat label="Labour Cost" value={formatINR(project.labourCost)} /><div className="flex gap-2"><Link href="/dashboard/cost-estimator" className="flex-1 rounded-lg bg-blue-100 px-3 py-2 text-center text-xs font-bold text-blue-800">BOQ / Costs</Link><Link href="/dashboard/ra-billing" className="flex-1 rounded-lg bg-purple-100 px-3 py-2 text-center text-xs font-bold text-purple-800">RA Bills</Link><Link href="/dashboard/risk-advisor" className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700">Compliance</Link></div></div> : <p className="mt-3 text-sm text-slate-500">Select a project.</p>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-bold text-slate-800"><Receipt className="h-4 w-4 text-purple-600" /> Cross-project RA bills</h3><div className="flex flex-wrap gap-2"><select value={billFilters.projectId} onChange={event => setBillFilters({ ...billFilters, projectId: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="">All projects</option>{(portfolio?.projects || []).map(item => <option key={item.projectId} value={item.projectId}>{item.projectName}</option>)}</select><input value={billFilters.contractorId} onChange={event => setBillFilters({ ...billFilters, contractorId: event.target.value })} placeholder="Contractor ID" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs" /><select value={billFilters.status} onChange={event => setBillFilters({ ...billFilters, status: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="approved">Approved</option><option value="paid">Paid</option></select><input value={billFilters.billNumber} onChange={event => setBillFilters({ ...billFilters, billNumber: event.target.value })} placeholder="Bill number" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs" /></div></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400"><th className="py-2">Project</th><th>Bill</th><th>Contractor</th><th>Status</th><th>Net Payable</th></tr></thead><tbody>{bills.slice(0, 8).map(bill => <tr key={bill.id} className="border-b border-slate-100"><td className="py-2">{bill.project_name}</td><td>{bill.bill_number}</td><td>{bill.contractor_name || bill.contractor_id}</td><td>{bill.status}</td><td className="font-bold">{formatINR(bill.net_payable)}</td></tr>)}</tbody></table>{!bills.length && <p className="py-6 text-center text-sm text-slate-500">No RA bills match the filter.</p>}</div></section></div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {renderProjectModal()}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }) { const colors = { slate: "text-slate-800", blue: "text-blue-700", emerald: "text-emerald-700", red: "text-red-700", indigo: "text-indigo-700" }; return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><Icon className="h-4 w-4 text-slate-400" /><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-sm font-black ${colors[tone]}`}>{value}</p></div>; }
function MiniStat({ label, value }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-800">{value}</p></div>; }
function Alert({ text }) { return <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">{text}</div>; }
