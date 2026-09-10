"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee, Sparkles, Loader2, Plus, Receipt, FileText, CheckCircle2,
  AlertTriangle, Layers, PlusCircle, X, ChevronRight, Check, Ban, CreditCard,
  ShoppingBag, Truck, BarChart3, TrendingUp, AlertCircle, RefreshCw
} from "lucide-react";
import {
  getProjects, getProjectMaterials, createProjectMaterialRate, createProjectPO, logProjectMaterialTransaction
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const MATERIAL_LIST = [
  "Cement",
  "Steel",
  "Sand",
  "Aggregate",
  "Bricks/Blocks",
  "Tiles",
  "Paint",
  "Electrical materials",
  "Plumbing materials"
];

export default function MaterialSourcingPage() {
  const { user } = useAuth();
  const isSmall = user?.builderScale === "SMALL";
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  const [activeTab, setActiveTab] = useState("sourcing"); // "sourcing" or "inventory"

  const [rates, setRates] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendorComparison, setVendorComparison] = useState([]);
  const [preferredVendor, setPreferredVendor] = useState("");
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ lowStockCount: 0, priceHikeCount: 0, delayedCount: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Forms state
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poForm, setPoForm] = useState({
    material: "Cement",
    supplierName: "",
    orderedQty: 100,
    rate: 410,
    eta: ""
  });

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState({ material: "Cement", unit: "bag", currentRate: 0, date: "", supplier: "" });
  const [logForm, setLogForm] = useState({
    material: "Cement",
    type: "Receipt",
    quantity: 50,
    description: ""
  });

  const [saving, setSaving] = useState(false);

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
        setError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Fetch material status
  const refreshMaterials = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const pid = parseInt(selectedProjectId);
      const data = await getProjectMaterials(pid);
      setRates(data.materialRates || []);
      setInventory(data.inventory || []);
      setPurchaseOrders(data.purchaseOrders || []);
      setVendorComparison(data.vendorComparison || []);
      setLogs(data.logs || []);
      setSummary(data.summary || { lowStockCount: 0, priceHikeCount: 0, delayedCount: 0 });
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve material aggregates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      setPreferredVendor(localStorage.getItem(`preferred_vendor_${selectedProjectId}`) || "");
      refreshMaterials();
    }
  }, [selectedProjectId]);

  const handleOpenAddPO = () => {
    const defaultMat = "Cement";
    const rateRef = rates.find(r => r.material === defaultMat) || { rate: 420 };
    setPoForm({
      material: defaultMat,
      supplierName: "",
      orderedQty: 100,
      rate: rateRef.rate,
      eta: new Date(Date.now() + 3*24*60*60*1000).toISOString().split("T")[0] // default 3 days in future
    });
    setPoModalOpen(true);
  };

  const handlePoMaterialChange = (mat) => {
    const rateRef = rates.find(r => r.material === mat) || { rate: 500 };
    setPoForm(prev => ({
      ...prev,
      material: mat,
      rate: rateRef.rate
    }));
  };

  const handleSavePO = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProjectPO(parseInt(selectedProjectId), poForm);
      await refreshMaterials();
      setPoModalOpen(false);
    } catch (err) {
      alert("Error saving Purchase Order: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddLog = () => {
    setLogForm({
      material: "Cement",
      type: "Receipt",
      quantity: 50,
      description: ""
    });
    setLogModalOpen(true);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await logProjectMaterialTransaction(parseInt(selectedProjectId), logForm);
      await refreshMaterials();
      setLogModalOpen(false);
    } catch (err) {
      alert("Error saving log record: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRate = () => {
    const existing = rates.find(rate => rate.material === "Cement");
    setRateForm({ material: "Cement", unit: existing?.unit || "bag", currentRate: existing?.rate || 0, date: new Date().toISOString().split("T")[0], supplier: "" });
    setRateModalOpen(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProjectMaterialRate(parseInt(selectedProjectId), { ...rateForm, currentRate: parseFloat(rateForm.currentRate) });
      await refreshMaterials();
      setRateModalOpen(false);
    } catch (err) {
      alert("Error saving material rate: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-slate-500 text-sm">Loading procurement module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{isSmall ? "Material Rate Tracker" : "Construction Material Sourcing & Inventory"}</h2>
          <p className="text-xs text-slate-500 mt-1">{isSmall ? "Record local rates for cement, steel, sand, aggregate, bricks, and other materials." : "Detailed market rate trackers, purchase orders, receipts, and material consumption sheets"}</p>
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

      {/* Alarm Warning Alerts */}
      <div className="flex flex-wrap gap-4">
        {summary.lowStockCount > 0 && (
          <div className="flex-1 min-w-[220px] p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">Low Stock Alert</h4>
              <p className="mt-0.5">{summary.lowStockCount} materials are below safety margin (&lt; 20% of required).</p>
            </div>
          </div>
        )}
        {summary.priceHikeCount > 0 && (
          <div className="flex-1 min-w-[220px] p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Market Price Increase</h4>
              <p className="mt-0.5">{summary.priceHikeCount} raw materials recorded significant market price hikes (&gt;= 10%).</p>
            </div>
          </div>
        )}
        {summary.delayedCount > 0 && (
          <div className="flex-1 min-w-[220px] p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2.5 text-orange-800 text-xs shadow-sm">
            <Truck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-orange-900">Delayed Deliveries</h4>
              <p className="mt-0.5">{summary.delayedCount} purchase orders are currently delayed past their scheduled ETA.</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("sourcing")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "sourcing" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Market Sourcing & Rates
        </button>
        {!isSmall && <button
          onClick={() => setActiveTab("inventory")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "inventory" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" /> Inventory & PO Tracking
        </button>}
      </div>

      {/* ──── TAB 1: SOURCING & RATES ──── */}
      {activeTab === "sourcing" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Material rates dashboard comparison */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" /> Material Rate Tracker
                </h3>
                <button onClick={handleOpenRate} className="px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Rate</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <th className="py-3 px-6">Material</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Current Rate</th>
                    <th className="py-3 px-4 text-right">Previous Rate</th>
                    <th className="py-3 px-4 text-right">Rate Variance</th>
                    <th className="py-3 px-4 text-right">Change %</th>
                    <th className="py-3 px-6">Source Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="py-3.5 px-6 font-bold text-slate-800">
                        {rate.material} <span className="text-[10px] text-slate-400 font-medium font-mono">({rate.unit})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{rate.location}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">{formatINR(rate.rate)}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">{formatINR(rate.previousRate)}</td>
                      <td className={`py-3.5 px-4 text-right font-bold ${
                        rate.rateChange > 0 ? "text-red-600" : rate.rateChange < 0 ? "text-emerald-600" : "text-slate-500"
                      }`}>
                        {rate.rateChange > 0 ? "+" : ""}
                        {formatINR(rate.rateChange)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black ${
                        rate.rateChangePercent > 0 ? "text-red-600" : rate.rateChangePercent < 0 ? "text-emerald-600" : "text-slate-500"
                      }`}>
                        {rate.rateChangePercent > 0 ? "+" : ""}{rate.rateChangePercent}%
                      </td>
                      <td className="py-3.5 px-6 text-slate-400 font-medium">{rate.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sourcing Vendor matching comparison */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" /> Sourcing Vendor Comparison Sheet
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <th className="py-3 px-6">Vendor Partner</th>
                    <th className="py-3 px-4">Material Specialization</th>
                    <th className="py-3 px-4 text-right">Standard Rate</th>
                    <th className="py-3 px-4 text-center">Availability</th>
                    <th className="py-3 px-4 text-center">Distance</th>
                    <th className="py-3 px-4 text-center">Last Updated</th>
                    <th className="py-3 px-6 text-center">Preferred</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorComparison.map((vendor, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="py-3 px-6 font-bold text-slate-800">{vendor.vendorName}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{vendor.material}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-800">{formatINR(vendor.rate)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                          {vendor.availability}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">{vendor.distance} km</td>
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">{vendor.lastUpdated}</td>
                      <td className="py-3 px-6 text-center"><button onClick={() => { setPreferredVendor(vendor.vendorName); localStorage.setItem(`preferred_vendor_${selectedProjectId}`, vendor.vendorName); }} className={`rounded px-2 py-1 text-[10px] font-bold ${preferredVendor === vendor.vendorName ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-600"}`}>{preferredVendor === vendor.vendorName ? "Selected" : "Select"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──── TAB 2: INVENTORY & PO TRACKING ──── */}
      {!isSmall && activeTab === "inventory" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Inventory status levels grid */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" /> Project Inventory Levels
              </h3>
              <button
                onClick={handleOpenAddLog}
                className="px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-slate-900 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Log Stock Action
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <th className="py-3 px-6">Material</th>
                    <th className="py-3 px-4 text-right">Required Qty</th>
                    <th className="py-3 px-4 text-right">Ordered Qty</th>
                    <th className="py-3 px-4 text-right">Received Qty</th>
                    <th className="py-3 px-4 text-right">Consumed Qty</th>
                    <th className="py-3 px-4 text-right">In-Stock Remaining</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="py-3.5 px-6 font-bold text-slate-800">
                        {inv.material} <span className="text-[10px] text-slate-400 font-medium font-mono">({inv.unit})</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">{inv.requiredQty}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">{inv.orderedQty}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">{inv.receivedQty}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">{inv.consumedQty}</td>
                      <td className={`py-3.5 px-4 text-right font-black text-sm ${
                        inv.lowStockAlert ? "text-red-600" : "text-slate-800"
                      }`}>
                        {inv.remainingQty}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          inv.lowStockAlert ? "bg-red-50 text-red-700 border-red-150" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          {inv.lowStockAlert ? "Low Stock Alert" : "Optimal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Purchase Orders registry */}
            <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" /> Active Purchase Orders
                </h3>
                <button
                  onClick={handleOpenAddPO}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Raise PO
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                      <th className="py-3 px-6">PO Material</th>
                      <th className="py-3 px-4">Supplier Partner</th>
                      <th className="py-3 px-4 text-right">Ordered Qty</th>
                      <th className="py-3 px-4 text-right">PO Total</th>
                      <th className="py-3 px-4 text-center">ETA</th>
                      <th className="py-3 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                        <td className="py-3 px-6 font-bold text-slate-800">{po.material}</td>
                        <td className="py-3 px-4 text-slate-500">{po.supplierName}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600">{po.orderedQty}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-800">{formatINR(po.amount)}</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono">{po.eta}</td>
                        <td className="py-3 px-6 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            po.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            po.delayedProcurementAlert ? "bg-red-50 text-red-700 border-red-150 animate-pulse" :
                            "bg-blue-50 text-blue-700 border-blue-100"
                          }`}>
                            {po.status === "Delivered" ? "Delivered" : po.delayedProcurementAlert ? "Delayed Alert" : "Ordered"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory transaction history logs */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-600" /> Inventory Action Ledger
                </h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No inventory entries logged.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-start text-xs gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{log.material}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            log.type === "Receipt" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-orange-50 text-orange-700 border-orange-100"
                          }`}>
                            {log.type}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">{log.description}</p>
                        <div className="text-[10px] text-slate-400 font-mono">{log.date}</div>
                      </div>
                      <span className={`font-black text-slate-900 ${
                        log.type === "Receipt" ? "text-emerald-700" : "text-orange-700"
                      }`}>
                        {log.type === "Receipt" ? "+" : "-"}{log.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Raise Modal */}
      <AnimatePresence>
        {poModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <ShoppingBag className="w-4.5 h-4.5 text-indigo-400" /> Raise Purchase Order
                </div>
                <button onClick={() => setPoModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePO} className="p-6 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Select Material Type</label>
                    <select
                      value={poForm.material}
                      onChange={(e) => handlePoMaterialChange(e.target.value)}
                      className="input-field bg-slate-50"
                    >
                      {MATERIAL_LIST.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Supplier Partner</label>
                    <input
                      type="text"
                      value={poForm.supplierName}
                      onChange={(e) => setPoForm(prev => ({ ...prev, supplierName: e.target.value }))}
                      className="input-field"
                      placeholder="e.g. UltraTech Traders"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Ordered Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={poForm.orderedQty}
                      onChange={(e) => setPoForm(prev => ({ ...prev, orderedQty: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Agreed Rate (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={poForm.rate}
                      onChange={(e) => setPoForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Scheduled Delivery Date (ETA)</label>
                  <input
                    type="date"
                    value={poForm.eta}
                    onChange={(e) => setPoForm(prev => ({ ...prev, eta: e.target.value }))}
                    className="input-field bg-slate-50"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-between text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold">Agreed PO Payout Amount:</span>
                  <span className="font-black text-slate-800 text-sm">
                    {formatINR(poForm.orderedQty * poForm.rate)}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setPoModalOpen(false)}
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
                    Raise Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Material Log Transaction Modal */}
      <AnimatePresence>
        {logModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <RefreshCw className="w-4.5 h-4.5 text-indigo-400" /> Log Stock Action
                </div>
                <button onClick={() => setLogModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLog} className="p-6 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Select Material</label>
                    <select
                      value={logForm.material}
                      onChange={(e) => setLogForm(prev => ({ ...prev, material: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      {MATERIAL_LIST.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Log Action Type</label>
                    <select
                      value={logForm.type}
                      onChange={(e) => setLogForm(prev => ({ ...prev, type: e.target.value }))}
                      className="input-field bg-slate-50"
                    >
                      <option value="Receipt">Receipt (Stock Inflow)</option>
                      <option value="Consumption">Consumption (Stock Outflow)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={logForm.quantity}
                    onChange={(e) => setLogForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Log Description</label>
                  <input
                    type="text"
                    value={logForm.description}
                    onChange={(e) => setLogForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. Unloaded UltraTech PO delivery at site yard"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
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
                    Save Log Action
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-800">Add Material Rate</h3><button onClick={() => setRateModalOpen(false)}><X className="h-4 w-4 text-slate-500" /></button></div>
              <form onSubmit={handleSaveRate} className="space-y-3 text-xs">
                <select className="input-field" value={rateForm.material} onChange={event => setRateForm({ ...rateForm, material: event.target.value })}>{MATERIAL_LIST.map(material => <option key={material}>{material}</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><input className="input-field" placeholder="Unit" value={rateForm.unit} onChange={event => setRateForm({ ...rateForm, unit: event.target.value })} required /><input className="input-field" type="number" min="0" step="0.01" placeholder="Current rate" value={rateForm.currentRate} onChange={event => setRateForm({ ...rateForm, currentRate: event.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3"><input className="input-field" type="date" value={rateForm.date} onChange={event => setRateForm({ ...rateForm, date: event.target.value })} required /><input className="input-field" placeholder="Supplier" value={rateForm.supplier} onChange={event => setRateForm({ ...rateForm, supplier: event.target.value })} /></div>
                <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setRateModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white">Save Rate</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
