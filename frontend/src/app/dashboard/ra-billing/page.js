"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2, Plus, Receipt, FileText, CheckCircle2, AlertTriangle,
  X, Check, Ban, CreditCard, ChevronDown, ChevronUp, Download,
  Ruler, ClipboardList, ArrowRight
} from "lucide-react";
import {
  getProjects, getProjectBOQ, getProjectContractors,
  getProjectContracts, getProjectRABills, getProjectRABill,
  createProjectRABill, updateProjectRABillStatus,
  downloadProjectRABillExcel,
  getProjectMeasurements, createProjectMeasurement, updateProjectMeasurementStatus
} from "@/lib/api";

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     color: "bg-slate-100 text-slate-700", badge: "slate" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700",   badge: "blue" },
  verified:  { label: "Verified",  color: "bg-indigo-100 text-indigo-700", badge: "indigo" },
  certified: { label: "Certified", color: "bg-emerald-100 text-emerald-700", badge: "emerald" },
  paid:      { label: "Paid",      color: "bg-green-100 text-green-800", badge: "green" },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-700",    badge: "red" },
};
const MEAS_STATUS = {
  draft:    "bg-slate-100 text-slate-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700"
};

export default function RABillingPage() {
  const [tab, setTab] = useState("bills"); // "bills" | "measurements"
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [contractors, setContractors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Bills
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedBill, setSelectedBill] = useState(null);
  const [billAbstract, setBillAbstract] = useState([]);
  const [billLoading, setBillLoading] = useState(false);

  // Measurements
  const [measurements, setMeasurements] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [measLoading, setMeasLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedBillId, setExpandedBillId] = useState(null);

  // Create bill modal
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [createBillForm, setCreateBillForm] = useState({
    contractId: "", contractorId: "",
    billingPeriodStart: "", billingPeriodEnd: "", billDate: "",
    agreementNumber: "", workDescription: "",
    gstRate: 0, retentionRate: 0, otherDeductions: 0,
    selectedMeasIds: []
  });
  const [creating, setCreating] = useState(false);

  // Add measurement modal
  const [showAddMeas, setShowAddMeas] = useState(false);
  const [measForm, setMeasForm] = useState({
    boqItemId: "", measurementDate: new Date().toISOString().split("T")[0],
    description: "", quantity: "", unit: "", recordedBy: ""
  });
  const [addingMeas, setAddingMeas] = useState(false);

  // Load projects on mount
  useEffect(() => {
    getProjects().then(list => {
      setProjects(list || []);
      if (list?.length) setSelectedProjectId(String(list[0].id));
    }).catch(() => setError("Failed to load projects."));
  }, []);

  // Load project-specific data when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    const pid = Number(selectedProjectId);
    setLoading(true);
    setError("");
    Promise.all([
      getProjectRABills(pid),
      getProjectContractors(pid),
      getProjectContracts(pid),
      getProjectBOQ(pid)
    ]).then(([billData, ctors, cts, boq]) => {
      setBills(billData?.bills || []);
      setSummary(billData?.summary || {});
      setContractors(ctors?.contractors || ctors || []);
      setContracts(cts?.contracts || cts || []);
      setBoqItems(boq?.items || boq || []);
      setSelectedBill(null);
      setBillAbstract([]);
    }).catch(e => setError(e.message || "Failed to load project data."))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  // Load measurements when measurements tab is opened
  const loadMeasurements = useCallback(async () => {
    if (!selectedProjectId) return;
    setMeasLoading(true);
    try {
      const data = await getProjectMeasurements(Number(selectedProjectId));
      setMeasurements(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load measurements.");
    } finally {
      setMeasLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (tab === "measurements") loadMeasurements();
  }, [tab, loadMeasurements]);

  const loadBillDetail = async (bill) => {
    setSelectedBill(bill);
    setBillAbstract([]);
    setBillLoading(true);
    try {
      const data = await getProjectRABill(Number(selectedProjectId), bill.id);
      setBillAbstract(data?.abstract || []);
    } catch (e) {
      setError("Failed to load bill details.");
    } finally {
      setBillLoading(false);
    }
  };

  const handleStatusTransition = async (bill, newStatus) => {
    if (!confirm(`Move bill ${bill.bill_number} to ${newStatus.toUpperCase()}?`)) return;
    try {
      await updateProjectRABillStatus(Number(selectedProjectId), bill.id, newStatus);
      // Reload
      const billData = await getProjectRABills(Number(selectedProjectId));
      setBills(billData?.bills || []);
      setSummary(billData?.summary || {});
      if (selectedBill?.id === bill.id) {
        const updated = (billData?.bills || []).find(b => b.id === bill.id);
        if (updated) setSelectedBill(updated);
      }
    } catch (e) {
      setError(e.message || "Status transition failed.");
    }
  };

  const handleExcelDownload = async (bill) => {
    try {
      const blob = await downloadProjectRABillExcel(Number(selectedProjectId), bill.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RA_Bill_${String(bill.bill_sequence || 1).padStart(2,"0")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Excel download failed.");
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!createBillForm.contractId || !createBillForm.contractorId) {
      setError("Please select a contract and contractor.");
      return;
    }
    if (createBillForm.selectedMeasIds.length === 0) {
      setError("Select at least one verified measurement.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await createProjectRABill(Number(selectedProjectId), {
        contractId: Number(createBillForm.contractId),
        contractorId: Number(createBillForm.contractorId),
        billingPeriodStart: createBillForm.billingPeriodStart,
        billingPeriodEnd: createBillForm.billingPeriodEnd,
        billDate: createBillForm.billDate,
        agreementNumber: createBillForm.agreementNumber,
        workDescription: createBillForm.workDescription,
        gstRate: Number(createBillForm.gstRate),
        retentionRate: Number(createBillForm.retentionRate),
        otherDeductions: Number(createBillForm.otherDeductions),
        measurementIds: createBillForm.selectedMeasIds
      });
      setShowCreateBill(false);
      setCreateBillForm({ contractId: "", contractorId: "", billingPeriodStart: "", billingPeriodEnd: "", billDate: "", agreementNumber: "", workDescription: "", gstRate: 0, retentionRate: 0, otherDeductions: 0, selectedMeasIds: [] });
      const billData = await getProjectRABills(Number(selectedProjectId));
      setBills(billData?.bills || []);
      setSummary(billData?.summary || {});
    } catch (e) {
      setError(e.message || "Failed to create RA bill.");
    } finally {
      setCreating(false);
    }
  };

  const handleAddMeasurement = async (e) => {
    e.preventDefault();
    if (!measForm.boqItemId || !measForm.quantity) {
      setError("BOQ item and quantity are required.");
      return;
    }
    setAddingMeas(true);
    setError("");
    try {
      await createProjectMeasurement(Number(selectedProjectId), measForm);
      setShowAddMeas(false);
      setMeasForm({ boqItemId: "", measurementDate: new Date().toISOString().split("T")[0], description: "", quantity: "", unit: "", recordedBy: "" });
      await loadMeasurements();
    } catch (e) {
      setError(e.message || "Failed to add measurement.");
    } finally {
      setAddingMeas(false);
    }
  };

  const handleMeasStatus = async (meas, status) => {
    try {
      await updateProjectMeasurementStatus(Number(selectedProjectId), meas.id, status);
      await loadMeasurements();
    } catch (e) {
      setError(e.message || "Failed to update measurement.");
    }
  };

  const project = projects.find(p => String(p.id) === selectedProjectId);
  const verifiedUnbilled = measurements.filter(m => m.status === "verified" && !m.is_billed);

  const nextActions = (status) => {
    const transitions = {
      draft:     ["submitted"],
      submitted: ["verified", "rejected"],
      verified:  ["certified", "rejected"],
      certified: ["paid"],
      rejected:  ["draft"],
      paid: []
    };
    return transitions[String(status).toLowerCase()] || [];
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <header className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">RA Billing Module</p>
            <h2 className="mt-1 text-2xl font-bold">Contractor Running Account Bills</h2>
            <p className="mt-1 text-sm text-slate-300">BOQ → Verified Measurements → RA Bills → Certification → Payment</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Total Bills",       value: summary.totalBills || 0 },
          { label: "Draft",             value: summary.draft || 0 },
          { label: "Submitted",         value: summary.submitted || 0 },
          { label: "Certified",         value: summary.certified || 0 },
          { label: "Paid",              value: summary.paid || 0 },
          { label: "Outstanding",       value: formatINR(summary.outstandingAmount) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "bills", label: "RA Bills", icon: Receipt },
          { key: "measurements", label: "Site Measurements", icon: Ruler }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── RA BILLS TAB ───────────────────────────────────────────────────── */}
      {tab === "bills" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">RA Bills for {project?.name || "Project"}</h3>
            <button
              onClick={() => setShowCreateBill(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" /> Create RA Bill
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>
          ) : bills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-600">No RA Bills yet</p>
              <p className="mt-1 text-sm text-slate-400">Record and verify site measurements first, then create your first RA bill.</p>
              <button onClick={() => setTab("measurements")} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
                Go to Site Measurements <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map(bill => {
                const statusCfg = STATUS_CONFIG[String(bill.status).toLowerCase()] || STATUS_CONFIG.draft;
                const actions = nextActions(bill.status);
                const isExpanded = expandedBillId === bill.id;

                return (
                  <div key={bill.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* Bill Row Summary */}
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                          <Receipt className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{bill.bill_number}</p>
                          <p className="text-xs text-slate-500">{bill.contractor_name || "Contractor"} · {bill.billing_period_start} – {bill.billing_period_end}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCfg.color}`}>{statusCfg.label}</span>
                        <span className="text-sm font-black text-slate-900">{formatINR(bill.net_payable)}</span>

                        {/* Status action buttons */}
                        {actions.includes("submitted") && (
                          <button onClick={() => handleStatusTransition(bill, "submitted")} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700">Submit</button>
                        )}
                        {actions.includes("verified") && (
                          <button onClick={() => handleStatusTransition(bill, "verified")} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">Verify</button>
                        )}
                        {actions.includes("certified") && (
                          <button onClick={() => handleStatusTransition(bill, "certified")} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700">Certify</button>
                        )}
                        {actions.includes("paid") && (
                          <button onClick={() => handleStatusTransition(bill, "paid")} className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-green-700">Mark Paid</button>
                        )}
                        {actions.includes("rejected") && (
                          <button onClick={() => handleStatusTransition(bill, "rejected")} className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-200">Reject</button>
                        )}
                        {actions.includes("draft") && (
                          <button onClick={() => handleStatusTransition(bill, "draft")} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200">Reopen</button>
                        )}

                        <button
                          onClick={() => handleExcelDownload(bill)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Download className="h-3 w-3" /> Excel
                        </button>
                        <button
                          onClick={async () => {
                            if (isExpanded) {
                              setExpandedBillId(null);
                            } else {
                              setExpandedBillId(bill.id);
                              await loadBillDetail(bill);
                            }
                          }}
                          className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Abstract */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4">
                        {billLoading && selectedBill?.id === bill.id ? (
                          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                        ) : (
                          <>
                            <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">RA Abstract (BOQ × Measurements)</h4>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-800 text-white">
                                    <th className="p-2 text-left">Description</th>
                                    <th className="p-2 text-center">Unit</th>
                                    <th className="p-2 text-right">Rate</th>
                                    <th className="p-2 text-right">Contract Qty</th>
                                    <th className="p-2 text-right bg-slate-700">Prev Qty</th>
                                    <th className="p-2 text-right bg-slate-700">Prev Amt</th>
                                    <th className="p-2 text-right bg-blue-900">This Bill Qty</th>
                                    <th className="p-2 text-right bg-blue-900">This Bill Amt</th>
                                    <th className="p-2 text-right bg-emerald-900">Total Qty</th>
                                    <th className="p-2 text-right bg-emerald-900">Total Amt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {billAbstract.map((item, idx) => (
                                    <tr key={item.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                      <td className="p-2 font-medium text-slate-800">{item.description}</td>
                                      <td className="p-2 text-center text-slate-600">{item.unit}</td>
                                      <td className="p-2 text-right text-slate-700">{formatINR(item.rate)}</td>
                                      <td className="p-2 text-right text-slate-600">{Number(item.contractQty || 0).toFixed(3)}</td>
                                      <td className="p-2 text-right text-slate-600 bg-slate-50">{Number(item.previousQty || 0).toFixed(3)}</td>
                                      <td className="p-2 text-right text-slate-700 bg-slate-50">{formatINR(item.previousAmount)}</td>
                                      <td className="p-2 text-right font-semibold text-blue-700 bg-blue-50">{Number(item.thisBillQty || 0).toFixed(3)}</td>
                                      <td className="p-2 text-right font-semibold text-blue-700 bg-blue-50">{formatINR(item.thisBillAmount)}</td>
                                      <td className="p-2 text-right font-bold text-emerald-700 bg-emerald-50">{Number(item.totalQty || 0).toFixed(3)}</td>
                                      <td className="p-2 text-right font-bold text-emerald-700 bg-emerald-50">{formatINR(item.totalAmount)}</td>
                                    </tr>
                                  ))}
                                  {billAbstract.length === 0 && (
                                    <tr><td colSpan={10} className="py-4 text-center text-slate-400">No items in this bill</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Summary */}
                            <div className="mt-4 ml-auto max-w-xs space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{formatINR(bill.subtotal || bill.gross_amount)}</strong></div>
                              {Number(bill.gst_rate) > 0 && <div className="flex justify-between"><span className="text-slate-500">GST @ {bill.gst_rate}%</span><strong>{formatINR(bill.gst_amount)}</strong></div>}
                              {Number(bill.retention_percent) > 0 && <div className="flex justify-between"><span className="text-slate-500">Retention @ {bill.retention_percent}%</span><strong className="text-red-600">({formatINR(bill.retention_amount)})</strong></div>}
                              {Number(bill.other_deductions) > 0 && <div className="flex justify-between"><span className="text-slate-500">Other Deductions</span><strong className="text-red-600">({formatINR(bill.other_deductions)})</strong></div>}
                              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-800">Net Payable</span><strong className="text-emerald-700">{formatINR(bill.net_payable)}</strong></div>
                            </div>

                            {/* Certification Track */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {["draft","submitted","verified","certified","paid"].map((s, i) => {
                                const cur = String(bill.status).toLowerCase();
                                const statuses = ["draft","submitted","verified","certified","paid"];
                                const curIdx = statuses.indexOf(cur);
                                const done = i <= curIdx && cur !== "rejected";
                                return (
                                  <div key={s} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                    {done ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-slate-300 inline-block" />}
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MEASUREMENTS TAB ──────────────────────────────────────────────── */}
      {tab === "measurements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Site Measurements — {project?.name || "Project"}</h3>
            <div className="flex gap-2">
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {verifiedUnbilled.length} verified, unbilled
              </span>
              <button
                onClick={() => setShowAddMeas(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" /> Record Measurement
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <strong>Workflow:</strong> Record measurement → Verify it (status: VERIFIED) → Select in RA Bill creation → System computes Previous + This Bill quantities automatically.
          </div>

          {measLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>
          ) : measurements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Ruler className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-600">No measurements yet</p>
              <p className="mt-1 text-sm text-slate-400">Record site measurements against BOQ items and verify them before creating an RA bill.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">BOQ Item</th>
                    <th className="p-3 text-left">Description/Location</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Billed</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {measurements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-700">{m.measurement_date}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 line-clamp-1">{m.boq_description}</div>
                        <div className="text-xs text-slate-400">{m.boq_category}</div>
                      </td>
                      <td className="p-3 text-slate-600">{m.description || "—"}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{Number(m.quantity).toFixed(3)}</td>
                      <td className="p-3 text-center text-slate-600">{m.unit}</td>
                      <td className="p-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${MEAS_STATUS[m.status] || "bg-slate-100 text-slate-700"}`}>
                          {m.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {m.is_billed ? (
                          <span className="text-xs font-bold text-emerald-600">✓ Billed</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {m.status === "draft" && !m.is_billed && (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleMeasStatus(m, "verified")} title="Verify" className="rounded p-1 text-emerald-600 hover:bg-emerald-50">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleMeasStatus(m, "rejected")} title="Reject" className="rounded p-1 text-red-500 hover:bg-red-50">
                              <Ban className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE RA BILL MODAL ──────────────────────────────────────────── */}
      {showCreateBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create RA Bill from Verified Measurements</h3>
              <button onClick={() => setShowCreateBill(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Contract</label>
                  <select value={createBillForm.contractId} onChange={e => setCreateBillForm(f => ({...f, contractId: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" required>
                    <option value="">— Select Contract —</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} ({c.contractor_name || ""})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Contractor</label>
                  <select value={createBillForm.contractorId} onChange={e => setCreateBillForm(f => ({...f, contractorId: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" required>
                    <option value="">— Select Contractor —</option>
                    {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Bill Date</label>
                  <input type="date" value={createBillForm.billDate} onChange={e => setCreateBillForm(f => ({...f, billDate: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Agreement No.</label>
                  <input type="text" value={createBillForm.agreementNumber} onChange={e => setCreateBillForm(f => ({...f, agreementNumber: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="AGR-001" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Period Start</label>
                  <input type="date" value={createBillForm.billingPeriodStart} onChange={e => setCreateBillForm(f => ({...f, billingPeriodStart: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Period End</label>
                  <input type="date" value={createBillForm.billingPeriodEnd} onChange={e => setCreateBillForm(f => ({...f, billingPeriodEnd: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">GST Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={createBillForm.gstRate} onChange={e => setCreateBillForm(f => ({...f, gstRate: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Retention Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={createBillForm.retentionRate} onChange={e => setCreateBillForm(f => ({...f, retentionRate: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Other Deductions (₹ flat)</label>
                  <input type="number" min="0" value={createBillForm.otherDeductions} onChange={e => setCreateBillForm(f => ({...f, otherDeductions: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                </div>
              </div>

              {/* Verified Measurements Selection */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Select Verified (Unbilled) Measurements — {verifiedUnbilled.length} available
                </label>
                {verifiedUnbilled.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    No verified unbilled measurements. Go to Site Measurements tab to record and verify measurements first.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                    {verifiedUnbilled.map(m => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 hover:bg-slate-50 last:border-0">
                        <input
                          type="checkbox"
                          checked={createBillForm.selectedMeasIds.includes(m.id)}
                          onChange={e => setCreateBillForm(f => ({
                            ...f,
                            selectedMeasIds: e.target.checked
                              ? [...f.selectedMeasIds, m.id]
                              : f.selectedMeasIds.filter(id => id !== m.id)
                          }))}
                        />
                        <div className="flex-1 text-xs">
                          <div className="font-medium text-slate-800">{m.boq_description}</div>
                          <div className="text-slate-500">{m.measurement_date} · {Number(m.quantity).toFixed(3)} {m.unit} {m.description ? `· ${m.description}` : ""}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowCreateBill(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating || createBillForm.selectedMeasIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow hover:bg-slate-700 disabled:opacity-50">
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : "Create RA Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MEASUREMENT MODAL ─────────────────────────────────────────── */}
      {showAddMeas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Site Measurement</h3>
              <button onClick={() => setShowAddMeas(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleAddMeasurement} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">BOQ Item</label>
                <select value={measForm.boqItemId} onChange={e => { const item = boqItems.find(b => String(b.id) === e.target.value); setMeasForm(f => ({...f, boqItemId: e.target.value, unit: item?.unit || ""})); }} className="w-full rounded-lg border border-slate-200 p-2 text-sm" required>
                  <option value="">— Select BOQ Item —</option>
                  {boqItems.map(b => <option key={b.id} value={b.id}>{b.description} ({b.unit}) — {Number(b.quantity).toFixed(2)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Measurement Date</label>
                <input type="date" value={measForm.measurementDate} onChange={e => setMeasForm(f => ({...f, measurementDate: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Quantity</label>
                <input type="number" step="0.001" min="0.001" value={measForm.quantity} onChange={e => setMeasForm(f => ({...f, quantity: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Unit</label>
                <input type="text" value={measForm.unit} onChange={e => setMeasForm(f => ({...f, unit: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="m³, m², nos, etc." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Description/Location</label>
                <input type="text" value={measForm.description} onChange={e => setMeasForm(f => ({...f, description: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="e.g. RCC column, 3rd floor, grid A-C" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Recorded By</label>
                <input type="text" value={measForm.recordedBy} onChange={e => setMeasForm(f => ({...f, recordedBy: e.target.value}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="Site Engineer" />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setShowAddMeas(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addingMeas} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow hover:bg-slate-700 disabled:opacity-50">
                  {addingMeas ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Save Measurement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
