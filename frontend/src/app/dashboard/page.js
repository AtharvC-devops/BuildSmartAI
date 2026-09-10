"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import {
  DollarSign, Clock, Users, ShieldAlert, FileText, CheckCircle2,
  AlertTriangle, Play, ChevronRight, Activity, Calendar, ArrowUpRight,
  TrendingUp, Layers, BadgeAlert, ShoppingBag, Landmark, Bell, Loader2, Plus, X, PlusCircle
} from "lucide-react";
import {
  getProjects, getProjectDashboardData, getProjectSegmentConfig, updateProjectSegmentConfig, createProject
} from "@/lib/api";

import { useAuth } from "@/context/AuthContext";
import SmallBuilderDashboard from "@/components/SmallBuilderDashboard";
import MidDeveloperDashboard from "@/components/MidDeveloperDashboard";
import LargePortfolioDashboard from "@/components/LargePortfolioDashboard";

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function BuilderDashboard() {
  const { user, canAccessFeature } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [creatingProj, setCreatingProj] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    location: "",
    budget: 5000000,
    area: 2500,
    floors: 2,
    type: "residential"
  });

  // Load Projects
  const loadProjects = async () => {
    if (user?.builderScale !== "LARGE") return;
    try {
      const projList = await getProjects();
      setProjects(projList);
      if (projList.length > 0) {
        setSelectedProjectId(projList[0].id.toString());
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load projects list.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user?.builderScale]);

  const [currentSegment, setCurrentSegment] = useState("");

  const refreshDashboard = async () => {
    if (user?.builderScale !== "LARGE") return;
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem("buildsmart_selected_project_id", selectedProjectId);
      window.dispatchEvent(new Event("projectChanged"));

      const [data, seg] = await Promise.all([
        getProjectDashboardData(parseInt(selectedProjectId)),
        getProjectSegmentConfig(parseInt(selectedProjectId))
      ]);
      setDashData(data);
      setCurrentSegment(seg.scaleSegment);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve dashboard details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreatingProj(true);
    try {
      const created = await createProject({
        name: projectForm.name,
        location: projectForm.location || "City Location",
        budget: parseFloat(projectForm.budget),
        area: parseFloat(projectForm.area),
        floors: parseInt(projectForm.floors),
        type: projectForm.type
      });
      setProjectModalOpen(false);
      setProjectForm({ name: "", location: "", budget: 5000000, area: 2500, floors: 2, type: "residential" });
      await loadProjects();
    } catch (err) {
      alert(err.message || "Failed to create project.");
    } finally {
      setCreatingProj(false);
    }
  };

  const handleUpdateSegment = async (scaleSegment) => {
    try {
      await updateProjectSegmentConfig(parseInt(selectedProjectId), scaleSegment);
      await refreshDashboard();
    } catch (err) {
      alert("Error updating segment: " + err.message);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      refreshDashboard();
    }
  }, [selectedProjectId, user?.builderScale]);

  const getAlertIcon = (type) => {
    switch (type) {
      case "Cost": return <DollarSign className="w-4 h-4 text-red-600" />;
      case "Schedule": return <Clock className="w-4 h-4 text-orange-600" />;
      case "Material": return <ShoppingBag className="w-4 h-4 text-amber-650" />;
      case "Labour": return <Users className="w-4 h-4 text-indigo-600" />;
      default: return <ShieldAlert className="w-4 h-4 text-rose-600" />;
    }
  };

  const getAlertBg = (sev) => {
    switch (sev) {
      case "CRITICAL": return "bg-red-50 text-red-800 border-red-200";
      case "HIGH": return "bg-orange-50 text-orange-850 border-orange-200";
      default: return "bg-amber-50 text-amber-900 border-amber-200";
    }
  };

  if (user?.builderScale === "SMALL") return <SmallBuilderDashboard />;
  if (user?.builderScale === "MID") return <MidDeveloperDashboard />;
  if (user?.builderScale === "LARGE") return <LargePortfolioDashboard />;

  return (
    <div className="space-y-6">
      {/* Top Header Selector Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Builder Control Tower</h2>
          <p className="text-xs text-slate-500 mt-1">Cross-module decision matrix tracking budgets, schedule delay vectors, site activities, and compliance logs</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setProjectModalOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Project
          </button>

          {projects.length > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 shrink-0">Scale Segment:</label>
                <select
                  className="input-field max-w-[180px] bg-slate-50 py-1"
                  value={currentSegment}
                  onChange={(e) => handleUpdateSegment(e.target.value)}
                >
                  <option value="Large Developer">Large Developer</option>
                  <option value="Mid-size Developer">Mid-size Developer</option>
                  <option value="Small Contractor">Small Contractor</option>
                </select>
              </div>
              
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 shrink-0">Active Project:</label>
                <select
                  className="input-field max-w-[220px] bg-slate-50 py-1"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {projects.length === 0 && !loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm max-w-xl mx-auto my-12">
          <PlusCircle className="w-14 h-14 text-blue-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have no active construction projects. Click below to create your first project!
          </p>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Your First Project
          </button>
        </div>
      )}

      {loading && !dashData ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs text-slate-400">Loading control cards...</span>
        </div>
      ) : (
        <>
          {/* Actionable ALERTS Panel */}
          {dashData?.alerts?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm space-y-3 text-left">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
                <Bell className="w-4 h-4 text-red-500 animate-bounce" /> Critical Actions Required Today
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dashData.alerts.map((al, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${getAlertBg(al.severity)}`}
                  >
                    <div className="p-1 rounded bg-white shrink-0 shadow-sm mt-0.5">
                      {getAlertIcon(al.type)}
                    </div>
                    <div>
                      <span className="font-black mr-1">[{al.severity}] {al.type}:</span>
                      <span>{al.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECT OVERVIEW: Budget control row */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-left">
            <div className="glass-card p-4">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> Project Budget</div>
              <div className="text-sm font-black text-slate-800 mt-1">{formatINR(dashData?.overview?.budget)}</div>
            </div>
            <div className="glass-card p-4 border-l-4 border-l-indigo-500">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">Actual Spent</div>
              <div className="text-sm font-black text-slate-800 mt-1">{formatINR(dashData?.overview?.spent)}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">Remaining Budget</div>
              <div className="text-sm font-black text-slate-800 mt-1">{formatINR(dashData?.overview?.remaining)}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">Spend Variance</div>
              <div className={`text-sm font-black mt-1 ${dashData?.overview?.variance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {dashData?.overview?.variance > 0 ? "+" : ""}
                {formatINR(dashData?.overview?.variance)}
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">Physical Progress</div>
              <div className="text-lg font-black text-indigo-700 mt-0.5">{dashData?.overview?.progress}%</div>
            </div>
            <div className="glass-card p-4 border-l-4 border-l-orange-500">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5"><Calendar className="w-3.5 h-3.5 text-orange-500" /> Expected Handover</div>
              <div className="text-xs font-black text-slate-800 mt-1.5">{dashData?.overview?.expectedCompletion}</div>
            </div>
          </div>

          {/* Main sections split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Left 2 columns: COST CONTROL & SCHEDULE */}
            <div className="lg:col-span-2 space-y-6">
              {/* COST CONTROL: Estimated vs Actual chart */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4.5 h-4.5 text-indigo-650" /> Cost Control: Estimated vs Actual Comparison
                  </h4>
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded">
                    Variance: {dashData?.costControl?.variancePercent?.toFixed(1)}%
                  </span>
                </div>
                
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashData?.costControl?.chartData || []} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 9, fill: "#64748b" }} formatter={(v) => `₹${v/1000}k`} />
                      <Tooltip formatter={(v) => [formatINR(v), ""]} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="estimated" name="BOQ Baseline Est" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name="Actual Expenditure" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
                  {/* Top Overruns */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-red-800 text-[11px] uppercase tracking-wider">Top Category Overruns</h5>
                    <div className="divide-y divide-slate-100">
                      {dashData?.costControl?.topOverruns?.length === 0 ? (
                        <div className="py-4 text-slate-400 text-xs">No cost overruns recorded.</div>
                      ) : (
                        dashData?.costControl?.topOverruns?.map((ov, idx) => (
                          <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">{ov.category}</span>
                            <span className="font-black text-red-600">+{formatINR(ov.variance)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Expenses */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Recent Expense Ledger</h5>
                    <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto pr-1">
                      {dashData?.costControl?.recentExpenses?.map((ex) => (
                        <div key={ex.id} className="py-2 flex justify-between items-center text-xs gap-3">
                          <div className="truncate">
                            <div className="font-bold text-slate-700 truncate">{ex.description}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{ex.date} • {ex.category}</div>
                          </div>
                          <span className="font-black text-slate-900 shrink-0">{formatINR(ex.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SCHEDULE: Gantt status */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Clock className="w-4.5 h-4.5 text-orange-500" /> Milestone Schedule Variance
                  </h4>
                  <span className="text-[10px] bg-orange-50 text-orange-700 font-bold px-2.5 py-0.5 rounded border border-orange-100">
                    Phase delays: {dashData?.schedule?.delayDays} days
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-400 font-semibold text-[10px]">Planned Handover</div>
                    <div className="font-black text-slate-850 mt-0.5">{dashData?.schedule?.plannedCompletion}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-semibold text-[10px]">Active Phase</div>
                    <div className="font-black text-indigo-700 mt-0.5">{dashData?.schedule?.currentPhase}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-semibold text-[10px]">Delayed Phases Count</div>
                    <div className="font-black text-red-600 mt-0.5">{dashData?.schedule?.delayedPhasesCount} Delayed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: SITE OPERATION & FINANCE */}
            <div className="space-y-6">
              {/* SITE OPERATIONS Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-650" /> Site Operations Diary
                </h4>

                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-indigo-50/30 border border-indigo-100/50">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's active crew</span>
                      <span className="font-black text-indigo-900 text-base">{dashData?.site?.todayLabour} Workers present</span>
                    </div>
                    <Users className="w-8 h-8 text-indigo-600/30 shrink-0" />
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/20 border border-emerald-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's progress increment</span>
                      <span className="font-black text-emerald-800 text-base">+{dashData?.site?.todayProgress}% Progress added</span>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-emerald-600/30 shrink-0" />
                  </div>

                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Materials Consumption (Latest Log)</span>
                    <p className="font-medium text-slate-700 font-mono leading-relaxed">{dashData?.site?.materialsConsumedText}</p>
                  </div>
                </div>
              </div>

              {/* FINANCE: RA BILLS Card */}
              {canAccessFeature("ra_billing") && (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-indigo-650" /> RA Certification & Payouts
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">Pending RA Bills ({dashData?.finance?.pendingBillsCount}):</span>
                      <span className="font-black text-amber-700 text-sm">{formatINR(dashData?.finance?.pendingAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">Approved Payouts:</span>
                      <span className="font-black text-slate-800">{formatINR(dashData?.finance?.approvedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-slate-400 text-[10px]">
                      <span>Total Certified Contract Bills:</span>
                      <span className="font-bold text-slate-650">{dashData?.finance?.totalBillsCount} records</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      <AnimatePresence>
        {projectModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" /> Create New Construction Project
                </h3>
                <button
                  onClick={() => setProjectModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    placeholder="e.g. Sunrise Heights Block B"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Location *</label>
                    <input
                      type="text"
                      required
                      value={projectForm.location}
                      onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                      placeholder="e.g. FC Road, Pune"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Project Type</label>
                    <select
                      value={projectForm.type}
                      onChange={(e) => setProjectForm({ ...projectForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Budget (₹) *</label>
                    <input
                      type="number"
                      required
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Area (sqft) *</label>
                    <input
                      type="number"
                      required
                      value={projectForm.area}
                      onChange={(e) => setProjectForm({ ...projectForm, area: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Floors *</label>
                    <input
                      type="number"
                      required
                      value={projectForm.floors}
                      onChange={(e) => setProjectForm({ ...projectForm, floors: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setProjectModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProj}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                  >
                    {creatingProj ? "Saving Project..." : "Save Project"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
