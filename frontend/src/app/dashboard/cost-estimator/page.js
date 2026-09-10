"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee, Sparkles, Loader2, Plus, Edit2, Trash2,
  FileText, TrendingUp, Info, AlertTriangle, Layers,
  Compass, Hammer, Briefcase, Ruler, HelpCircle, X, Search,
  ArrowRight, DollarSign, Activity, FileSpreadsheet, PlusCircle
} from "lucide-react";
import {
  getProjects, getProjectBOQ, createProjectBOQItem,
  updateProjectBOQItem, deleteProjectBOQItem, getPWDRates,
  getProjectCostTracking, createProjectExpense, deleteProjectExpense
} from "@/lib/api";

const CATEGORIES = [
  "Site preparation",
  "Excavation",
  "Foundation",
  "RCC",
  "Brick/block work",
  "Plaster",
  "Flooring",
  "Waterproofing",
  "Plumbing",
  "Electrical",
  "Doors/windows",
  "Painting",
  "Finishing",
  "Other work"
];

const RATE_SOURCES = [
  { value: "Maharashtra PWD Reference Rate", label: "Maharashtra PWD Reference" },
  { value: "Manually entered rate", label: "Manual Entry" },
  { value: "Material rate table", label: "Material Rate Table" },
];

const EXPENSE_TYPES = [
  { value: "Material", label: "Material" },
  { value: "Labour", label: "Labour" },
  { value: "Contractor", label: "Contractor" },
  { value: "Miscellaneous", label: "Miscellaneous" }
];

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function CostEstimator() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  
  const [activeTab, setActiveTab] = useState("boq"); // "boq" or "tracking"
  
  // BOQ Tab States
  const [boqData, setBoqData] = useState({ items: [], categoryGroups: [], summary: {} });
  const [pwdRates, setPWDRates] = useState([]);

  // Cost Tracking Tab States
  const [trackingData, setTrackingData] = useState({ summary: {}, categoryComparisons: [], expenses: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals / Form states
  const [boqModalOpen, setBoqModalOpen] = useState(false);
  const [editingBoqItem, setEditingBoqItem] = useState(null);
  const [boqForm, setBoqForm] = useState({
    category: "Site preparation",
    description: "",
    unit: "sqm",
    quantity: 1,
    rate: 0,
    rateSource: "Maharashtra PWD Reference Rate"
  });

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Site preparation",
    type: "Material",
    amount: 1000,
    description: ""
  });

  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    async function init() {
      try {
        const [projList, rateList] = await Promise.all([getProjects(), getPWDRates()]);
        setProjects(projList);
        setPWDRates(rateList);
        if (projList.length > 0) {
          setSelectedProjectId(projList[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch initial projects data.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch BOQ and tracking details
  const refreshData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const [boq, track] = await Promise.all([
        getProjectBOQ(parseInt(selectedProjectId)),
        getProjectCostTracking(parseInt(selectedProjectId))
      ]);
      setBoqData(boq);
      setTrackingData(track);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve estimation statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      const proj = projects.find(p => p.id === parseInt(selectedProjectId));
      setSelectedProject(proj || null);
      refreshData();
    }
  }, [selectedProjectId, projects]);

  const handleOpenAddBoq = () => {
    setEditingBoqItem(null);
    setBoqForm({
      category: "Site preparation",
      description: "",
      unit: "sqm",
      quantity: 1,
      rate: 0,
      rateSource: "Maharashtra PWD Reference Rate"
    });
    setFormFromPWD("Site preparation");
    setBoqModalOpen(true);
  };

  const handleOpenEditBoq = (item) => {
    setEditingBoqItem(item);
    setBoqForm({
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      rateSource: item.rateSource
    });
    setBoqModalOpen(true);
  };

  const setFormFromPWD = (category) => {
    const rateRef = pwdRates.find(r => r.category.toLowerCase() === category.toLowerCase());
    if (rateRef) {
      setBoqForm(prev => ({
        ...prev,
        category,
        description: rateRef.description,
        unit: rateRef.unit,
        rate: rateRef.rate,
        rateSource: "Maharashtra PWD Reference Rate"
      }));
    }
  };

  const handleBoqCategoryChange = (cat) => {
    setBoqForm(prev => ({ ...prev, category: cat }));
    if (boqForm.rateSource === "Maharashtra PWD Reference Rate") {
      setFormFromPWD(cat);
    }
  };

  const handleSaveBoq = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || isNaN(parseInt(selectedProjectId))) {
      alert("Please select or create a project first before saving BOQ items.");
      return;
    }
    setSaving(true);
    try {
      if (editingBoqItem) {
        await updateProjectBOQItem(parseInt(selectedProjectId), editingBoqItem.id, boqForm);
      } else {
        await createProjectBOQItem(parseInt(selectedProjectId), boqForm);
      }
      await refreshData();
      setBoqModalOpen(false);
    } catch (err) {
      alert("Error saving item: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoq = async (itemId) => {
    if (!confirm("Are you sure you want to delete this BOQ item?")) return;
    try {
      await deleteProjectBOQItem(parseInt(selectedProjectId), itemId);
      await refreshData();
    } catch (err) {
      alert("Error deleting item: " + err.message);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || isNaN(parseInt(selectedProjectId))) {
      alert("Please select or create a project first before adding expense records.");
      return;
    }
    setSaving(true);
    try {
      await createProjectExpense(parseInt(selectedProjectId), expenseForm);
      await refreshData();
      setExpenseModalOpen(false);
    } catch (err) {
      alert("Error adding expense record: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await deleteProjectExpense(parseInt(selectedProjectId), expenseId);
      await refreshData();
    } catch (err) {
      alert("Error deleting expense: " + err.message);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-slate-500 text-sm">Loading estimator module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Builder Construction Cost Manager</h2>
          <p className="text-xs text-slate-500 mt-1">Detailed PWD rate sheet estimation and actual budget variance tracking</p>
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
          onClick={() => setActiveTab("boq")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "boq" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> BOQ Estimator Worksheet
        </button>
        <button
          onClick={() => setActiveTab("tracking")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "tracking" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Activity className="w-4 h-4" /> Estimated vs Actual Cost Tracking
        </button>
      </div>

      {selectedProject && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs flex flex-wrap gap-x-6 gap-y-2 text-slate-600">
          <div><span className="font-semibold text-slate-700">Project Type:</span> {selectedProject.type}</div>
          <div><span className="font-semibold text-slate-700">Area:</span> {selectedProject.area} sq ft</div>
          <div><span className="font-semibold text-slate-700">Floors:</span> {selectedProject.floors} Floors</div>
          <div><span className="font-semibold text-slate-700">Contract Value:</span> {formatINR(selectedProject.budget)}</div>
          <div><span className="font-semibold text-slate-700">Overrun Limit:</span> {selectedProject.overrunThreshold}%</div>
        </div>
      )}

      {/* Overrun alert banner */}
      {trackingData.summary?.alertTriggered && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-900">COST OVERRUN WARNING ALERT</h4>
            <p className="mt-1 leading-relaxed">{trackingData.summary.alertMessage}</p>
          </div>
        </div>
      )}

      {/* ──── TAB 1: BOQ ESTIMATOR WORKSHEET ──── */}
      {activeTab === "boq" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Grand Total</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(boqData.summary?.grandTotal)}</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contingency (5%)</div>
              <div className="text-lg font-black text-amber-600 mt-1">{formatINR(boqData.summary?.contingency)}</div>
            </div>
            <div className="glass-card p-4 text-center border-l-4 border-l-indigo-600">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Cost</div>
              <div className="text-lg font-black text-indigo-700 mt-1">{formatINR(boqData.summary?.finalEstimatedCost)}</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cost / sq. ft.</div>
              <div className="text-lg font-black text-slate-800 mt-1">₹{boqData.summary?.costPerSqFt?.toLocaleString("en-IN") || 0}</div>
            </div>
            <div className="glass-card p-4 text-center border-t-2 border-t-blue-500">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Material Cost</div>
              <div className="text-base font-black text-blue-700 mt-1">{formatINR(boqData.summary?.materialSubtotal)}</div>
            </div>
            <div className="glass-card p-4 text-center border-t-2 border-t-emerald-500">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Labour Cost</div>
              <div className="text-base font-black text-emerald-700 mt-1">{formatINR(boqData.summary?.labourSubtotal)}</div>
            </div>
            <div className="glass-card p-4 text-center border-t-2 border-t-purple-500">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Other Works</div>
              <div className="text-base font-black text-purple-700 mt-1">{formatINR(boqData.summary?.otherSubtotal)}</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" /> Bill of Quantities Sheet
              </h3>
              <button
                onClick={handleOpenAddBoq}
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add BOQ Item
              </button>
            </div>

            {boqData.categoryGroups?.length === 0 ? (
              <div className="p-16 text-center">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No BOQ items created</h4>
                <p className="text-slate-400 text-xs mt-1">Click 'Add BOQ Item' above to start detailing estimations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                      <th className="py-3 px-6">Description</th>
                      <th className="py-3 px-4">Rate Source</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-center">Unit</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boqData.categoryGroups.map((group) => (
                      <React.Fragment key={group.category}>
                        <tr className="bg-indigo-50/40 border-y border-indigo-50">
                          <td colSpan="5" className="py-2.5 px-6 font-bold text-indigo-900 text-xs uppercase">
                            {group.category}
                          </td>
                          <td className="py-2.5 px-4 font-black text-indigo-950 text-right text-xs">
                            Subtotal: {formatINR(group.subtotal)}
                          </td>
                          <td className="py-2.5 px-6"></td>
                        </tr>

                        {group.items.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                            <td className="py-3.5 px-6 max-w-md">
                              <p className="font-medium text-slate-800">{item.description}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                                item.rateSource.includes("PWD") ? "bg-blue-50 text-blue-700 border-blue-100" :
                                item.rateSource.includes("ML") ? "bg-purple-50 text-purple-700 border-purple-100" :
                                "bg-amber-50 text-amber-700 border-amber-100"
                              }`}>
                                {item.rateSource}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-slate-700">{item.quantity}</td>
                            <td className="py-3.5 px-4 text-center text-slate-500 uppercase">{item.unit}</td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-600">{formatINR(item.rate)}</td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-800">{formatINR(item.amount)}</td>
                            <td className="py-3.5 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditBoq(item)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBoq(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──── TAB 2: ESTIMATED VS ACTUAL TRACKING ──── */}
      {activeTab === "tracking" && (
        <div className="space-y-6">
          {/* Tracking Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BOQ Estimate</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(trackingData.summary?.estimatedCost)}</div>
            </div>
            <div className="glass-card p-4 text-center border-l-4 border-l-emerald-500">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Actual Cost</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{formatINR(trackingData.summary?.totalActualCost)}</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contract Budget</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(trackingData.summary?.budget)}</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cost Variance</div>
              <div className={`text-lg font-black mt-1 ${
                (trackingData.summary?.variance || 0) > 0 ? "text-red-600" : "text-emerald-600"
              }`}>
                {(trackingData.summary?.variance || 0) > 0 ? "+" : ""}
                {formatINR(trackingData.summary?.variance)}
              </div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Variance %</div>
              <div className={`text-lg font-black mt-1 ${
                (trackingData.summary?.variance || 0) > 0 ? "text-red-600" : "text-emerald-600"
              }`}>
                {trackingData.summary?.variancePercentage}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Category comparison table */}
            <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" /> Category-Level Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-4 text-right">Estimated</th>
                      <th className="py-3 px-4 text-right">Actual</th>
                      <th className="py-3 px-4 text-right">Variance</th>
                      <th className="py-3 px-6 text-right">Variance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingData.categoryComparisons?.map((catComp) => (
                      <tr key={catComp.category} className="border-b border-slate-100 hover:bg-slate-50/40">
                        <td className="py-3 px-6 font-semibold text-slate-800">{catComp.category}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{formatINR(catComp.estimated)}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">{formatINR(catComp.actual)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          catComp.variance > 0 ? "text-red-600" : "text-emerald-600"
                        }`}>
                          {catComp.variance > 0 ? "+" : ""}
                          {formatINR(catComp.variance)}
                        </td>
                        <td className={`py-3 px-6 text-right font-bold ${
                          catComp.variance > 0 ? "text-red-600" : "text-emerald-600"
                        }`}>
                          {catComp.variancePercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses List & Manual Logger */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-emerald-600" /> Actual Expenses Log
                  </h3>
                  <button
                    onClick={() => setExpenseModalOpen(true)}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Log Expense
                  </button>
                </div>

                <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                  {trackingData.expenses?.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No expense records logged.
                    </div>
                  ) : (
                    trackingData.expenses.map((exp) => (
                      <div key={exp.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-start text-xs gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{exp.category}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[9px] uppercase">
                              {exp.type}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">{exp.description}</p>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {exp.date} • Source: <span className="font-bold text-slate-500">{exp.source}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-slate-900">{formatINR(exp.amount)}</span>
                          {exp.source === "Manual Entry" && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOQ Add/Edit Modal */}
      <AnimatePresence>
        {boqModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  {editingBoqItem ? <Edit2 className="w-4 h-4 text-indigo-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                  {editingBoqItem ? "Edit BOQ Estimate Item" : "Add New BOQ Estimate Item"}
                </div>
                <button onClick={() => setBoqModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBoq} className="p-6 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Work Category</label>
                    <select
                      value={boqForm.category}
                      onChange={(e) => handleBoqCategoryChange(e.target.value)}
                      className="input-field bg-slate-50"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Rate Source Metadata</label>
                    <select
                      value={boqForm.rateSource}
                      onChange={(e) => setBoqForm(prev => ({ ...prev, rateSource: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {RATE_SOURCES.map(source => (
                        <option key={source.value} value={source.value}>{source.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={boqForm.description}
                    onChange={(e) => setBoqForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    placeholder="Enter CPWD schedule descriptions or task items..."
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={boqForm.quantity}
                      onChange={(e) => setBoqForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Unit</label>
                    <input
                      type="text"
                      value={boqForm.unit}
                      onChange={(e) => setBoqForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="input-field"
                      placeholder="cum, sqm, kg, LS"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Unit Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={boqForm.rate}
                      onChange={(e) => setBoqForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold">Estimated Line Subtotal:</span>
                  <span className="font-black text-slate-800 text-sm">
                    {formatINR(boqForm.quantity * boqForm.rate)}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setBoqModalOpen(false)}
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
                    {editingBoqItem ? "Save Changes" : "Create Item"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {expenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-emerald-950 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <PlusCircle className="w-4 h-4 text-emerald-400" /> Log Actual Expense Record
                </div>
                <button onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="p-6 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">BOQ Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Expense Type</label>
                    <select
                      value={expenseForm.type}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, type: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {EXPENSE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Expense Description</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. Paid concrete contractor first RA bill"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpenseModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Log Expense
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
