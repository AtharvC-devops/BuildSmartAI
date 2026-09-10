"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardList, FileText, Hammer, IndianRupee, Loader2, Receipt, Users } from "lucide-react";
import { getProjectDashboardData, getProjectLabour, getProjectLogs, getProjectMaterials, getProjectRABills, getProjectSchedule, getProjects } from "@/lib/api";
import { translations } from "@/lib/translations";

function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

export default function SmallBuilderDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [data, setData] = useState(null);
  const [locale, setLocale] = useState("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const syncLocale = () => setLocale(localStorage.getItem("buildsmart_locale") || "en");
    syncLocale();
    window.addEventListener("languageChanged", syncLocale);
    return () => window.removeEventListener("languageChanged", syncLocale);
  }, []);

  useEffect(() => {
    getProjects()
      .then(list => {
        setProjects(list);
        if (list.length) setSelectedProjectId(String(list[0].id));
      })
      .catch(() => setError("Could not load projects."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      getProjectDashboardData(Number(selectedProjectId)),
      getProjectRABills(Number(selectedProjectId)),
      getProjectLabour(Number(selectedProjectId)),
      getProjectLogs(Number(selectedProjectId)),
      getProjectMaterials(Number(selectedProjectId)),
      getProjectSchedule(Number(selectedProjectId))
    ])
      .then(([dashboard, bills, labour, logs, materials, schedule]) => {
        if (active) setData({ dashboard, bills, labour, logs, materials, schedule });
      })
      .catch(() => { if (active) setError("Could not load the project summary."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId]);

  const t = translations[locale] || translations.en;
  const overview = data?.dashboard?.overview || {};
  const bills = data?.bills?.bills || [];
  const currentBill = bills.find(bill => ["draft", "submitted", "under review"].includes(String(bill.status).toLowerCase())) || bills[0];
  const labourSummary = data?.labour?.summary || {};
  const logs = Array.isArray(data?.logs) ? data.logs : data?.logs?.logs || [];
  const materials = data?.materials?.materialRates || data?.materials?.rates || [];
  const phases = data?.schedule?.phases || [];
  const upcoming = phases.find(phase => !["completed", "Completed"].includes(phase.status));
  const recentLogs = [...logs].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
  const alerts = data?.dashboard?.alerts || [];

  const billSummary = data?.bills?.summary || {};
  const pendingBills = Number(billSummary.submitted || 0) + Number(billSummary.underReview || 0);

  if (loading && !data && !projects.length) {
    return <div className="flex min-h-[280px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  }

  if (!projects.length) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Create your first project to start tracking work, costs, labour, and bills.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-2xl bg-emerald-900 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Small builder workspace</p>
            <h2 className="mt-1 text-2xl font-bold">{projects.find(project => String(project.id) === selectedProjectId)?.name || "Project dashboard"}</h2>
            <p className="mt-1 text-sm text-emerald-100">Simple daily control for your site and contractor payments.</p>
          </div>
          <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-sm text-white">
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={CircleDollarSign} label="Estimated Cost" value={formatINR(data?.dashboard?.costControl?.estimatedCost || overview.budget)} />
        <Metric icon={IndianRupee} label="Actual Cost" value={formatINR(overview.spent)} tone="indigo" />
        <Metric icon={Receipt} label="Current RA Bill" value={formatINR(currentBill?.netPayable)} tone="amber" />
        <Metric icon={Activity} label="Progress" value={`${overview.progress || 0}%`} tone="emerald" />
        <Metric icon={Users} label="Labour Cost" value={formatINR(labourSummary.totalCost || labourSummary.labourCostMonth)} />
        <Metric icon={Hammer} label="Material Cost" value={formatINR(data?.dashboard?.costControl?.materialCost)} />
        <Metric icon={CheckCircle2} label="Paid to Contractors" value={formatINR(data?.bills?.summary?.totalPaidAmount)} tone="indigo" />
        <Metric icon={CircleDollarSign} label="Remaining Budget" value={formatINR(overview.remaining)} tone="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-800"><CalendarDays className="h-4 w-4 text-emerald-600" /> Next milestone</h3>
            <span className="text-xs font-semibold text-slate-500">{data?.dashboard?.schedule?.delayDays || 0} days delayed</span>
          </div>
          {upcoming ? <div className="mt-4 rounded-xl bg-emerald-50 p-4"><p className="font-bold text-emerald-900">{upcoming.phaseName || upcoming.name}</p><p className="mt-1 text-xs text-emerald-700">Expected end: {upcoming.plannedEnd || upcoming.expectedEnd || "Not set"}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Number(upcoming.progress || 0)}%` }} /></div></div> : <p className="mt-4 text-sm text-slate-500">No upcoming milestone recorded.</p>}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickLink href="/dashboard/cost-estimator" icon={ClipboardList} label="Add BOQ" />
            <QuickLink href="/dashboard/ra-billing" icon={Receipt} label="RA Bill" />
            <QuickLink href="/dashboard/daily-logs" icon={FileText} label={t.createLog} />
            <QuickLink href="/dashboard/muster-roll" icon={Users} label={t.musterRoll} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-slate-800"><AlertTriangle className="h-4 w-4 text-amber-600" /> Important alerts</h3>
          <div className="mt-3 space-y-2">{alerts.length ? alerts.slice(0, 4).map((alert, index) => <div key={`${alert.type}-${index}`} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900"><strong>{alert.type}:</strong> {alert.message}</div>) : <p className="text-sm text-slate-500">No important alerts today.</p>}</div>
        </section>
      </div>

      <div className="grid gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-800"><Receipt className="h-4 w-4 text-emerald-600" /> Contractor RA Billing</h3>
            <Link href="/dashboard/ra-billing" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Manage RA Bills →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Total RA Bills" value={billSummary.totalBills || 0} />
            <MiniStat label="Approved" value={billSummary.approved || 0} />
            <MiniStat label="Pending" value={pendingBills} />
            <MiniStat label="Outstanding" value={formatINR(billSummary.outstandingAmount)} />
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-800">Recent daily logs</h3>{recentLogs.length ? <div className="mt-3 divide-y divide-slate-100">{recentLogs.map(log => <div key={log.id} className="py-3 text-sm"><div className="flex justify-between gap-3"><strong className="text-slate-700">{log.date}</strong><span className="text-xs text-slate-500">{log.workers || log.workersPresent || 0} workers</span></div><p className="mt-1 line-clamp-2 text-xs text-slate-500">{log.tasks || log.workCompleted || "Work update recorded"}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No daily logs yet.</p>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-800">Material watch</h3>{Array.isArray(materials) && materials.length ? <div className="mt-3 grid grid-cols-2 gap-2">{materials.slice(0, 6).map(material => <div key={material.id || material.material} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold text-slate-700">{material.material || material.materialName}</p><p className="mt-1 text-sm text-slate-900">{formatINR(material.rate || material.currentRate || material.unit_price)}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Add material rates to see price changes.</p>}</section>
      </div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }) {
  const colors = { slate: "text-slate-800", indigo: "text-indigo-700", amber: "text-amber-700", emerald: "text-emerald-700" };
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><Icon className="h-4 w-4 text-slate-400" /><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-sm font-black ${colors[tone]}`}>{value}</p></div>;
}

function QuickLink({ href, icon: Icon, label }) {
  return <Link href={href} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"><Icon className="h-4 w-4 text-emerald-600" />{label}</Link>;
}
