"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  Building2, Clock, ArrowUpRight, ArrowDownRight,
  User, MapPin, Zap, X, Trophy, Briefcase, Star
} from "lucide-react";
import {
  getProjectStats, getProjects, getMonthlyData,
  getAgents, updateProject, assignAgent
} from "@/lib/api";

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
  const [agents, setAgents] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  // Activation modal states
  const [selectedProject, setSelectedProject] = useState(null);
  const [requiredSkill, setRequiredSkill] = useState("Structural");
  const [rankings, setRankings] = useState([]);
  const [bestAgent, setBestAgent] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [activating, setActivating] = useState(false);

  async function loadData() {
    try {
      const [s, p, m, a] = await Promise.all([
        getProjectStats(),
        getProjects(),
        getMonthlyData(),
        getAgents()
      ]);
      setStats(s);
      setProjects(p);
      setAgents(a);
      setMonthly(m.map((d) => ({ ...d, budget: d.budget / 100000, actual: d.actual / 100000 })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAllocation = async () => {
    setAllocating(true);
    setRankings([]);
    setBestAgent(null);
    try {
      const data = await assignAgent({
        required_skill: requiredSkill,
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          skill: a.skill,
          rating: a.rating,
          distance: a.distance,
          workload: a.workload,
          availability: a.availability,
        })),
      });
      setRankings(data.rankings || []);
      setBestAgent(data.best_agent || null);
      if (data.best_agent) {
        setSelectedAgentId(data.best_agent.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAllocating(false);
    }
  };

  const handleActivateProject = async () => {
    if (!selectedProject || !selectedAgentId) return;
    setActivating(true);
    try {
      await updateProject(selectedProject.id, {
        status: "in_progress",
        assignedAgentId: parseInt(selectedAgentId),
        progress: 0,
        spent: 0,
      });
      setSelectedProject(null);
      setRankings([]);
      setBestAgent(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[130px] rounded-2xl animate-shimmer" />
        ))}
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status !== "planning");
  const pendingRequests = projects.filter(p => p.status === "planning");

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

      {/* Pending Customer requests (Workflow bridge) */}
      <motion.div {...fadeIn(6)} className="glass-card p-6 border-l-4 border-amber-500">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Pending Project Launch Requests
        </h3>
        {pendingRequests.length === 0 ? (
          <div className="text-slate-400 text-xs py-4 text-center">
            No pending customer requests at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                  <th className="pb-3 pr-4 font-semibold">Project Spec</th>
                  <th className="pb-3 pr-4 font-semibold">Client</th>
                  <th className="pb-3 pr-4 font-semibold">Budget</th>
                  <th className="pb-3 pr-4 font-semibold">Location</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.area} sq ft • {p.floors} Floors • {p.type}</div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{p.clientName}</td>
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-800">{formatINR(p.budget)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedProject(p);
                          setRequiredSkill("Structural");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition-colors flex items-center gap-1 ml-auto"
                      >
                        <Zap className="w-3.5 h-3.5" /> Configure & Launch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Recent Projects Table */}
      <motion.div {...fadeIn(7)} className="glass-card p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Active & Completed Projects</h3>
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
              {activeProjects.map((p) => (
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

      {/* Activation Modal Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm md:text-base">
                  <Building2 className="w-4 h-4 text-amber-500" /> Activate Construction: {selectedProject.name}
                </div>
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setRankings([]);
                    setBestAgent(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[80vh] space-y-4 text-left">
                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Budget</span>
                    <span className="font-bold text-slate-800">{formatINR(selectedProject.budget)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Dimensions</span>
                    <span className="font-semibold text-slate-800">{selectedProject.area} sq ft, {selectedProject.floors} Floors</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Location</span>
                    <span className="font-semibold text-slate-800">{selectedProject.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Category</span>
                    <span className="font-semibold text-slate-800 capitalize">{selectedProject.type}</span>
                  </div>
                </div>

                {/* Agent Auto Assign Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-indigo-100 rounded-xl bg-indigo-50/20">
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900">AI Agent Resource Allocation</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Select required specialty skill to score, rank, and allocate the best field agent.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className="input-field text-xs text-slate-800 max-w-[150px] py-1.5"
                      value={requiredSkill}
                      onChange={(e) => setRequiredSkill(e.target.value)}
                    >
                      {["Structural", "Electrical", "Interior", "Plumbing", "Finishing"].map((skill) => (
                        <option key={skill} value={skill}>{skill}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleRunAllocation}
                      disabled={allocating}
                      className="px-3.5 py-2 rounded-lg gradient-accent text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                    >
                      {allocating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Matching...</>
                      ) : (
                        <><Zap className="w-3.5 h-3.5" /> Score Agents</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Best Agent Callout */}
                {bestAgent && (
                  <div className="rounded-xl gradient-primary p-4 text-white flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-300" />
                    <div className="flex-1">
                      <div className="text-[10px] text-emerald-100 font-semibold uppercase">Optimal Match</div>
                      <div className="text-sm font-bold">{bestAgent.name}</div>
                      <div className="text-[10px] text-emerald-100">
                        Score: {bestAgent.score} • rating: {bestAgent.rating}★ • {bestAgent.distance}km away
                      </div>
                    </div>
                  </div>
                )}

                {/* List of Scored Agents */}
                {rankings.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600">Select Field Agent</div>
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-2">
                      {rankings.map((agent) => (
                        <label
                          key={agent.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            selectedAgentId === agent.id
                              ? "border-indigo-500 bg-indigo-50/20"
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="agent_select"
                              checked={selectedAgentId === agent.id}
                              onChange={() => setSelectedAgentId(agent.id)}
                              className="text-indigo-600 border-slate-300 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {agent.name}
                                <span className="text-[10px] text-slate-400 font-normal">({agent.skill})</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                <span>⭐ {agent.rating} Rating</span>
                                <span>📍 {agent.distance} km</span>
                                <span>💼 Workload: {agent.workload}/10</span>
                              </div>
                            </div>
                          </div>
                          <span className="font-black text-indigo-600">{agent.score}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleActivateProject}
                  disabled={activating || !selectedAgentId}
                  className="w-full py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
                >
                  {activating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Launching...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Activate Project & Launch Construction</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
