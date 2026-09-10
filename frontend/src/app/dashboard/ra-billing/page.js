"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee, Sparkles, Loader2, Plus, Receipt, FileText, CheckCircle2,
  AlertTriangle, Layers, PlusCircle, X, ChevronRight, Check, Ban, CreditCard, Filter
} from "lucide-react";
import {
  getProjects, getProjectBOQ, getPWDRates, getProjectContractors,
  getProjectContracts, getProjectRABills, createProjectRABill, addProjectRABillItem,
  updateProjectRABillStatus, downloadProjectRABillPdf
} from "@/lib/api";

function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function RABillingPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [contractors, setContractors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ draft: 0, submitted: 0, underReview: 0, approved: 0, rejected: 0, paid: 0, totalBills: 0, totalBilledAmount: 0, totalPaidAmount: 0, outstandingAmount: 0 });
  const [boqItems, setBoqItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bill Inspection / Drawer State
  const [selectedBill, setSelectedBill] = useState(null);

  // Modals & form state
  const [createBillModalOpen, setCreateBillModalOpen] = useState(false);
  const [billForm, setBillForm] = useState({
    contractorId: "",
    contractId: "",
    billNumber: "",
    billingPeriodStart: "",
    billingPeriodEnd: "",
    workDescription: "",
    advanceRecovery: 0,
    penalty: 0,
    otherDeduction: 0,
    taxDeduction: 0
  });

  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    boqItemId: "",
    quantityCompleted: 1,
    rate: 0
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

  // Load Contractors, BOQ items and bills when project changes
  const loadProjectDetails = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const pid = parseInt(selectedProjectId);
      const [contrs, contractList, boq] = await Promise.all([
        getProjectContractors(pid),
        getProjectContracts(pid),
        getProjectBOQ(pid)
      ]);
      setContractors(contrs);
      setContracts(contractList || []);
      setBoqItems(boq.items || []);
      if (contrs.length > 0) {
        const firstContract = (contractList || []).find(contract => contract.contractor_id === contrs[0].id);
        setBillForm(prev => ({ ...prev, contractorId: contrs[0].id.toString(), contractId: firstContract ? firstContract.id.toString() : "" }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch project dependencies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails();
    }
  }, [selectedProjectId]);

  // Load Bills when filters change
  const loadBills = async () => {
    if (!selectedProjectId) return;
    try {
      const pid = parseInt(selectedProjectId);
      const params = {};
      if (selectedContractorId) params.contractorId = selectedContractorId;
      if (selectedStatus) params.status = selectedStatus;

      const data = await getProjectRABills(pid, params);
      setBills(data.bills || []);
      setSummary(data.summary || { pendingApproval: 0, approved: 0, paid: 0, totalPayable: 0 });

      // Keep inspected bill details updated
      if (selectedBill) {
        const updatedInspected = data.bills.find(b => b.id === selectedBill.id);
        setSelectedBill(updatedInspected || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadBills();
    }
  }, [selectedProjectId, selectedContractorId, selectedStatus]);

  const handleOpenCreateBill = () => {
    setBillForm({
      contractorId: contractors.length > 0 ? contractors[0].id.toString() : "",
      contractId: contracts.length > 0 ? contracts[0].id.toString() : "",
      billNumber: "",
      billingPeriodStart: "",
      billingPeriodEnd: "",
      workDescription: "",
      advanceRecovery: 0,
      penalty: 0,
      otherDeduction: 0,
      taxDeduction: 0
    });
    setCreateBillModalOpen(true);
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProjectRABill(parseInt(selectedProjectId), {
        ...billForm,
        contractorId: parseInt(billForm.contractorId),
        contractId: parseInt(billForm.contractId)
      });
      await loadBills();
      setCreateBillModalOpen(false);
    } catch (err) {
      alert("Error creating bill draft: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddItem = () => {
    if (!selectedBill) return;
    setItemForm({
      boqItemId: boqItems.length > 0 ? boqItems[0].id.toString() : "",
      quantityCompleted: 1,
      rate: boqItems.length > 0 ? boqItems[0].rate : 0
    });
    setAddItemModalOpen(true);
  };

  const handleBoqItemSelect = (itemId) => {
    const item = boqItems.find(i => i.id === parseInt(itemId));
    if (item) {
      setItemForm(prev => ({
        ...prev,
        boqItemId: itemId,
        rate: item.rate
      }));
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addProjectRABillItem(parseInt(selectedProjectId), selectedBill.id, {
        boqItemId: parseInt(itemForm.boqItemId),
        currentQuantity: parseFloat(itemForm.quantityCompleted)
      });
      await loadBills();
      setAddItemModalOpen(false);
    } catch (err) {
      alert("Error adding item: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async (billId, status, extra = {}) => {
    try {
      await updateProjectRABillStatus(parseInt(selectedProjectId), billId, status, extra);
      await loadBills();
    } catch (err) {
      alert("Status transition failed: " + err.message);
    }
  };

  const handleDownload = async () => {
    const blob = await downloadProjectRABillPdf(parseInt(selectedProjectId), selectedBill.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedBill.billNumber}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const getStatusBadge = (status) => {
    const st = (status || "").toLowerCase();
    switch (st) {
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "submitted":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "under_review":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "paid":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-slate-500 text-sm">Loading RA Bill module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">RA (Running Account) Billing</h2>
          <p className="text-xs text-slate-500 mt-1">Manage, verify, and approve contractor certifications linked to project BOQs</p>
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

      {/* RA Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[['Total Bills', summary.totalBills, 'text-slate-800'], ['Draft', summary.draft, 'text-slate-700'], ['Submitted', summary.submitted, 'text-blue-700'], ['Under Review', summary.underReview, 'text-amber-700'], ['Approved', summary.approved, 'text-emerald-700'], ['Paid', summary.paid, 'text-indigo-700']].map(([label, value, tone]) => (
          <div key={label} className="glass-card p-3 text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</div>
            <div className={`text-lg font-black mt-1 ${tone}`}>{value}</div>
          </div>
        ))}
        <div className="glass-card p-3 text-center border-l-4 border-l-slate-700">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Billed</div>
          <div className="text-sm font-black text-slate-800 mt-1">{formatINR(summary.totalBilledAmount)}</div>
        </div>
        <div className="glass-card p-3 text-center border-l-4 border-l-rose-500">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Outstanding</div>
          <div className="text-sm font-black text-rose-700 mt-1">{formatINR(summary.outstandingAmount)}</div>
        </div>
      </div>

      {/* Filters & Actions bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>
          <select
            value={selectedContractorId}
            onChange={(e) => setSelectedContractorId(e.target.value)}
            className="input-field bg-slate-50 max-w-[200px]"
          >
            <option value="">All Contractors</option>
            {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field bg-slate-50 max-w-[150px]"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreateBill}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create RA Bill
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: RA Bills list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-600" /> Active Running Account Bills
              </h3>
            </div>
            {bills.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                No Running Account bills found matching the filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => setSelectedBill(bill)}
                    className={`p-4 cursor-pointer hover:bg-slate-50/70 transition-colors flex justify-between items-center text-xs gap-3 ${
                      selectedBill?.id === bill.id ? "bg-indigo-50/20 border-l-4 border-l-indigo-600" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-sm">{bill.billNumber}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-600">{bill.contractorName}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{bill.workDescription}</p>
                      <div className="text-[10px] text-slate-400">
                        Period: {bill.billingPeriod} • Created on: {bill.date}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4 shrink-0">
                      <div>
                        <div className="font-black text-slate-800 text-sm">{formatINR(bill.netPayable)}</div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border mt-1 ${getStatusBadge(bill.status)}`}>
                          {bill.status}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Inspector drawer */}
        <div className="lg:col-span-1">
          {selectedBill ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden sticky top-6">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs">BILL DETAILS INSPECTOR</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">{selectedBill.billNumber}</p>
                </div>
                <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-5 space-y-5 text-xs text-left">
                {/* Status Transitions */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-500">Current Status:</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(selectedBill.status)}`}>
                      {selectedBill.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedBill.status.toLowerCase() === "draft" && (
                      <button
                        onClick={() => handleStatusTransition(selectedBill.id, "Submitted")}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 flex items-center gap-0.5"
                      >
                        Submit Bill
                      </button>
                    )}
                    {selectedBill.status.toLowerCase() === "submitted" && (
                      <button
                        onClick={() => handleStatusTransition(selectedBill.id, "Under Review")}
                        className="px-2.5 py-1 bg-amber-600 text-white rounded text-[10px] font-bold hover:bg-amber-700 flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" /> Start Review
                      </button>
                    )}
                    {selectedBill.status.toLowerCase() === "under_review" && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(selectedBill.id, "Approved")}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            const rejectionReason = window.prompt("Reason for rejection");
                            if (rejectionReason) handleStatusTransition(selectedBill.id, "Rejected", { rejectionReason });
                          }}
                          className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 flex items-center gap-0.5"
                        >
                          <Ban className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {selectedBill.status.toLowerCase() === "approved" && (
                      <button
                        onClick={() => {
                          const paymentReference = window.prompt("Payment reference");
                          if (paymentReference) handleStatusTransition(selectedBill.id, "Paid", { paymentReference, paymentDate: new Date().toISOString().slice(0, 10), paymentAmount: selectedBill.netPayable });
                        }}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-0.5"
                      >
                        <CreditCard className="w-3 h-3" /> Mark Paid
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={handlePrint} className="px-2.5 py-1 border border-slate-200 text-slate-600 rounded text-[10px] font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Print Preview</button>
                    <button onClick={handleDownload} className="px-2.5 py-1 bg-slate-800 text-white rounded text-[10px] font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> Download PDF</button>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="flex justify-between"><span className="text-slate-400">Contractor:</span> <span className="font-bold text-slate-800">{selectedBill.contractorName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Billing Period:</span> <span className="font-medium text-slate-700">{selectedBill.billingPeriod}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">GST Charged:</span> <span className="font-semibold text-slate-700">{selectedBill.gstPercent}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Retention Margin:</span> <span className="font-semibold text-slate-700">{selectedBill.retentionPercent}%</span></div>
                </div>

                {/* Work Line Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs">Work Progress Items</span>
                    {selectedBill.status.toLowerCase() === "draft" && (
                      <button
                        onClick={handleOpenAddItem}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-0.5"
                      >
                        <PlusCircle className="w-3 h-3" /> Add Item
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {selectedBill.items?.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-[11px] bg-slate-50 rounded">
                        No certified items added yet.
                      </div>
                    ) : (
                      selectedBill.items.map((item) => {
                        const boqRef = boqItems.find(b => b.id === item.boqItemId) || { description: "Work Item" };
                        return (
                          <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded space-y-1">
                            <p className="font-bold text-[11px] text-slate-800">{boqRef.description}</p>
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Contract: {item.contractQuantity} • Prev: {item.prevQuantity} • Current: {item.quantityCompleted} • Cum: {item.cumulativeQuantity}</span>
                              <span className="font-bold text-slate-700">{formatINR(item.currentAmount)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between font-semibold"><span className="text-slate-500">Gross Current Bill:</span> <span className="text-slate-800">{formatINR(selectedBill.grossAmount)}</span></div>
                  <div className="flex justify-between text-red-600"><span className="text-slate-500">Retention:</span> <span>-{formatINR(selectedBill.deductions?.retention)}</span></div>
                  <div className="flex justify-between text-red-600"><span className="text-slate-500">Other Deductions:</span> <span>-{formatINR((selectedBill.deductions?.advanceRecovery || 0) + (selectedBill.deductions?.penalty || 0) + (selectedBill.deductions?.otherDeduction || 0) + (selectedBill.deductions?.taxDeduction || 0))}</span></div>
                  <div className="flex justify-between text-slate-700"><span className="text-slate-500">GST:</span> <span>+{formatINR(selectedBill.deductions?.gst)}</span></div>
                  <div className="h-[1px] bg-slate-200 my-1"></div>
                  <div className="flex justify-between font-black text-slate-900 text-sm"><span>Net Certified:</span> <span>{formatINR(selectedBill.netPayable)}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
              Select an RA bill from the list to inspect certified line items, status logs, and tax calculations.
            </div>
          )}
        </div>
      </div>

      {/* Create Bill Modal */}
      <AnimatePresence>
        {createBillModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <Receipt className="w-4.5 h-4.5 text-indigo-400" /> Create Running Account Bill Draft
                </div>
                <button onClick={() => setCreateBillModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBill} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Contractor Partner</label>
                  <select
                    value={billForm.contractorId}
                    onChange={(e) => {
                      const contractorId = e.target.value;
                      const matchingContract = contracts.find(contract => contract.contractor_id === parseInt(contractorId));
                      setBillForm(prev => ({ ...prev, contractorId, contractId: matchingContract ? matchingContract.id.toString() : "" }));
                    }}
                    className="input-field bg-slate-50"
                    required
                  >
                    {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Contract</label>
                  <select
                    value={billForm.contractId}
                    onChange={(e) => setBillForm(prev => ({ ...prev, contractId: e.target.value }))}
                    className="input-field bg-slate-50"
                    required
                  >
                    <option value="">Select contract</option>
                    {contracts.filter(contract => !billForm.contractorId || contract.contractor_id === parseInt(billForm.contractorId)).map(contract => (
                      <option key={contract.id} value={contract.id}>{contract.contract_number} - {contract.contractor_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Bill Number ID</label>
                    <input
                      type="text"
                      value={billForm.billNumber}
                      onChange={(e) => setBillForm(prev => ({ ...prev, billNumber: e.target.value }))}
                      className="input-field"
                      placeholder="e.g. RAB-03"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Period Start</label>
                    <input type="date" value={billForm.billingPeriodStart} onChange={(e) => setBillForm(prev => ({ ...prev, billingPeriodStart: e.target.value }))} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Period End</label>
                    <input type="date" value={billForm.billingPeriodEnd} onChange={(e) => setBillForm(prev => ({ ...prev, billingPeriodEnd: e.target.value }))} className="input-field" required />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Work/Contract Scope Description</label>
                  <textarea
                    rows="3"
                    value={billForm.workDescription}
                    onChange={(e) => setBillForm(prev => ({ ...prev, workDescription: e.target.value }))}
                    className="input-field"
                    placeholder="Provide overview of civil, structural or electrical items completed..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[['advanceRecovery', 'Advance Recovery'], ['penalty', 'Penalty'], ['otherDeduction', 'Other Deduction'], ['taxDeduction', 'Other Tax']].map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-slate-500 font-semibold mb-1">{label} (₹)</label>
                      <input type="number" min="0" step="0.01" value={billForm[field]} onChange={(e) => setBillForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))} className="input-field" />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateBillModalOpen(false)}
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
                    Create Draft
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
      <AnimatePresence>
        {addItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <PlusCircle className="w-4.5 h-4.5 text-indigo-400" /> Certify BOQ Quantity Item
                </div>
                <button onClick={() => setAddItemModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="p-6 space-y-4 text-left text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">BOQ Reference Item</label>
                  <select
                    value={itemForm.boqItemId}
                    onChange={(e) => handleBoqItemSelect(e.target.value)}
                    className="input-field bg-slate-50"
                    required
                  >
                    {boqItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.category}: {item.description} (Max Qty: {item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Quantity Completed</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={itemForm.quantityCompleted}
                      onChange={(e) => setItemForm(prev => ({ ...prev, quantityCompleted: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Contract Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.rate}
                      className="input-field bg-slate-100 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold">Current Certified Valuation:</span>
                  <span className="font-black text-slate-800 text-sm">
                    {formatINR(itemForm.quantityCompleted * itemForm.rate)}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setAddItemModalOpen(false)}
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
                    Add Item
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
