"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, FileText, CheckCircle2,
  Plus, X, Edit, Info, Calendar, Filter, Loader2, Link2, ExternalLink
} from "lucide-react";
import {
  getProjects, getProjectRiskCompliance, createProjectComplianceDoc, updateProjectComplianceDoc
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const COMPLIANCE_TYPES = ["Regulatory", "Municipal", "Environmental", "Structural", "Fire Safety", "Labor Welfare"];
const STATUS_OPTIONS = ["Pending", "Submitted", "Approved", "Expired"];

export default function RiskCompliancePage() {
  const { user } = useAuth();
  const isSmall = user?.builderScale === "SMALL";
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [activeTab, setActiveTab] = useState("risks"); // "risks" or "compliance"

  const [risks, setRisks] = useState([]);
  const [complianceDocs, setComplianceDocs] = useState([]);
  const [summary, setSummary] = useState({ activeCount: 0, highCount: 0, resolvedCount: 0, compliantCount: 0 });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals / Form State
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    complianceType: "Regulatory",
    documentName: "",
    status: "Pending",
    submissionDate: "",
    dueDate: "",
    documentReference: "",
    remarks: ""
  });

  const [editDoc, setEditDoc] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "Pending",
    submissionDate: "",
    documentReference: "",
    remarks: ""
  });

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

  const refreshData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await getProjectRiskCompliance(parseInt(selectedProjectId));
      setRisks(data.activeRisks || []);
      setComplianceDocs(data.complianceDocs || []);
      setSummary(data.summary || { activeCount: 0, highCount: 0, resolvedCount: 0, compliantCount: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      refreshData();
    }
  }, [selectedProjectId]);

  const handleOpenAddDoc = () => {
    setDocForm({
      complianceType: "Regulatory",
      documentName: "",
      status: "Pending",
      submissionDate: "",
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
      documentReference: "",
      remarks: ""
    });
    setDocModalOpen(true);
  };

  const handleSaveDoc = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProjectComplianceDoc(parseInt(selectedProjectId), docForm);
      await refreshData();
      setDocModalOpen(false);
    } catch (err) {
      alert("Error adding document: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditDoc = (doc) => {
    setEditDoc(doc);
    setEditForm({
      status: doc.status,
      submissionDate: doc.submissionDate || "",
      documentReference: doc.documentReference || "",
      remarks: doc.remarks || ""
    });
  };

  const handleSaveEditDoc = async (e) => {
    e.preventDefault();
    if (!editDoc) return;
    setSaving(true);
    try {
      await updateProjectComplianceDoc(parseInt(selectedProjectId), editDoc.id, editForm);
      await refreshData();
      setEditDoc(null);
    } catch (err) {
      alert("Error updating compliance document: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case "CRITICAL": return "bg-red-100 text-red-800 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Submitted": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Expired": return "bg-rose-50 text-rose-700 border-rose-150";
      default: return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-slate-500 text-sm">Loading risks & compliance engine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Construction Risk Checklist</h2>
          <p className="text-xs text-slate-500 mt-1">Simple rule-based checks for monsoon, labour, materials, approvals, contractors, and site safety</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center border-l-4 border-l-orange-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Risks Detected</div>
          <div className="text-lg font-black text-orange-700 mt-1">{summary.activeCount} Active</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-red-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High / Critical Risks</div>
          <div className="text-lg font-black text-red-700 mt-1">{summary.highCount} Alert</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-emerald-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resolved Site Risks</div>
          <div className="text-lg font-black text-emerald-700 mt-1">{summary.resolvedCount} Closed</div>
        </div>
        {!isSmall && <div className="glass-card p-4 text-center border-l-4 border-l-indigo-500">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approved Certificates</div>
          <div className="text-lg font-black text-indigo-700 mt-1">{summary.compliantCount} Approved</div>
        </div>}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("risks")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "risks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Construction Risk Registry
        </button>
        {!isSmall && <button
          onClick={() => setActiveTab("compliance")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "compliance" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Compliance Document Tracker
        </button>}
      </div>

      {/* ──── TAB 1: RISK REGISTRY ──── */}
      {activeTab === "risks" && (
        <div className="space-y-6 animate-fadeIn">
          {risks.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
              <span className="font-bold text-slate-700">No active risks detected.</span>
              <span>All parameters (weather, materials, crew, cost tracking) are within optimal tolerances.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {risks.map((risk) => (
                <div key={risk.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-sm">{risk.riskType}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getSeverityColor(risk.severity)}`}>
                        {risk.severity}
                      </span>
                    </div>

                    <p className="text-slate-600 leading-relaxed font-medium">{risk.description}</p>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                      <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Trigger Mechanism</div>
                      <p className="text-slate-500 font-mono text-[10px]">{risk.trigger}</p>
                    </div>

                    <div className="bg-amber-50/30 p-3 rounded-lg border border-amber-100/50 space-y-1">
                      <div className="font-bold text-[10px] text-amber-800 uppercase tracking-wider flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Recommended Action
                      </div>
                      <p className="text-amber-900 leading-relaxed">{risk.recommendedAction}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                    <span>Detected: {risk.createdAt}</span>
                    <span className="inline-flex px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold border border-orange-100">
                      {risk.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── TAB 2: COMPLIANCE TRACKER ──── */}
      {!isSmall && activeTab === "compliance" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" /> Certified Documents & Permits
              </h3>
              <button
                onClick={handleOpenAddDoc}
                className="px-3.5 py-2 bg-indigo-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Register Certificate
              </button>
            </div>
            <div className="overflow-x-auto text-left text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <th className="py-3 px-6">Document Name</th>
                    <th className="py-3 px-4">Compliance Type</th>
                    <th className="py-3 px-4">Reference No</th>
                    <th className="py-3 px-4 text-center">Submission Date</th>
                    <th className="py-3 px-4 text-center">Due Date</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="py-3.5 px-6 font-bold text-slate-800">{doc.documentName}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{doc.complianceType}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{doc.documentReference || "—"}</td>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{doc.submissionDate || "—"}</td>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{doc.dueDate}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">{doc.remarks}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleOpenEditDoc(doc)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                          Edit Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Register compliance doc modal */}
      <AnimatePresence>
        {docModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <FileText className="w-4.5 h-4.5 text-indigo-400" /> Register Certified Permit
                </div>
                <button onClick={() => setDocModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="p-6 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Compliance Type</label>
                    <select
                      value={docForm.complianceType}
                      onChange={(e) => setDocForm(prev => ({ ...prev, complianceType: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {COMPLIANCE_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Document Status</label>
                    <select
                      value={docForm.status}
                      onChange={(e) => setDocForm(prev => ({ ...prev, status: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Certificate / Document Name</label>
                  <input
                    type="text"
                    value={docForm.documentName}
                    onChange={(e) => setDocForm(prev => ({ ...prev, documentName: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. MahaRERA Certificate, Fire Safety License..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Submission Date (Optional)</label>
                    <input
                      type="date"
                      value={docForm.submissionDate}
                      onChange={(e) => setDocForm(prev => ({ ...prev, submissionDate: e.target.value }))}
                      className="input-field bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Due Date / Expiry Date</label>
                    <input
                      type="date"
                      value={docForm.dueDate}
                      onChange={(e) => setDocForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="input-field bg-slate-50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Document Reference Number</label>
                  <input
                    type="text"
                    value={docForm.documentReference}
                    onChange={(e) => setDocForm(prev => ({ ...prev, documentReference: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. MahaRERA/P1-MUMBAI/2026"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Remarks</label>
                  <input
                    type="text"
                    value={docForm.remarks}
                    onChange={(e) => setDocForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="input-field"
                    placeholder="Remarks or compliance comments..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setDocModalOpen(false)}
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
                    Register Document
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit compliance doc status modal */}
      <AnimatePresence>
        {editDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <FileText className="w-4.5 h-4.5 text-indigo-400" /> Update Status: {editDoc.documentName}
                </div>
                <button onClick={() => setEditDoc(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditDoc} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input-field bg-slate-50"
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={editForm.submissionDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, submissionDate: e.target.value }))}
                    className="input-field bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Document Reference Number</label>
                  <input
                    type="text"
                    value={editForm.documentReference}
                    onChange={(e) => setEditForm(prev => ({ ...prev, documentReference: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditDoc(null)}
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
