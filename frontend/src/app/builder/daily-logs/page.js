"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Calendar, Users, Hammer, Sparkles, Loader2,
  AlertTriangle, ShieldCheck, TrendingUp, HelpCircle, LayoutList
} from "lucide-react";
import { getProjects, getProjectLogs, createProjectLog, predictMaterials } from "@/lib/api";

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function DailyLogs() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    workers: 10,
    tasks: "",
    cementBags: 0,
    steelTons: 0,
    bricks: 0
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Material limit analysis
  const [predictedSpecs, setPredictedSpecs] = useState(null);

  useEffect(() => {
    getProjects()
      .then((data) => {
        const active = data.filter((p) => p.status === "in_progress");
        setProjects(active);
        if (active.length > 0) {
          setSelectedProjectId(active[0].id.toString());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    loadLogsAndSpecs(parseInt(selectedProjectId));
  }, [selectedProjectId]);

  const loadLogsAndSpecs = async (projId) => {
    setLogsLoading(true);
    try {
      const proj = projects.find((p) => p.id === projId);
      const [logsData, specsData] = await Promise.all([
        getProjectLogs(projId),
        predictMaterials({
          area: proj ? proj.area : 2000,
          floors: proj ? proj.floors : 2,
          material_quality: 3, // assume standard
          construction_type: proj ? proj.type : "residential",
        })
      ]);
      setLogs(logsData);
      setPredictedSpecs(specsData.materials || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await createProjectLog(parseInt(selectedProjectId), {
        date: form.date,
        workers: parseInt(form.workers),
        tasks: form.tasks,
        cementBags: parseInt(form.cementBags) || 0,
        steelTons: parseFloat(form.steelTons) || 0,
        bricks: parseInt(form.bricks) || 0,
      });
      // reset tasks and material fields
      setForm((f) => ({ ...f, tasks: "", cementBags: 0, steelTons: 0, bricks: 0 }));
      await loadLogsAndSpecs(parseInt(selectedProjectId));
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Calculate totals consumed
  const totalCement = logs.reduce((sum, log) => sum + (log.cementBags || 0), 0);
  const totalSteel = logs.reduce((sum, log) => sum + (log.steelTons || 0), 0);
  const totalBricks = logs.reduce((sum, log) => sum + (log.bricks || 0), 0);

  const selectedProject = projects.find((p) => p.id === parseInt(selectedProjectId));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs text-slate-400">Loading active projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Daily Site Logs</h2>
        <p className="text-sm text-slate-500">
          Track daily structural progress and monitor cement, steel, and brick consumption alerts.
        </p>
      </motion.div>

      {/* Project Selector */}
      <div className="glass-card p-4 flex items-center gap-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Project:</label>
        <select
          className="input-field max-w-[250px] py-1.5"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
          ))}
        </select>
        {selectedProject && (
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Budget: {formatINR(selectedProject.budget)} • Spent: {formatINR(selectedProject.spent)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Daily Entry Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleLogSubmit} className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Enter Daily Report
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Log Date
                </label>
                <input
                  type="date"
                  required
                  className="input-field text-xs text-slate-900 py-1.5"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Worker Count
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input-field text-xs text-slate-900 py-1.5"
                  value={form.workers}
                  onChange={(e) => setForm({ ...form, workers: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tasks Completed Today</label>
              <textarea
                required
                rows={3}
                className="input-field text-xs text-slate-900 py-2 resize-none"
                placeholder="Description of activities, milestones hit today..."
                value={form.tasks}
                onChange={(e) => setForm({ ...form, tasks: e.target.value })}
              />
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="block text-xs font-bold text-slate-600 mb-2">Materials Consumed Today</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Cement (bags)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field text-xs text-slate-900 py-1"
                    value={form.cementBags}
                    onChange={(e) => setForm({ ...form, cementBags: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Steel (tons)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field text-xs text-slate-900 py-1"
                    value={form.steelTons}
                    onChange={(e) => setForm({ ...form, steelTons: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Bricks (units)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field text-xs text-slate-900 py-1"
                    value={form.bricks}
                    onChange={(e) => setForm({ ...form, bricks: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-2.5 rounded-xl gradient-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {submitLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Submit Log</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Smart Alerts & Logs Timeline */}
        <div className="lg:col-span-3 space-y-6">
          {/* Materials Alerts */}
          {predictedSpecs && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Material Consumption Alerts
              </h3>
              <div className="space-y-4 text-xs">
                {/* Cement alert */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Cement bags: {totalCement} / {predictedSpecs["Cement (bags)"]} consumed</span>
                    {totalCement > predictedSpecs["Cement (bags)"] ? (
                      <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Over budget!
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Within limits
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        totalCement > predictedSpecs["Cement (bags)"] ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min((totalCement / predictedSpecs["Cement (bags)"]) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Steel alert */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Steel: {totalSteel.toFixed(2)} / {predictedSpecs["Steel (tons)"]} tons consumed</span>
                    {totalSteel > predictedSpecs["Steel (tons)"] ? (
                      <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Over budget!
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Within limits
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        totalSteel > predictedSpecs["Steel (tons)"] ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min((totalSteel / predictedSpecs["Steel (tons)"]) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Bricks alert */}
                {predictedSpecs["Bricks (units)"] > 0 && (
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-slate-600">Bricks: {totalBricks} / {predictedSpecs["Bricks (units)"]} units consumed</span>
                      {totalBricks > predictedSpecs["Bricks (units)"] ? (
                        <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Over budget!
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Within limits
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          totalBricks > predictedSpecs["Bricks (units)"] ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min((totalBricks / predictedSpecs["Bricks (units)"]) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs Timeline */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-2">
              <LayoutList className="w-4 h-4 text-indigo-600" /> Historical Daily Logs
            </h3>
            {logsLoading ? (
              <div className="flex justify-center items-center py-10 gap-2">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-400">Fetching log history...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No logs entered for this project yet. Submit your first daily report above!
              </div>
            ) : (
              <div className="relative border-l border-indigo-100 pl-4 space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {logs.slice().reverse().map((log) => (
                  <div key={log.id} className="relative text-xs">
                    {/* Circle marker */}
                    <div className="absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white" />
                    
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{log.date}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
                        {log.workers} workers active
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {log.tasks}
                    </p>
                    <div className="flex gap-4 text-[10px] text-slate-400 mt-1.5 pl-1">
                      <span>Cement: {log.cementBags} bags</span>
                      <span>Steel: {log.steelTons} tons</span>
                      <span>Bricks: {log.bricks} units</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
