"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sparkles, Loader2, Plus, AlertTriangle, ShieldAlert,
  Layers, PlusCircle, X, ChevronRight, Check, Ban, Filter, Calendar, Info, CloudSun, Hammer, Camera
} from "lucide-react";
import {
  getProjects, getProjectLogs, createProjectLog
} from "@/lib/api";
import { translations } from "@/lib/translations";

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const WEATHER_OPTIONS = ["Sunny", "Rainy", "Cloudy", "Windy", "Extreme Heat"];

export default function DailyLogsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [logs, setLogs] = useState([]);
  const [filterDate, setFilterDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickUpdate, setQuickUpdate] = useState("");

  // Modals & form state
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    date: "",
    weather: "Sunny",
    workers: 10,
    tasks: "",
    materialsReceived: "",
    cementBags: 0,
    steelTons: 0,
    bricks: 0,
    equipmentUsed: "",
    issues: "None",
    safetyNotes: "All staff wearing appropriate safety equipment.",
    progressPercentage: 2,
    photos: []
  });

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

  const refreshLogs = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const allLogs = await getProjectLogs(parseInt(selectedProjectId));
      // filter logs by date if selected
      const filtered = filterDate ? allLogs.filter(l => l.date === filterDate) : allLogs;
      setLogs(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      refreshLogs();
    }
  }, [selectedProjectId, filterDate]);

  const handleOpenAddLog = () => {
    setLogForm({
      date: new Date().toISOString().split("T")[0],
      weather: "Sunny",
      workers: 10,
      tasks: "",
      materialsReceived: "",
      cementBags: 0,
      steelTons: 0,
      bricks: 0,
      equipmentUsed: "",
      issues: "None",
      safetyNotes: "All staff wearing appropriate safety equipment.",
      progressPercentage: 2,
      photos: []
    });
    setLogModalOpen(true);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogForm(prev => ({ ...prev, photos: [...prev.photos, reader.result] }));
    reader.readAsDataURL(file);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || isNaN(parseInt(selectedProjectId))) {
      alert("Please select or create a project first before registering a daily site log.");
      return;
    }
    setSaving(true);
    try {
      await createProjectLog(parseInt(selectedProjectId), logForm);
      await refreshLogs();
      setLogModalOpen(false);
    } catch (err) {
      alert("Error saving daily log: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUpdate = async (e) => {
    e.preventDefault();
    if (!quickUpdate.trim() || !selectedProjectId) return;
    setSaving(true);
    try {
      await createProjectLog(parseInt(selectedProjectId), {
        date: new Date().toISOString().split("T")[0],
        weather: "Not recorded",
        workers: 0,
        tasks: quickUpdate.trim(),
        materialsReceived: "",
        cementBags: 0,
        steelTons: 0,
        bricks: 0,
        equipmentUsed: "",
        issues: "None",
        safetyNotes: "",
        progressPercentage: 0,
        photos: []
      });
      setQuickUpdate("");
      await refreshLogs();
    } catch (err) {
      alert("Could not save site update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Aggregated summary metrics
  const getDailySummary = () => {
    if (logs.length === 0) return { progress: 0, workers: 0, cement: 0, steel: 0, bricks: 0, issuesCount: 0, safetyCount: 0 };
    const latestLog = logs[0];
    
    const cement = logs.reduce((sum, l) => sum + (l.cementBags || 0), 0);
    const steel = logs.reduce((sum, l) => sum + (l.steelTons || 0), 0);
    const bricks = logs.reduce((sum, l) => sum + (l.bricks || 0), 0);
    
    const issuesCount = logs.filter(l => l.issues && l.issues.toLowerCase() !== "none").length;
    const safetyCount = logs.filter(l => l.safetyNotes && !l.safetyNotes.toLowerCase().includes("no incidents") && !l.safetyNotes.toLowerCase().includes("appropriate")).length;

    return {
      progress: latestLog.progressPercentage || 0,
      workers: latestLog.workers || 0,
      cement,
      steel,
      bricks,
      issuesCount,
      safetyCount
    };
  };

  const stats = getDailySummary();

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-slate-500 text-sm">Loading Daily Site Log...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.dailyLogs}</h2>
          <p className="text-xs text-slate-500 mt-1">Mobile-friendly workspace for site engineers to log works, progress, and materials consumption</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center border-l-4 border-l-blue-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Latest Progress</div>
          <div className="text-lg font-black text-blue-700 mt-1">+{stats.progress}%</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-emerald-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.workersPresent}</div>
          <div className="text-lg font-black text-emerald-700 mt-1">{stats.workers} Present</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-indigo-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.materialConsumption} (Tot)</div>
          <div className="text-xs font-bold text-indigo-700 mt-1">
            {stats.cement} bags Cement • {stats.steel} t Steel
          </div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-amber-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Issues Registered</div>
          <div className="text-lg font-black text-amber-700 mt-1">{stats.issuesCount} Issues</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-purple-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Safety Incidents</div>
          <div className="text-lg font-black text-purple-700 mt-1">{stats.safetyCount} alerts</div>
        </div>
      </div>

      <form onSubmit={handleQuickUpdate} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900"><FileText className="h-4 w-4" /> Quick site update</div>
        <div className="flex flex-col gap-2 sm:flex-row"><input value={quickUpdate} onChange={event => setQuickUpdate(event.target.value)} className="input-field flex-1 bg-white" placeholder="Today RCC work completed in slab area..." /><button disabled={saving || !quickUpdate.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Save Update</button></div>
        <p className="mt-2 text-[11px] text-emerald-700">A short message is saved as today&apos;s daily log.</p>
      </form>

      {/* Filter and Log button */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
          <label className="text-slate-500 font-bold flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Date Filter:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-field bg-slate-50 max-w-[180px]"
          />
          {filterDate && (
            <button onClick={() => setFilterDate("")} className="text-slate-400 hover:text-slate-600 font-semibold">Clear</button>
          )}
        </div>

        <button
          onClick={handleOpenAddLog}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> {t.createLog}
        </button>
      </div>

      {/* Chronological Timeline */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" /> {t.logHistory}
          </h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No Daily logs registered for this project yet. Click '{t.createLog}' to upload site diaries.
          </div>
        ) : (
          <div className="p-6 relative border-l-2 border-slate-100 ml-6 space-y-8 text-left">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-6 text-xs space-y-3">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center" />

                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-800 text-sm">{log.date}</span>
                  <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200/50 gap-0.5 items-center">
                    <CloudSun className="w-3.5 h-3.5 text-slate-500" /> {log.weather}
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {log.workers} present
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{t.workCompleted}</div>
                    <p className="text-slate-600 font-medium leading-relaxed">{log.tasks}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{t.materialConsumption}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between max-w-[180px]">
                        <span className="text-slate-500">{t.cementBags}:</span>
                        <span className="font-bold text-slate-700">{log.cementBags || 0}</span>
                      </div>
                      <div className="flex justify-between max-w-[180px]">
                        <span className="text-slate-500">{t.steelTons}:</span>
                        <span className="font-bold text-slate-700">{log.steelTons || 0}</span>
                      </div>
                      <div className="flex justify-between max-w-[180px]">
                        <span className="text-slate-500">{t.bricks}:</span>
                        <span className="font-bold text-slate-700">{log.bricks || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{t.safetyNotes}</div>
                    <p className="text-slate-600 font-medium leading-relaxed">{log.safetyNotes}</p>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">Progress registered: +{log.progressPercentage}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Log Modal */}
      <AnimatePresence>
        {logModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <FileText className="w-4.5 h-4.5 text-indigo-400" /> {t.createLog}
                </div>
                <button onClick={() => setLogModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLog} className="p-6 space-y-4 text-left text-xs max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      value={logForm.date}
                      onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                      className="input-field bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">{t.weather}</label>
                    <select
                      value={logForm.weather}
                      onChange={(e) => setLogForm(prev => ({ ...prev, weather: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {WEATHER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">{t.workersPresent}</label>
                    <input
                      type="number"
                      value={logForm.workers}
                      onChange={(e) => setLogForm(prev => ({ ...prev, workers: parseInt(e.target.value) || 0 }))}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">{t.progress}</label>
                    <input
                      type="number"
                      value={logForm.progressPercentage}
                      onChange={(e) => setLogForm(prev => ({ ...prev, progressPercentage: parseInt(e.target.value) || 0 }))}
                      className="input-field"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">{t.workCompleted}</label>
                  <input
                    type="text"
                    value={logForm.tasks}
                    onChange={(e) => setLogForm(prev => ({ ...prev, tasks: e.target.value }))}
                    className="input-field"
                    placeholder="Describe tasks completed at site today..."
                    required
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{t.materialConsumption}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-0.5">{t.cementBags}</label>
                      <input
                        type="number"
                        value={logForm.cementBags}
                        onChange={(e) => setLogForm(prev => ({ ...prev, cementBags: parseInt(e.target.value) || 0 }))}
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">{t.steelTons}</label>
                      <input
                        type="number"
                        value={logForm.steelTons}
                        onChange={(e) => setLogForm(prev => ({ ...prev, steelTons: parseInt(e.target.value) || 0 }))}
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">{t.bricks}</label>
                      <input
                        type="number"
                        value={logForm.bricks}
                        onChange={(e) => setLogForm(prev => ({ ...prev, bricks: parseInt(e.target.value) || 0 }))}
                        className="input-field bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">{t.safetyNotes}</label>
                  <input
                    type="text"
                    value={logForm.safetyNotes}
                    onChange={(e) => setLogForm(prev => ({ ...prev, safetyNotes: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className="block text-slate-500 font-semibold mb-1">Issues</label><input type="text" value={logForm.issues} onChange={(e) => setLogForm(prev => ({ ...prev, issues: e.target.value }))} className="input-field" /></div>
                  <div><label className="block text-slate-500 font-semibold mb-1">Equipment Used</label><input type="text" value={logForm.equipmentUsed} onChange={(e) => setLogForm(prev => ({ ...prev, equipmentUsed: e.target.value }))} className="input-field" /></div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-600"><Camera className="h-4 w-4 text-indigo-600" /> Add site photo<input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} /></label>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setLogModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t.saveLog}
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
