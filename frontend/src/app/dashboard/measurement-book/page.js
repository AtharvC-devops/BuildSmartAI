"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Ruler,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Building2,
  Calculator,
  Lock,
  RefreshCw,
  Info,
  Check,
  X,
  Layers,
  Save,
  ChevronRight
} from "lucide-react";
import {
  getProjects,
  getProjectBOQ,
  getBOQItemMeasurements,
  getProjectMeasurements,
  createProjectMeasurement,
  verifyProjectMeasurement,
  rejectProjectMeasurement
} from "@/lib/api";

function roundDecimal(val, decimals = 4) {
  const num = parseFloat(val);
  if (!isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

const STATUS_BADGE = {
  DRAFT: {
    label: "Draft",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  VERIFIED: {
    label: "Verified",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
    dot: "bg-emerald-500"
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500"
  }
};

export default function MeasurementBookPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [boqItems, setBoqItems] = useState([]);
  const [selectedBoqItemId, setSelectedBoqItemId] = useState("");

  const [measurements, setMeasurements] = useState([]);
  const [boqSummary, setBoqSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [measLoading, setMeasLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Status Filter
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    measurementDate: new Date().toISOString().split("T")[0],
    location: "",
    description: "",
    length: "",
    breadth: "",
    depthOrHeight: "",
    numberOfUnits: "",
    quantity: "",
    remarks: "",
    recordedBy: "Site Engineer"
  });

  // Verification / Rejection Modal State
  const [actionModal, setActionModal] = useState({
    open: false,
    type: null, // "VERIFY" | "REJECT"
    meas: null,
    remarks: "",
    loading: false,
    error: ""
  });

  // Calculate live quantity from form dimensions
  const liveCalculatedQty = useMemo(() => {
    const l = formData.length !== "" ? parseFloat(formData.length) : null;
    const b = formData.breadth !== "" ? parseFloat(formData.breadth) : null;
    const d = formData.depthOrHeight !== "" ? parseFloat(formData.depthOrHeight) : null;
    const n = formData.numberOfUnits !== "" ? parseFloat(formData.numberOfUnits) : null;

    if (l !== null || b !== null || d !== null || n !== null) {
      const len = l !== null ? l : 1;
      const brd = b !== null ? b : 1;
      const dep = d !== null ? d : 1;
      const num = n !== null ? n : 1;
      return roundDecimal(len * brd * dep * num, 4);
    }
    if (formData.quantity !== "") {
      return roundDecimal(formData.quantity, 4);
    }
    return 0;
  }, [formData.length, formData.breadth, formData.depthOrHeight, formData.numberOfUnits, formData.quantity]);

  // Load Projects on Mount
  useEffect(() => {
    getProjects()
      .then((list) => {
        setProjects(list || []);
        if (list?.length) setSelectedProjectId(String(list[0].id));
      })
      .catch(() => setError("Failed to load project list. Please check connection."));
  }, []);

  // Load BOQ items when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError("");
    setBoqItems([]);
    setSelectedBoqItemId("");
    setMeasurements([]);
    setBoqSummary(null);

    getProjectBOQ(Number(selectedProjectId))
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        setBoqItems(list);
        if (list.length > 0) {
          setSelectedBoqItemId(String(list[0].id));
        }
      })
      .catch((err) => setError(err.message || "Failed to load BOQ items for project."))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  // Fetch Measurements for selected BOQ item
  const fetchMeasurements = useCallback(() => {
    if (!selectedProjectId) return;
    const pid = Number(selectedProjectId);
    setMeasLoading(true);

    if (selectedBoqItemId) {
      getBOQItemMeasurements(pid, Number(selectedBoqItemId))
        .then((res) => {
          setMeasurements(res?.measurements || []);
          setBoqSummary(res?.summary || null);
        })
        .catch((err) => setError(err.message || "Failed to load measurements."))
        .finally(() => setMeasLoading(false));
    } else {
      getProjectMeasurements(pid)
        .then((res) => {
          setMeasurements(res || []);
          setBoqSummary(null);
        })
        .catch((err) => setError(err.message || "Failed to load measurements."))
        .finally(() => setMeasLoading(false));
    }
  }, [selectedProjectId, selectedBoqItemId]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  // Find active BOQ item object
  const activeBoqItem = useMemo(() => {
    return boqItems.find((b) => String(b.id) === String(selectedBoqItemId)) || null;
  }, [boqItems, selectedBoqItemId]);

  // Selected Item Progress %
  const progressPercent = useMemo(() => {
    if (!activeBoqItem || !boqSummary) return 0;
    const contract = boqSummary.contractQuantity || activeBoqItem.quantity || 1;
    const executed = boqSummary.executedQuantity || 0;
    return Math.min(100, roundDecimal((executed / contract) * 100, 1));
  }, [activeBoqItem, boqSummary]);

  // Handle Form Input Change
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  // Submit New Measurement Entry
  const handleSubmitMeasurement = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedBoqItemId) {
      setFormError("Please select a valid Project and BOQ item.");
      return;
    }
    if (liveCalculatedQty <= 0) {
      setFormError("Calculated quantity must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        boqItemId: Number(selectedBoqItemId),
        measurementDate: formData.measurementDate,
        description: formData.description || activeBoqItem?.description || "Site Measurement",
        location: formData.location || null,
        length: formData.length !== "" ? parseFloat(formData.length) : null,
        breadth: formData.breadth !== "" ? parseFloat(formData.breadth) : null,
        depthOrHeight: formData.depthOrHeight !== "" ? parseFloat(formData.depthOrHeight) : null,
        numberOfUnits: formData.numberOfUnits !== "" ? parseFloat(formData.numberOfUnits) : null,
        quantity: liveCalculatedQty,
        unit: activeBoqItem?.unit || "cum",
        recordedBy: formData.recordedBy || "Site Engineer",
        remarks: formData.remarks || null,
        status: "DRAFT"
      };

      await createProjectMeasurement(Number(selectedProjectId), payload);
      setSuccessMsg("Measurement recorded successfully in DRAFT status!");
      setShowAddForm(false);
      setFormData({
        measurementDate: new Date().toISOString().split("T")[0],
        location: "",
        description: "",
        length: "",
        breadth: "",
        depthOrHeight: "",
        numberOfUnits: "",
        quantity: "",
        remarks: "",
        recordedBy: "Site Engineer"
      });
      fetchMeasurements();

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      // Custom friendly message for specific backend codes
      if (err.code === "BOQ_EXCEEDED") {
        setFormError("Verification Warning: Entry exceeds BOQ contract quantity limit.");
      } else if (err.code === "UNIT_MISMATCH") {
        setFormError(`Unit Mismatch: Expected '${activeBoqItem?.unit}'.`);
      } else if (err.code === "INVALID_BOQ_RELATIONSHIP") {
        setFormError("Selected BOQ item does not belong to this project.");
      } else {
        setFormError(err.message || "Failed to record measurement.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Verify / Reject Action Confirmation
  const handleConfirmAction = async () => {
    const { type, meas, remarks } = actionModal;
    if (!meas || !selectedProjectId) return;

    setActionModal((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      if (type === "VERIFY") {
        await verifyProjectMeasurement(Number(selectedProjectId), meas.id, remarks);
        setSuccessMsg(`Measurement #${meas.id} verified successfully!`);
      } else {
        await rejectProjectMeasurement(Number(selectedProjectId), meas.id, remarks);
        setSuccessMsg(`Measurement #${meas.id} rejected.`);
      }

      setActionModal({ open: false, type: null, meas: null, remarks: "", loading: false, error: "" });
      fetchMeasurements();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      if (err.code === "BOQ_EXCEEDED") {
        setActionModal((prev) => ({
          ...prev,
          loading: false,
          error: "Verification Blocked: Total executed quantity would exceed BOQ contract limit!"
        }));
      } else {
        setActionModal((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Action failed."
        }));
      }
    }
  };

  // Filtered Measurements
  const filteredMeasurements = useMemo(() => {
    if (statusFilter === "ALL") return measurements;
    return measurements.filter((m) => m.status === statusFilter);
  }, [measurements, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Ruler className="w-4 h-4" />
              <span>Civil Engineering Measurement Book (MB)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Measurement Book
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Record dimension-based site measurements ($L \times B \times D/H \times N$), audit BOQ contract limits, and manage verification workflows.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all shrink-0"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Close Form" : "New Entry"}
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Project & BOQ Selector Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-500" />
            Select Project
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loading}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.clientName || "Client"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-500" />
            Select BOQ Item
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedBoqItemId}
            onChange={(e) => setSelectedBoqItemId(e.target.value)}
            disabled={loading || boqItems.length === 0}
          >
            {boqItems.length === 0 ? (
              <option value="">No BOQ Items Found</option>
            ) : (
              boqItems.map((b) => (
                <option key={b.id} value={b.id}>
                  Item #{b.id} - {b.description} ({b.unit}) - Qty: {b.quantity}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Empty BOQ State Banner */}
      {!loading && selectedProjectId && boqItems.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No BOQ items found for this project.</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Measurement book entries must be linked to a BOQ item. Please create BOQ items for this project in the Cost Estimator module.
            </p>
          </div>
          <Link
            href="/dashboard/cost-estimator"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Create BOQ Item
          </Link>
        </div>
      )}

      {/* Selected BOQ Progress Summary Cards */}
      {activeBoqItem && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                Item #{activeBoqItem.id} • {activeBoqItem.category || "General"}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                {activeBoqItem.description}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contract Unit: <strong className="text-slate-700 uppercase">{activeBoqItem.unit}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchMeasurements}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                title="Refresh Measurements"
              >
                <RefreshCw className={`w-4 h-4 ${measLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500">Contract Quantity</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {boqSummary?.contractQuantity ?? activeBoqItem.quantity}{" "}
                <span className="text-xs font-normal text-slate-500">{activeBoqItem.unit}</span>
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-emerald-700">Executed Qty (Verified)</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">
                {boqSummary?.executedQuantity ?? 0}{" "}
                <span className="text-xs font-normal text-emerald-700">{activeBoqItem.unit}</span>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-700">Remaining Qty</div>
              <div className="text-xl font-bold text-amber-900 mt-1">
                {boqSummary?.remainingQuantity ?? activeBoqItem.quantity}{" "}
                <span className="text-xs font-normal text-amber-700">{activeBoqItem.unit}</span>
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700">Execution Progress</div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {progressPercent}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>Verified Execution Progress</span>
              <span>
                {boqSummary?.executedQuantity || 0} / {boqSummary?.contractQuantity || activeBoqItem.quantity} {activeBoqItem.unit}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent >= 100
                    ? "bg-red-500"
                    : progressPercent >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Record Measurement Form (Expandable) */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitMeasurement}
          className="bg-white border border-blue-200 rounded-2xl p-6 shadow-md space-y-6 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Record New Site Measurement</h3>
                <p className="text-xs text-slate-500">
                  Enter dimensions for live quantity calculation or direct quantity fallback.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Starts as DRAFT
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Measurement Date *
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.measurementDate}
                onChange={(e) => handleInputChange("measurementDate", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location / Grid Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Grid A1-A5, 2nd Floor Slab"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recorded By
              </label>
              <input
                type="text"
                placeholder="e.g. Junior Site Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.recordedBy}
                onChange={(e) => handleInputChange("recordedBy", e.target.value)}
              />
            </div>
          </div>

          {/* Dimensions Section */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Dimension Breakdown</span>
              <span className="text-[11px] font-normal text-slate-500">
                Formula: Length × Breadth × Depth/Height × No. of Units
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Length (L)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.length}
                  onChange={(e) => handleInputChange("length", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Breadth (B)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.breadth}
                  onChange={(e) => handleInputChange("breadth", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Depth / Height (D/H)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.depthOrHeight}
                  onChange={(e) => handleInputChange("depthOrHeight", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. of Units (N)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="1"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.numberOfUnits}
                  onChange={(e) => handleInputChange("numberOfUnits", e.target.value)}
                />
              </div>
            </div>

            {/* Direct Quantity Fallback */}
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Direct Quantity (fallback when dimensions not applicable)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Enter direct quantity"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                />
              </div>

              {/* Live Quantity Display Banner */}
              <div className="bg-blue-900 text-white rounded-xl p-3 flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Live Calculated Quantity</span>
                  <div className="text-lg font-extrabold tracking-tight">
                    {liveCalculatedQty} <span className="text-xs font-normal text-blue-200">{activeBoqItem?.unit || "cum"}</span>
                  </div>
                </div>
                <Calculator className="w-5 h-5 text-blue-300 opacity-80" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Remarks</label>
            <input
              type="text"
              placeholder="Additional notes, quality check remarks..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Measurement Entry
            </button>
          </div>
        </form>
      )}

      {/* Measurement History Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-base">Site Measurement History</h3>
            <span className="text-xs text-slate-500 font-normal">
              ({filteredMeasurements.length} entries)
            </span>
          </div>

          {/* Status Filter Badges */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {["ALL", "DRAFT", "VERIFIED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {measLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Loading measurement book records...</p>
          </div>
        ) : filteredMeasurements.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
            <Ruler className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-slate-700 font-semibold text-sm">No measurements recorded yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click "New Entry" above to add dimension-based measurements for this BOQ item.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Location / Grid</th>
                  <th className="py-3 px-4">Dimensions Breakdown</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeasurements.map((m) => {
                  const badge = STATUS_BADGE[m.status] || STATUS_BADGE.DRAFT;

                  const hasDim =
                    m.length !== null ||
                    m.breadth !== null ||
                    m.depthOrHeight !== null ||
                    m.numberOfUnits !== null;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {m.measurementDate}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-900">{m.location || "Site"}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{m.description}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {hasDim ? (
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                            {m.length || 1} × {m.breadth || 1} × {m.depthOrHeight || 1} (N={m.numberOfUnits || 1})
                          </span>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">Direct Entry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {m.quantity}{" "}
                        <span className="text-[11px] font-normal text-slate-500 uppercase">{m.unit}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {m.recordedBy || "Site Engineer"}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                        {m.remarks || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {m.status === "VERIFIED" ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                            title="Verified measurements are immutable and protected against direct edits"
                          >
                            <Lock className="w-3 h-3 text-emerald-600" /> Locked
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() =>
                                setActionModal({
                                  open: true,
                                  type: "VERIFY",
                                  meas: m,
                                  remarks: "",
                                  loading: false,
                                  error: ""
                                })
                              }
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1"
                              title="Verify measurement"
                            >
                              <Check className="w-3 h-3" /> Verify
                            </button>

                            <button
                              onClick={() =>
                                setActionModal({
                                  open: true,
                                  type: "REJECT",
                                  meas: m,
                                  remarks: "",
                                  loading: false,
                                  error: ""
                                })
                              }
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1"
                              title="Reject measurement"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification / Rejection Confirmation Modal */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                {actionModal.type === "VERIFY" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Verify Site Measurement
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    Reject Site Measurement
                  </>
                )}
              </h3>
              <button
                onClick={() => setActionModal({ open: false, type: null, meas: null, remarks: "", loading: false, error: "" })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{actionModal.error}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div>
                <strong>Location:</strong> {actionModal.meas?.location || "Site"}
              </div>
              <div>
                <strong>Quantity:</strong> {actionModal.meas?.quantity} {actionModal.meas?.unit}
              </div>
              <div>
                <strong>Date:</strong> {actionModal.meas?.measurementDate}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {actionModal.type === "VERIFY" ? "Verification Remarks" : "Rejection Reason *"}
              </label>
              <textarea
                rows={3}
                placeholder={
                  actionModal.type === "VERIFY"
                    ? "e.g. Checked and verified on site"
                    : "e.g. Dimensions incorrect, re-measure required"
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={actionModal.remarks}
                onChange={(e) => setActionModal((prev) => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActionModal({ open: false, type: null, meas: null, remarks: "", loading: false, error: "" })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionModal.loading || (actionModal.type === "REJECT" && !actionModal.remarks.trim())}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-md flex items-center gap-2 ${
                  actionModal.type === "VERIFY"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                } disabled:opacity-50`}
              >
                {actionModal.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm {actionModal.type === "VERIFY" ? "Verification" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIcon(props) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
