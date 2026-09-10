"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, Calendar, FileText, CheckCircle2, Loader2,
  Clock, AlertCircle, Edit3, X, Save, MessageSquare,
  ShieldCheck, AlertTriangle, Info, Bell, Plus, Link2, ExternalLink
} from "lucide-react";
import {
  getProjects, getProjectMilestones, updateProjectMilestone,
  getProjectComplianceSystem, updateProjectComplianceSystemItem, createComplianceSystemRule
} from "@/lib/api";

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

export default function MilestonesCompliancePage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [activeTab, setActiveTab] = useState("milestones"); // "milestones" or "compliance"

  // Milestones State
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ status: "not_started", remarks: "", date: "" });

  // Compliance System State
  const [complianceData, setComplianceData] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [editingCompItem, setEditingCompItem] = useState(null);
  const [compForm, setCompForm] = useState({
    status: "Pending",
    submissionDate: "",
    documentReference: "",
    remarks: "",
    linkedDocumentUrl: ""
  });

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    jurisdiction: "Mumbai",
    projectType: "Residential",
    applicability: "All residential projects",
    requiredDocument: "",
    dueDateRule: "Before structural works"
  });

  const [saving, setSaving] = useState(false);

  // Load Projects
  useEffect(() => {
    getProjects()
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id.toString());
        }
      })
      .catch(console.error);
  }, []);

  // Load Milestones
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

  // Load Compliance System
  const loadComplianceSystem = async (projId) => {
    setLoadingCompliance(true);
    try {
      const data = await getProjectComplianceSystem(projId);
      setComplianceData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompliance(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId) return;
    const pid = parseInt(selectedProjectId);
    if (activeTab === "milestones") {
      loadMilestones(pid);
    } else {
      loadComplianceSystem(pid);
    }
  }, [selectedProjectId, activeTab]);

  // Edit Milestone handlers
  const startEditMilestone = (m) => {
    setEditingMilestone(m);
    setMilestoneForm({
      status: m.status,
      remarks: m.remarks || "",
      date: m.date || new Date().toISOString().split("T")[0]
    });
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    if (!editingMilestone) return;
    setSaving(true);
    try {
      await updateProjectMilestone(parseInt(selectedProjectId), {
        milestoneId: editingMilestone.id,
        status: milestoneForm.status,
        remarks: milestoneForm.remarks,
        date: milestoneForm.status === "completed" ? milestoneForm.date : null
      });
      setEditingMilestone(null);
      await loadMilestones(parseInt(selectedProjectId));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Edit Compliance Item handlers
  const startEditCompItem = (it) => {
    setEditingCompItem(it);
    setCompForm({
      status: it.status,
      submissionDate: it.submissionDate || "",
      documentReference: it.documentReference || "",
      remarks: it.remarks || "",
      linkedDocumentUrl: it.linkedDocumentUrl || ""
    });
  };

  const handleSaveCompItem = async (e) => {
    e.preventDefault();
    if (!editingCompItem) return;
    setSaving(true);
    try {
      await updateProjectComplianceSystemItem(parseInt(selectedProjectId), editingCompItem.id, compForm);
      setEditingCompItem(null);
      await loadComplianceSystem(parseInt(selectedProjectId));
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Register compliance rule
  const handleSaveRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createComplianceSystemRule(parseInt(selectedProjectId), ruleForm);
      setRuleModalOpen(false);
      await loadComplianceSystem(parseInt(selectedProjectId));
    } catch (err) {
      alert("Error saving rule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Submitted": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Expired": return "bg-rose-50 text-rose-700 border-rose-150 animate-pulse";
      default: return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Milestones & Compliance Tracker</h2>
          <p className="text-xs text-slate-500 mt-1">Submit construction milestone sign-offs or monitor configurable MahaRERA permit items</p>
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
          onClick={() => setActiveTab("milestones")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "milestones" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Flag className="w-4 h-4" /> Project Milestones
        </button>
        <button
          onClick={() => setActiveTab("compliance")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "compliance" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Configurable Compliance Requirements
        </button>
      </div>

      {/* ──── TAB 1: PROJECT MILESTONES ──── */}
      {activeTab === "milestones" && (
        <div className="space-y-6 animate-fadeIn">
          {milestonesLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 text-left">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-indigo-600" /> Milestone Phases Roadmap
              </h3>
              <div className="relative border-l-2 border-slate-100 ml-6 space-y-6">
                {milestones.map((m) => (
                  <div key={m.id} className="relative pl-6 text-xs space-y-2">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-800 text-sm">{m.name}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${statusColors[m.status]}`}>
                        {m.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-slate-500 max-w-xl">{m.remarks || "No phase logs recorded."}</p>
                    {m.date && <div className="text-[10px] text-slate-400 font-mono">Certified Complete: {m.date}</div>}
                    <button
                      onClick={() => startEditMilestone(m)}
                      className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors flex items-center gap-1 mt-1"
                    >
                      <Edit3 className="w-3 h-3" /> Update Phase
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── TAB 2: CONFIGURABLE COMPLIANCE SYSTEM ──── */}
      {activeTab === "compliance" && (
        <div className="space-y-6 animate-fadeIn">
          {loadingCompliance && !complianceData ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Deadline alarms */}
              {complianceData?.notifications?.length > 0 && (
                <div className="space-y-2 text-left">
                  {complianceData.notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-medium shadow-sm ${
                        notif.type === "danger" ? "bg-red-50 text-red-800 border-red-200" : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      <Bell className={`w-4 h-4 shrink-0 ${notif.type === "danger" ? "text-red-600" : "text-amber-600"}`} />
                      <span>{notif.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Aggregated Dashboard Row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Applicable Rules</div>
                  <div className="text-lg font-black text-slate-800 mt-1">{complianceData?.summary?.totalApplicable} Rules</div>
                </div>
                <div className="glass-card p-4 text-center border-l-4 border-l-amber-500">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Due Soon</div>
                  <div className="text-lg font-black text-amber-700 mt-1">{complianceData?.summary?.dueSoon} Items</div>
                </div>
                <div className="glass-card p-4 text-center border-l-4 border-l-red-500">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overdue Items</div>
                  <div className="text-lg font-black text-red-700 mt-1">{complianceData?.summary?.overdue} Overdue</div>
                </div>
                <div className="glass-card p-4 text-center border-l-4 border-l-emerald-500">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed Registry</div>
                  <div className="text-lg font-black text-emerald-700 mt-1">{complianceData?.summary?.completed} Approved</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Linked Certificates</div>
                  <div className="text-lg font-black text-slate-800 mt-1">{complianceData?.summary?.documentsCount} Docs</div>
                </div>
              </div>

              {/* Requirements & Items list */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Compliance Checklists & Certificates
                  </h3>
                  <button
                    onClick={() => setRuleModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Configure Rule
                  </button>
                </div>
                <div className="overflow-x-auto text-left text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                        <th className="py-3 px-6">Requirement Name</th>
                        <th className="py-3 px-4">Required Document</th>
                        <th className="py-3 px-4">Due Date Rule</th>
                        <th className="py-3 px-4 text-center">Target Due Date</th>
                        <th className="py-3 px-4">Notes / Remarks</th>
                        <th className="py-3 px-4 text-center">Link / Reference</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceData?.complianceItems?.map((it) => (
                        <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-slate-800">{it.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{it.jurisdiction} • {it.applicability}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">{it.requiredDocument}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-medium">{it.dueDateRule}</td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{it.dueDate}</td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-[160px] truncate">{it.remarks || "—"}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {it.documentReference && <span className="font-mono font-medium text-slate-500">{it.documentReference}</span>}
                              {it.linkedDocumentUrl && (
                                <a
                                  href={it.linkedDocumentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-bold text-[10px]"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Doc
                                </a>
                              )}
                              {!it.documentReference && !it.linkedDocumentUrl && <span className="text-slate-300">—</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(it.status)}`}>
                              {it.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <button
                              onClick={() => startEditCompItem(it)}
                              className="text-indigo-600 hover:text-indigo-800 font-bold"
                            >
                              Update Document
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Milestone Modal */}
      <AnimatePresence>
        {editingMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <Flag className="w-4.5 h-4.5 text-indigo-400" /> Update Phase: {editingMilestone.name}
                </div>
                <button onClick={() => setEditingMilestone(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMilestone} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Status</label>
                  <select
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input-field bg-slate-50"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="under_review">Submitted (Under Review)</option>
                    <option value="completed">Certified (Completed)</option>
                  </select>
                </div>

                {milestoneForm.status === "completed" && (
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Date Certified</label>
                    <input
                      type="date"
                      value={milestoneForm.date}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, date: e.target.value }))}
                      className="input-field bg-slate-50"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Sign-off Notes / Remarks</label>
                  <textarea
                    rows="3"
                    value={milestoneForm.remarks}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="input-field"
                    placeholder="Enter details about phase completion status..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingMilestone(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Compliance Item status / links modal */}
      <AnimatePresence>
        {editingCompItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" /> Link Document: {editingCompItem.name}
                </div>
                <button onClick={() => setEditingCompItem(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCompItem} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Status</label>
                  <select
                    value={compForm.status}
                    onChange={(e) => setCompForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input-field bg-slate-50"
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Submission Date</label>
                    <input
                      type="date"
                      value={compForm.submissionDate}
                      onChange={(e) => setCompForm(prev => ({ ...prev, submissionDate: e.target.value }))}
                      className="input-field bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Document Reference No</label>
                    <input
                      type="text"
                      value={compForm.documentReference}
                      onChange={(e) => setCompForm(prev => ({ ...prev, documentReference: e.target.value }))}
                      className="input-field"
                      placeholder="e.g. CC/VILLA-2026"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Linked Document PDF Link</label>
                  <input
                    type="url"
                    value={compForm.linkedDocumentUrl}
                    onChange={(e) => setCompForm(prev => ({ ...prev, linkedDocumentUrl: e.target.value }))}
                    className="input-field"
                    placeholder="https://commondatastorage.googleapis.com/..."
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Compliance Notes / Remarks</label>
                  <input
                    type="text"
                    value={compForm.remarks}
                    onChange={(e) => setCompForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="input-field"
                    placeholder="Enter compliance update logs..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingCompItem(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Configure compliance rule modal */}
      <AnimatePresence>
        {ruleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" /> Configure Compliance Rule
                </div>
                <button onClick={() => setRuleModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="p-6 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">State / Jurisdiction</label>
                    <input
                      type="text"
                      value={ruleForm.jurisdiction}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                      className="input-field"
                      placeholder="e.g. Mumbai, All"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Project Type</label>
                    <select
                      value={ruleForm.projectType}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, projectType: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. RERA Registration, Pollution Board clearance"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Rule Applicability Clause</label>
                  <input
                    type="text"
                    value={ruleForm.applicability}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, applicability: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. Area > 500 sqm or units > 8"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Required Document Name</label>
                  <input
                    type="text"
                    value={ruleForm.requiredDocument}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, requiredDocument: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. MahaRERA Registration Certificate"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Due Date Trigger Rule</label>
                  <input
                    type="text"
                    value={ruleForm.dueDateRule}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, dueDateRule: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. Within 30 days of launch, before structure"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setRuleModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Configure Rule
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
