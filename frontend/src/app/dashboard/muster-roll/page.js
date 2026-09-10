"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Sparkles, Loader2, Plus, FileText, CheckCircle2,
  AlertTriangle, Layers, PlusCircle, X, Check, Ban, Filter, Calendar, Briefcase
} from "lucide-react";
import {
  getProjects, getProjectContractors, getProjectLabour,
  getProjectWorkers, createProjectWorker, logProjectAttendance
} from "@/lib/api";
import { translations } from "@/lib/translations";

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const SKILL_OPTIONS = [
  "Site preparation",
  "Excavation",
  "Foundation",
  "RCC/Structure",
  "Brickwork",
  "Plaster",
  "Electrical",
  "Plumbing",
  "Flooring",
  "Painting",
  "Finishing",
  "Inspection",
  "Handover"
];

const CONFIGURED_MINIMUM_WAGE = { Maharashtra: 500 };

export default function MusterRollPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [workers, setWorkers] = useState([]);
  const [contractors, setContractors] = useState([]);
  
  // Dashboard indicators
  const [stats, setStats] = useState({ totalWorkers: 0, presentToday: 0, absentToday: 0, costToday: 0, costMonth: 0 });
  const [musterRows, setMusterRows] = useState([]);

  // Filters
  const [filterContractorId, setFilterContractorId] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [filterWorkerType, setFilterWorkerType] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Worker Form
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    name: "",
    workerType: "Daily Wage",
    skill: "Site preparation",
    contractorId: "",
    dailyWage: 500,
    status: "Active"
  });

  // Attendance Form
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]); // list of { workerId, status, regularHours, overtimeHours }

  const [locale, setLocale] = useState("en");

  const syncLocale = () => {
    const val = localStorage.getItem("buildsmart_locale") || "en";
    setLocale(val);
  };

  useEffect(() => {
    syncLocale();
    window.addEventListener("languageChanged", syncLocale);
    return () => {
      window.removeEventListener("languageChanged", syncLocale);
    };
  }, []);

  const t = translations[locale] || translations.en;

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

  // Load contractors
  useEffect(() => {
    async function loadContractors() {
      if (!selectedProjectId) return;
      try {
        const cList = await getProjectContractors(parseInt(selectedProjectId));
        setContractors(cList);
        if (cList.length > 0) {
          setWorkerForm(prev => ({ ...prev, contractorId: cList[0].id.toString() }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadContractors();
  }, [selectedProjectId]);

  const refreshLabourDashboard = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [labourData, wList] = await Promise.all([
        getProjectLabour(parseInt(selectedProjectId), {
          date: filterDate,
          contractorId: filterContractorId,
          skill: filterSkill,
          workerType: filterWorkerType
        }),
        getProjectWorkers(parseInt(selectedProjectId))
      ]);

      const summary = labourData.summary || {};
      setStats({ ...summary, costToday: summary.labourCostToday || 0, costMonth: summary.labourCostThisMonth || 0 });
      setMusterRows(labourData.musterRoll || []);
      setWorkers(wList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      refreshLabourDashboard();
    }
  }, [selectedProjectId, filterDate, filterContractorId, filterSkill, filterWorkerType]);

  const handleOpenAddWorker = () => {
    setWorkerForm({
      name: "",
      workerType: "Daily Wage",
      skill: "Site preparation",
      contractorId: contractors.length > 0 ? contractors[0].id.toString() : "",
      dailyWage: 500,
      status: "Active"
    });
    setWorkerModalOpen(true);
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProjectWorker(parseInt(selectedProjectId), {
        ...workerForm,
        contractorId: parseInt(workerForm.contractorId),
        dailyWage: parseFloat(workerForm.dailyWage)
      });
      setWorkerModalOpen(false);
      await refreshLabourDashboard();
    } catch (err) {
      alert("Error adding worker: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAttendance = () => {
    // Populate attendance logs with active workers for selected date
    const initialLogs = workers.map(w => {
      // Find if we already have attendance in musterRows for this worker
      const existing = musterRows.find(row => row.workerId === w.id);
      return {
        workerId: w.id,
        workerName: w.name,
        status: existing ? existing.attendanceStatus : "Present",
        regularHours: existing ? existing.regularHours : 8,
        overtimeHours: existing ? existing.overtimeHours : 0
      };
    });
    setAttendanceLogs(initialLogs);
    setAttendanceModalOpen(true);
  };

  const handleUpdateAttendanceLog = (workerId, field, val) => {
    setAttendanceLogs(prev => prev.map(log => {
      if (log.workerId === workerId) {
        return { ...log, [field]: val };
      }
      return log;
    }));
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await logProjectAttendance(parseInt(selectedProjectId), {
        date: filterDate,
        attendance: attendanceLogs.map(log => ({
          workerId: log.workerId,
          status: log.status,
          regularHours: parseFloat(log.regularHours) || 0,
          overtimeHours: parseFloat(log.overtimeHours) || 0
        }))
      });
      setAttendanceModalOpen(false);
      await refreshLabourDashboard();
    } catch (err) {
      alert("Error saving attendance logs: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-slate-500 text-sm">Aggregating crew muster roll...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.musterRoll}</h2>
          <p className="text-xs text-slate-500 mt-1">Configure daily crew logs, certified wages multipliers, and attendance checks</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Crew List</div>
          <div className="text-lg font-black text-slate-850 mt-1">{stats.totalWorkers} Workers</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-emerald-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.presentToday}</div>
          <div className="text-lg font-black text-emerald-700 mt-1">{stats.presentToday} Present</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-red-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.absentToday}</div>
          <div className="text-lg font-black text-red-700 mt-1">{stats.absentToday} Absent</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-indigo-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.labourCostToday}</div>
          <div className="text-sm font-black text-indigo-700 mt-1.5">{formatINR(stats.costToday)}</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-purple-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.labourCostMonth}</div>
          <div className="text-sm font-black text-purple-700 mt-1.5">{formatINR(stats.costMonth)}</div>
        </div>
      </div>

      <div className={`rounded-xl border p-3 text-xs font-semibold ${workers.some(worker => Number(worker.dailyWage) < CONFIGURED_MINIMUM_WAGE.Maharashtra) ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
        {workers.some(worker => Number(worker.dailyWage) < CONFIGURED_MINIMUM_WAGE.Maharashtra)
          ? `Minimum-wage review: one or more workers are below the configured Maharashtra rate of ₹${CONFIGURED_MINIMUM_WAGE.Maharashtra}/day.`
          : `Minimum-wage check passed against the configured Maharashtra rate of ₹${CONFIGURED_MINIMUM_WAGE.Maharashtra}/day.`}
      </div>

      {/* Filters & Actions Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs text-left">
        <h4 className="font-bold text-slate-700 flex items-center gap-1"><Filter className="w-4 h-4" /> {t.filters}</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-slate-500 mb-1">Muster Date</label>
            <input
              type="date"
              className="input-field bg-slate-50"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Subcontractor / Contractor</label>
            <select
              className="input-field bg-slate-50"
              value={filterContractorId}
              onChange={(e) => setFilterContractorId(e.target.value)}
            >
              <option value="">All Contractors</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">{t.skill}</label>
            <select
              className="input-field bg-slate-50"
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
            >
              <option value="">All Skills</option>
              {SKILL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Worker Type</label>
            <select
              className="input-field bg-slate-50"
              value={filterWorkerType}
              onChange={(e) => setFilterWorkerType(e.target.value)}
            >
              <option value="">All Worker Types</option>
              <option value="Daily Wage">Daily Wage</option>
              <option value="Contracted">Contracted</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleOpenAttendance}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
            >
              Muster Check
            </button>
            <button
              onClick={handleOpenAddWorker}
              className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
            >
              Add Worker
            </button>
          </div>
        </div>
      </div>

      {/* Muster Roll Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden text-xs text-left">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Muster Roll Ledger</h3>
          <span className="font-mono text-slate-500">Muster date: {filterDate}</span>
        </div>

        {musterRows.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            No active worker muster rolls found matching select criteria. Click 'Muster Check' to log attendance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                  <th className="py-3 px-6">{t.workerName}</th>
                  <th className="py-3 px-4">{t.skill}</th>
                  <th className="py-3 px-4 text-center">{t.attendance}</th>
                  <th className="py-3 px-4 text-center">{t.dailyWage}</th>
                  <th className="py-3 px-4 text-center">{t.regularHours}</th>
                  <th className="py-3 px-4 text-center">{t.overtimeHours}</th>
                  <th className="py-3 px-4 text-center">{t.regularWage}</th>
                  <th className="py-3 px-4 text-center">{t.overtimeWage}</th>
                  <th className="py-3 px-6 text-right">{t.totalWage}</th>
                </tr>
              </thead>
              <tbody>
                {musterRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="py-3.5 px-6 font-bold text-slate-855">{row.workerName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{row.skill}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.attendanceStatus === "Present" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        {row.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-550 font-mono">{formatINR(row.dailyWage)}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{row.regularHours}h</td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{row.overtimeHours}h</td>
                    <td className="py-3.5 px-4 text-center text-slate-550 font-mono">{formatINR(row.regularWage)}</td>
                    <td className="py-3.5 px-4 text-center text-slate-550 font-mono">{formatINR(row.overtimeWage)}</td>
                    <td className="py-3.5 px-6 text-right font-black text-slate-850 font-mono">{formatINR(row.totalWage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Worker Modal */}
      <AnimatePresence>
        {workerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <PlusCircle className="w-4.5 h-4.5 text-indigo-400" /> Register Worker
                </div>
                <button onClick={() => setWorkerModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWorker} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Worker name..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Worker Type</label>
                    <select
                      value={workerForm.workerType}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, workerType: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      <option value="Daily Wage">Daily Wage</option>
                      <option value="Contracted">Contracted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">{t.skill}</label>
                    <select
                      value={workerForm.skill}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, skill: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {SKILL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Subcontractor</label>
                    <select
                      value={workerForm.contractorId}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, contractorId: e.target.value }))}
                      className="input-field bg-slate-50"
                      required
                    >
                      {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">{t.dailyWage}</label>
                    <input
                      type="number"
                      value={workerForm.dailyWage}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, dailyWage: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setWorkerModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Register Worker
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance / Muster Check Modal */}
      <AnimatePresence>
        {attendanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4.5 h-4.5 text-indigo-400" /> Daily Muster Check: {filterDate}
                </div>
                <button onClick={() => setAttendanceModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAttendance} className="p-6 space-y-4 text-left text-xs max-h-[450px] overflow-y-auto">
                <div className="space-y-3">
                  {attendanceLogs.map((log) => (
                    <div key={log.workerId} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-805 truncate max-w-[150px]">{log.workerName}</div>
                      
                      <div className="flex items-center gap-3">
                        {/* Status select */}
                        <select
                          className="bg-white border border-slate-200 text-xs px-2 py-0.5 rounded"
                          value={log.status}
                          onChange={(e) => handleUpdateAttendanceLog(log.workerId, "status", e.target.value)}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>

                        {log.status === "Present" && (
                          <div className="flex items-center gap-2">
                            {/* Regular hours */}
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] text-slate-400">Reg:</span>
                              <input
                                type="number"
                                className="w-12 bg-white border border-slate-200 text-center py-0.5 text-xs rounded"
                                value={log.regularHours}
                                onChange={(e) => handleUpdateAttendanceLog(log.workerId, "regularHours", e.target.value)}
                                min="0"
                                max="12"
                              />
                            </div>
                            {/* Overtime hours */}
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] text-slate-400">OT:</span>
                              <input
                                type="number"
                                className="w-12 bg-white border border-slate-200 text-center py-0.5 text-xs rounded"
                                value={log.overtimeHours}
                                onChange={(e) => handleUpdateAttendanceLog(log.workerId, "overtimeHours", e.target.value)}
                                min="0"
                                max="8"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAttendanceModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg font-semibold flex items-center gap-1"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Attendance
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
