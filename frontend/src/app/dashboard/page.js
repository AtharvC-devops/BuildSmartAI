"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  Building2, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { getProjectStats, getProjects, getMonthlyData } from "@/lib/api";

const fadeIn = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.45 } },
});

function KPICard({ icon: Icon, label, value, sub, color, trend, i }) {
  return (
    <motion.div {...fadeIn(i)} className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${
              trend > 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    completed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    planning:    "bg-amber-50 text-amber-700 border-amber-200",
    on_hold:     "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || ""}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, p, m] = await Promise.all([getProjectStats(), getProjects(), getMonthlyData()]);
        setStats(s);
        setProjects(p);
        setMonthly(m.map((d) => ({ ...d, budget: d.budget / 100000, actual: d.actual / 100000 })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[130px] rounded-2xl animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard i={0} icon={Building2}       label="Active Projects"  value={stats?.activeProjects || 0}           color="bg-gradient-to-br from-blue-500 to-blue-600"    trend={12} />
        <KPICard i={1} icon={DollarSign}      label="Total Budget"     value={formatINR(stats?.totalBudget || 0)}   color="bg-gradient-to-br from-emerald-500 to-emerald-600" trend={8}  sub={`${stats?.budgetUsage || 0}% utilized`} />
        <KPICard i={2} icon={AlertTriangle}   label="Delayed / On Hold" value={stats?.delayedProjects || 0}         color="bg-gradient-to-br from-amber-500 to-orange-500" trend={-5} />
        <KPICard i={3} icon={CheckCircle2}    label="Completed"        value={stats?.completedProjects || 0}        color="bg-gradient-to-br from-purple-500 to-purple-600" trend={15} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual */}
        <motion.div {...fadeIn(4)} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Budget vs Actual Spending (₹ Lakhs)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                formatter={(v) => [`₹${v.toFixed(1)}L`, ""]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Spending Trend */}
        <motion.div {...fadeIn(5)} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Spending Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                formatter={(v) => [`₹${v.toFixed(1)}L`, ""]}
              />
              <Area type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2.5} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Projects Table */}
      <motion.div {...fadeIn(6)} className="glass-card p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Projects</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="pb-3 pr-4 font-semibold">Project</th>
                <th className="pb-3 pr-4 font-semibold">Client</th>
                <th className="pb-3 pr-4 font-semibold">Budget</th>
                <th className="pb-3 pr-4 font-semibold">Progress</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-sm text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.location}</div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-slate-600">{p.clientName}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-slate-900">{formatINR(p.budget)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-10 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
