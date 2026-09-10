"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardList, FileText, IndianRupee, Loader2, Package, Receipt, ShieldCheck, Users } from "lucide-react";
import { getProjectCostTracking, getProjectDashboardData, getProjectLabour, getProjectLogs, getProjectMaterials, getProjectRABills, getProjectRiskCompliance, getProjectSchedule, getProjects } from "@/lib/api";

function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

export default function MidDeveloperDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProjects().then(list => {
      setProjects(list);
      if (list.length) setSelectedProjectId(String(list[0].id));
    }).catch(() => setError("Could not load projects.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      getProjectDashboardData(Number(selectedProjectId)),
      getProjectCostTracking(Number(selectedProjectId)),
      getProjectRABills(Number(selectedProjectId)),
      getProjectMaterials(Number(selectedProjectId)),
      getProjectLabour(Number(selectedProjectId)),
      getProjectSchedule(Number(selectedProjectId)),
      getProjectRiskCompliance(Number(selectedProjectId)),
      getProjectLogs(Number(selectedProjectId))
    ]).then(([dashboard, costs, bills, materials, labour, schedule, compliance, logs]) => {
      if (active) setSnapshot({ dashboard, costs, bills, materials, labour, schedule, compliance, logs });
    }).catch(() => { if (active) setError("Could not load the selected project health summary."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId]);

  if (loading && !snapshot && !projects.length) return <div className="flex min-h-[280px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!projects.length) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Create a project to begin regional project cost and contractor control.</div>;

  const dashboard = snapshot?.dashboard || {};
  const costs = snapshot?.costs?.summary || {};
  const billSummary = snapshot?.bills?.summary || {};
  const materialSummary = snapshot?.materials?.summary || {};
  const labourSummary = snapshot?.labour?.summary || {};
  const schedule = snapshot?.schedule || {};
  const phases = schedule.phases || [];
  const delayedActivities = phases.filter(phase => Number(phase.delayDays || 0) > 0);
  const purchaseOrders = snapshot?.materials?.purchaseOrders || [];
  const committedCost = purchaseOrders.reduce((sum, order) => sum + Number(order.amount || (order.orderedQty || 0) * (order.rate || 0)), 0);
  const pendingBills = Number(billSummary.submitted || 0) + Number(billSummary.underReview || 0);
  const complianceSummary = snapshot?.compliance?.summary || {};
  const project = projects.find(item => String(item.id) === selectedProjectId);
  const logs = Array.isArray(snapshot?.logs) ? snapshot.logs : snapshot?.logs?.logs || [];
  const alerts = [
    ...(dashboard.alerts || []),
    ...(materialSummary.priceHikeCount > 0 ? [{ type: "Material price", severity: "HIGH", message: `${materialSummary.priceHikeCount} material rates increased significantly.` }] : []),
    ...(materialSummary.lowStockCount > 0 ? [{ type: "Material shortage", severity: "HIGH", message: `${materialSummary.lowStockCount} materials are below the safety level.` }] : []),
    ...(complianceSummary.activeCount > 0 ? [{ type: "Compliance", severity: "MEDIUM", message: `${complianceSummary.activeCount} compliance items need attention.` }] : []),
    ...(Number(costs.contractorCost || 0) > Number(costs.budget || project?.budget || 0) ? [{ type: "Contract value", severity: "CRITICAL", message: "Contractor cost is nearing or above the project budget." }] : [])
  ].slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-2xl bg-blue-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Regional developer workspace</p><h2 className="mt-1 text-2xl font-bold">{project?.name || "Project health"}</h2><p className="mt-1 text-sm text-blue-100">Cost control, contractor billing, material rates, progress, and compliance.</p></div>
          <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} className="rounded-lg border border-blue-800 bg-blue-900 px-3 py-2 text-sm text-white">{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Metric label="Budget" value={formatINR(project?.budget)} icon={CircleDollarSign} />
        <Metric label="Estimated Cost" value={formatINR(costs.estimatedCost)} icon={ClipboardList} />
        <Metric label="Actual Cost" value={formatINR(costs.totalActualCost)} icon={IndianRupee} tone="indigo" />
        <Metric label="Committed Cost" value={formatINR(committedCost)} icon={Package} tone="amber" />
        <Metric label="Remaining Budget" value={formatINR(costs.remainingBudget)} icon={CircleDollarSign} tone="emerald" />
        <Metric label="Variance" value={`${formatINR(costs.variance)} (${Number(costs.variancePercentage || 0).toFixed(1)}%)`} icon={BarChart3} tone={Number(costs.variance || 0) > 0 ? "red" : "emerald"} />
        <Metric label="Project Progress" value={`${dashboard.overview?.progress || project?.progress || 0}%`} icon={CheckCircle2} tone="blue" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold text-slate-800"><Receipt className="h-4 w-4 text-blue-600" /> Contractor billing</h3><Link href="/dashboard/ra-billing" className="text-xs font-bold text-blue-700">Open RA Bills <ArrowRight className="inline h-3 w-3" /></Link></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniStat label="Total RA Bills" value={billSummary.totalBills || 0} /><MiniStat label="Approved" value={billSummary.approved || 0} /><MiniStat label="Pending" value={pendingBills} /><MiniStat label="Outstanding" value={formatINR(billSummary.outstandingAmount)} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4"><MiniStat label="Paid to Contractors" value={formatINR(billSummary.totalPaidAmount)} /><MiniStat label="Contractor Cost" value={formatINR(costs.contractorCost)} /></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-800"><AlertTriangle className="h-4 w-4 text-amber-600" /> Alerts</h3><div className="mt-3 space-y-2">{alerts.length ? alerts.map((alert, index) => <div key={`${alert.type}-${index}`} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900"><strong>{alert.type}:</strong> {alert.message}</div>) : <p className="text-sm text-slate-500">No project alerts.</p>}</div></section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold text-slate-800"><CalendarDays className="h-4 w-4 text-blue-600" /> Schedule progress</h3><span className="text-xs font-bold text-red-600">{delayedActivities.length} delayed activities</span></div><div className="mt-4 space-y-3">{phases.slice(0, 6).map(phase => <div key={phase.id || phase.phaseName} className="flex items-center gap-3 text-xs"><span className="w-32 truncate font-semibold text-slate-600">{phase.phaseName || phase.name}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${Number(phase.delayDays || 0) > 0 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${Number(phase.progress || 0)}%` }} /></div><span className="w-10 text-right font-bold text-slate-500">{phase.progress || 0}%</span></div>)}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-800"><Users className="h-4 w-4 text-indigo-600" /> Labour and materials</h3><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Labour cost</span><strong>{formatINR(labourSummary.labourCostThisMonth || labourSummary.labourCostToday)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Material cost</span><strong>{formatINR(costs.materialCost)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Price alerts</span><strong className="text-amber-700">{materialSummary.priceHikeCount || 0}</strong></div><div className="flex justify-between"><span className="text-slate-500">Compliance alerts</span><strong className="text-red-700">{complianceSummary.activeCount || 0}</strong></div></div><div className="mt-4 flex gap-2"><Link href="/dashboard/material-sourcing" className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700">Material rates</Link><Link href="/dashboard/muster-roll" className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700">Muster roll</Link></div></section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-800"><FileText className="h-4 w-4 text-blue-600" /> Recent daily logs</h3>{logs.slice(0, 4).map(log => <div key={log.id} className="border-b border-slate-100 py-3 text-xs"><div className="flex justify-between"><strong>{log.date}</strong><span>{log.workers || 0} workers</span></div><p className="mt-1 text-slate-500">{log.tasks || "Work recorded"}</p></div>)}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Regional compliance</h3><p className="mt-2 text-sm text-slate-500">Track project-specific RERA and authority documents with due dates and source references.</p><Link href="/dashboard/risk-advisor" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Open compliance tracker <ArrowRight className="h-3 w-3" /></Link></section></div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }) {
  const colors = { slate: "text-slate-800", indigo: "text-indigo-700", amber: "text-amber-700", emerald: "text-emerald-700", red: "text-red-700", blue: "text-blue-700" };
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><Icon className="h-4 w-4 text-slate-400" /><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-sm font-black ${colors[tone]}`}>{value}</p></div>;
}

function MiniStat({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-800">{value}</p></div>;
}
