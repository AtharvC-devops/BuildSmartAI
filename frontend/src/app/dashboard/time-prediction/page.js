"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Clock, Sparkles, Loader2, Users, Ruler, Gauge, Calendar, AlertTriangle,
  RefreshCw, Play, CheckCircle2, ChevronRight, X, Info, ShieldAlert,
  Flame, CloudRain, ShieldCheck, HelpCircle
} from "lucide-react";
import {
  getProjects, getProjectSchedule, updateProjectPhase, updateProjectScheduleRisks, predictTime
} from "@/lib/api";

const complexityLabels = [
  { value: 1, label: "Simple – Basic structure" },
  { value: 2, label: "Standard – Moderate features" },
  { value: 3, label: "Complex – Multiple systems" },
  { value: 4, label: "Advanced – Premium finishes" },
  { value: 5, label: "Ultra – Architectural marvel" },
];

export default function TimePredictionPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [activeTab, setActiveTab] = useState("scheduling"); // "scheduling" or "ai"

  // Scheduling State
  const [scheduleData, setScheduleData] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingRisk, setSavingRisk] = useState(false);

  // Phase editing
  const [editingPhase, setEditingPhase] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "Not Started",
    progress: 0,
    delayDays: 0,
    actualStart: "",
    actualEnd: ""
  });

  // Legacy AI Prediction state
  const [form, setForm] = useState({ area: 3000, workers: 20, complexity: 3 });
  const [aiResult, setAiResult] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Load Projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const projList = await getProjects();
        setProjects(projList);
        if (projList.length > 0) {
          setSelectedProjectId(projList[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProjects();
  }, []);

  const refreshSchedule = async () => {
    if (!selectedProjectId) return;
    setLoadingSchedule(true);
    try {
      const pid = parseInt(selectedProjectId);
      const data = await getProjectSchedule(pid);
      setScheduleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      refreshSchedule();
    }
  }, [selectedProjectId]);

  const handleToggleRisk = async (riskKey) => {
    if (!scheduleData || !scheduleData.project) return;
    setSavingRisk(true);
    try {
      const proj = scheduleData.project;
      const updatedRisks = {
        monsoonActive: riskKey === "monsoon" ? !proj.monsoonActive : !!proj.monsoonActive,
        materialDelayActive: riskKey === "material" ? !proj.materialDelayActive : !!proj.materialDelayActive,
        labourShortageActive: riskKey === "labour" ? !proj.labourShortageActive : !!proj.labourShortageActive,
        approvalDelayActive: riskKey === "approval" ? !proj.approvalDelayActive : !!proj.approvalDelayActive
      };

      await updateProjectScheduleRisks(parseInt(selectedProjectId), updatedRisks);
      await refreshSchedule();
    } catch (err) {
      alert("Error updating risks: " + err.message);
    } finally {
      setSavingRisk(false);
    }
  };

  const handleOpenEditPhase = (phase) => {
    setEditingPhase(phase);
    setEditForm({
      status: phase.status,
      progress: phase.progress,
      delayDays: phase.delayDays,
      actualStart: phase.actualStart || "",
      actualEnd: phase.actualEnd || ""
    });
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    if (!editingPhase) return;
    setLoadingSchedule(true);
    try {
      await updateProjectPhase(parseInt(selectedProjectId), editingPhase.id, editForm);
      await refreshSchedule();
      setEditingPhase(null);
    } catch (err) {
      alert("Error updating phase: " + err.message);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Submit legacy regression model prediction
  const handleAiPredictSubmit = async (e) => {
    e.preventDefault();
    setLoadingAi(true);
    try {
      const data = await predictTime({
        area: parseFloat(form.area),
        workers: parseInt(form.workers),
        complexity: parseInt(form.complexity)
      });
      setAiResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Construction Phase Scheduling & Gantt</h2>
          <p className="text-xs text-slate-500 mt-1">Dependency-aware scheduling worksheets, critical path timelines, and weather/approval delay models</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Select Project:</label>
          <select
            className="input-field max-w-[220px] bg-slate-50"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("scheduling")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "scheduling" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-4 h-4" /> Construction Phase Schedule
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "ai" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Legacy ML Regression Model
        </button>
      </div>

      {/* ──── TAB 1: PHASE SCHEDULING & GANTT ──── */}
      {activeTab === "scheduling" && (
        <div className="space-y-6 animate-fadeIn">
          {loadingSchedule && !scheduleData ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs text-slate-400">Recalculating dependencies path...</span>
            </div>
          ) : (
            <>
              {/* Warnings Banner */}
              {scheduleData?.metrics?.delayDays > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900">Schedule Slip Warning</h4>
                    <p className="mt-0.5">
                      This project's critical path is currently delayed by **{scheduleData.metrics.delayDays} days**. 
                      Expected completion has shifted from {scheduleData.metrics.plannedCompletion} to **{scheduleData.metrics.expectedCompletion}**.
                    </p>
                  </div>
                </div>
              )}

              {/* Aggregated KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Planned Completion</div>
                  <div className="text-sm font-black text-slate-800 mt-1">{scheduleData?.metrics?.plannedCompletion}</div>
                </div>
                <div className="glass-card p-4 text-center border-l-4 border-l-orange-500">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expected Completion</div>
                  <div className={`text-sm font-black mt-1 ${scheduleData?.metrics?.delayDays > 0 ? "text-red-700 font-black" : "text-slate-800"}`}>
                    {scheduleData?.metrics?.expectedCompletion}
                  </div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Delay</div>
                  <div className={`text-lg font-black mt-0.5 ${scheduleData?.metrics?.delayDays > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {scheduleData?.metrics?.delayDays} days
                  </div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Active Phase</div>
                  <div className="text-xs font-bold text-indigo-700 mt-1.5">{scheduleData?.metrics?.currentPhase}</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Upcoming Phase</div>
                  <div className="text-xs font-semibold text-slate-600 mt-1.5">{scheduleData?.metrics?.upcomingPhase}</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delayed Phases</div>
                  <div className="text-xs font-bold text-red-600 mt-1.5">
                    {scheduleData?.metrics?.delayedPhases?.length > 0 
                      ? `${scheduleData.metrics.delayedPhases.length} delayed` 
                      : "None"}
                  </div>
                </div>
              </div>

              {/* Main scheduling grid split */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Phases Scheduler table */}
                <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Phase Timelines & Dependency Progress
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                          <th className="py-3 px-6">Phase Name</th>
                          <th className="py-3 px-4">Dependency</th>
                          <th className="py-3 px-4">Planned Timeline</th>
                          <th className="py-3 px-4">Actual Timeline</th>
                          <th className="py-3 px-4 text-center">Progress %</th>
                          <th className="py-3 px-4 text-center">Delay</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-6 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleData?.phases?.map((phase) => (
                          <tr key={phase.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                            <td className="py-3.5 px-6 font-bold text-slate-800">{phase.phaseName}</td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium">{phase.dependency}</td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono">
                              {phase.plannedStart} <span className="text-[10px] text-slate-400">to</span> {phase.plannedEnd}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono">
                              {phase.actualStart ? (
                                <>{phase.actualStart} <span className="text-[10px] text-slate-400">to</span> {phase.actualEnd || "—"}</>
                              ) : "Not Started"}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-indigo-600 h-full" style={{ width: `${phase.progress}%` }} />
                                </div>
                                <span>{phase.progress}%</span>
                              </div>
                            </td>
                            <td className={`py-3.5 px-4 text-center font-bold ${phase.delayDays > 0 ? "text-red-600" : "text-slate-400"}`}>
                              {phase.delayDays > 0 ? `+${phase.delayDays}d` : "0d"}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                phase.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                phase.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                {phase.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <button
                                onClick={() => handleOpenEditPhase(phase)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Risk Factors settings panel */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4 text-left">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" /> Active Risk Factors</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Activate potential external blockers to calculate schedule impacts automatically</p>
                    </div>

                    <div className="space-y-3 pt-2 text-xs">
                      {/* Monsoon Period */}
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                          checked={!!scheduleData?.project?.monsoonActive}
                          disabled={savingRisk}
                          onChange={() => handleToggleRisk("monsoon")}
                        />
                        <div>
                          <div className="font-bold text-slate-700 flex items-center gap-1"><CloudRain className="w-3.5 h-3.5 text-blue-500" /> Monsoon Period</div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Estimated Impact: **+15 days**</p>
                        </div>
                      </label>

                      {/* Material Shortage */}
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                          checked={!!scheduleData?.project?.materialDelayActive}
                          disabled={savingRisk}
                          onChange={() => handleToggleRisk("material")}
                        />
                        <div>
                          <div className="font-bold text-slate-700 flex items-center gap-1">Supply Chain delays</div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Estimated Impact: **+10 days**</p>
                        </div>
                      </label>

                      {/* Labour Shortages */}
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                          checked={!!scheduleData?.project?.labourShortageActive}
                          disabled={savingRisk}
                          onChange={() => handleToggleRisk("labour")}
                        />
                        <div>
                          <div className="font-bold text-slate-700 flex items-center gap-1">Subcontractor shortages</div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Estimated Impact: **+12 days**</p>
                        </div>
                      </label>

                      {/* Approvals Delays */}
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                          checked={!!scheduleData?.project?.approvalDelayActive}
                          disabled={savingRisk}
                          onChange={() => handleToggleRisk("approval")}
                        />
                        <div>
                          <div className="font-bold text-slate-700 flex items-center gap-1">Regulatory Approvals tardy</div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Estimated Impact: **+8 days**</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ──── TAB 2: LEGACY ML ESTIMATOR ──── */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Input Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <form onSubmit={handleAiPredictSubmit} className="glass-card p-6 space-y-5 text-left text-xs">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <Clock className="w-4.5 h-4.5 text-blue-600" /> Timeline Parameters
              </h3>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Area (sq ft)</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  min="100"
                  max="50000"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Number of Workers</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.workers}
                  onChange={(e) => setForm({ ...form, workers: e.target.value })}
                  min="1"
                  max="200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Project Complexity</label>
                <select
                  className="input-field bg-slate-50"
                  value={form.complexity}
                  onChange={(e) => setForm({ ...form, complexity: e.target.value })}
                >
                  {complexityLabels.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loadingAi}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loadingAi ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Estimating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Estimate Time</>
                )}
              </button>
            </form>
          </motion.div>

          {/* AI Results */}
          <AnimatePresence mode="wait">
            {aiResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5 text-left text-xs"
              >
                {/* Total Days Card */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 font-semibold">Estimated Duration</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                      Capacity-based estimate
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-slate-900">{aiResult.estimated_days}</span>
                    <span className="text-lg text-slate-400">days</span>
                  </div>
                  <div className="text-slate-400 mt-1">
                    ≈ {Math.round(aiResult.estimated_days / 30)} months
                  </div>
                  {aiResult.fallback && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      ⚠️ Using fallback calculation (AI service offline)
                    </div>
                  )}
                </div>

                {/* Timeline Visualization */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Project Phases (Regression split)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={aiResult.phases} layout="vertical" barSize={15}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} unit=" d" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                        formatter={(v) => [`${v} days`, "Duration"]}
                      />
                      <Bar dataKey="duration" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2 text-xs">
                <Info className="w-8 h-8 text-slate-300" />
                <span>Fill in parameter specifications and click Estimate to run legacy AI regression.</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Phase Modal */}
      <AnimatePresence>
        {editingPhase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4.5 h-4.5 text-indigo-400" /> Edit Phase: {editingPhase.phaseName}
                </div>
                <button onClick={() => setEditingPhase(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePhase} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input-field bg-slate-50"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Progress Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.progress}
                      onChange={(e) => setEditForm(prev => ({ ...prev, progress: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Phase Delay (Days)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.delayDays}
                      onChange={(e) => setEditForm(prev => ({ ...prev, delayDays: parseInt(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Actual Start Date</label>
                    <input
                      type="date"
                      value={editForm.actualStart}
                      onChange={(e) => setEditForm(prev => ({ ...prev, actualStart: e.target.value }))}
                      className="input-field bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Actual End Date</label>
                    <input
                      type="date"
                      value={editForm.actualEnd}
                      onChange={(e) => setEditForm(prev => ({ ...prev, actualEnd: e.target.value }))}
                      className="input-field bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingPhase(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                  >
                    Save Changes
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
