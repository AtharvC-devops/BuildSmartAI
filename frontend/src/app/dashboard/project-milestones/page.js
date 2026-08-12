"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, Calendar, FileText, CheckCircle2, Loader2,
  Clock, AlertCircle, Edit3, X, Save, MessageSquare
} from "lucide-react";
import { getProjects, getProjectMilestones, updateProjectMilestone } from "@/lib/api";

const statusIcons = {
  completed: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  in_progress: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
  under_review: <MessageSquare className="w-5 h-5 text-amber-500" />,
  not_started: <Clock className="w-5 h-5 text-slate-300" />,
};

const statusColors = {
  completed: "border-emerald-200 bg-emerald-50/20 text-emerald-700",
  in_progress: "border-blue-200 bg-blue-50/20 text-blue-700",
  under_review: "border-amber-200 bg-amber-50/20 text-amber-700 animate-pulse",
  not_started: "border-slate-100 bg-slate-50/50 text-slate-400",
};

export default function ProjectMilestones() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  // Editing state
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editForm, setEditForm] = useState({ status: "not_started", remarks: "", date: "" });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    getProjects()
      .then((data) => {
        const active = data.filter((p) => p.status === "in_progress" || p.status === "planning" || p.status === "on_hold");
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
    loadMilestones(parseInt(selectedProjectId));
  }, [selectedProjectId]);

  const loadMilestones = async (projId) => {
    setMilestonesLoading(true);
    try {
      const data = await getProjectMilestones(projId);
      setMilestones(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMilestonesLoading(false);
    }
  };

  const startEdit = (m) => {
    setEditingMilestone(m);
    setEditForm({
      status: m.status,
      remarks: m.remarks || "",
      date: m.date || new Date().toISOString().split("T")[0]
    });
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    if (!editingMilestone) return;
    setSaveLoading(true);
    try {
      await updateProjectMilestone(parseInt(selectedProjectId), {
        milestoneId: editingMilestone.id,
        status: editForm.status,
        remarks: editForm.remarks,
        date: editForm.status === "completed" ? editForm.date : null
      });
      setEditingMilestone(null);
      await loadMilestones(parseInt(selectedProjectId));
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs text-slate-400">Loading active projects...</span>
      </div>
    );
  }

  const activeProject = projects.find((p) => p.id === parseInt(selectedProjectId));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Project Milestone Manager</h2>
        <p className="text-sm text-slate-500">
          Monitor construction milestones and submit completed phases for customer approval sign-off.
        </p>
      </motion.div>

      {/* Selector */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
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
        </div>
        {activeProject && (
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <span>Overall Progress:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeProject.progress}%` }} />
              </div>
              <span>{activeProject.progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timeline Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
              <Flag className="w-4 h-4 text-indigo-600" /> Milestone Execution Track
            </h3>

            {milestonesLoading ? (
              <div className="flex justify-center items-center py-20 gap-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-400">Loading milestones...</span>
              </div>
            ) : milestones.length === 0 ? (
              <div className="text-slate-400 text-xs py-10 text-center">
                No milestones setup for this project.
              </div>
            ) : (
              <div className="relative pl-6 border-l border-slate-100 space-y-6">
                {milestones.map((m) => {
                  const isActive = editingMilestone && editingMilestone.id === m.id;
                  return (
                    <div key={m.id} className="relative text-xs">
                      {/* Left icon badge */}
                      <div className="absolute -left-[35px] top-0 w-7 h-7 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center">
                        {statusIcons[m.status]}
                      </div>

                      {/* Milestone content */}
                      <div
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50/10 shadow-sm"
                            : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{m.name}</h4>
                            {m.date && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                                <Calendar className="w-3.5 h-3.5" /> Handled Date: {m.date}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${statusColors[m.status]}`}>
                              {m.status.replace(/_/g, " ")}
                            </span>
                            <button
                              onClick={() => startEdit(m)}
                              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Update milestone"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {m.remarks && (
                          <div className="mt-2 text-slate-500 bg-slate-50/60 p-2 rounded-lg border border-slate-100 leading-relaxed text-[11px]">
                            {m.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {editingMilestone ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="glass-card p-6 space-y-4 border-l-4 border-indigo-500"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Update Milestone Specs
                  </h3>
                  <button
                    onClick={() => setEditingMilestone(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-slate-400">Current Milestone:</span>
                  <div className="font-bold text-slate-800 text-sm">{editingMilestone.name}</div>
                </div>

                <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs text-slate-600">
                  <div>
                    <label className="block font-semibold mb-1.5">Execution Stage Status</label>
                    <select
                      className="input-field text-slate-800"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="under_review">Under Review (Ask Client Approval)</option>
                      <option value="completed">Completed Phase</option>
                    </select>
                  </div>

                  {editForm.status === "completed" && (
                    <div>
                      <label className="block font-semibold mb-1.5">Completion Date</label>
                      <input
                        type="date"
                        required
                        className="input-field text-slate-800"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold mb-1.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Progress Remarks / Notes
                    </label>
                    <textarea
                      rows={4}
                      className="input-field text-slate-800 py-2 resize-none"
                      placeholder="Add structural notes, concrete test reports, or electrical compliance details..."
                      value={editForm.remarks}
                      onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="w-full py-2.5 rounded-xl gradient-primary text-white font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity disabled:opacity-50"
                  >
                    {saveLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving changes...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Save Milestone Specs</>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Edit3 className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Configure Stage Details</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Click the edit pencil icon on any timeline milestone to log site remarks, check completion date, or request customer sign-off approvals.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
