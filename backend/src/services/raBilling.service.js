const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid"
};

const STATUS_TRANSITIONS = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["approved", "rejected"],
  approved: ["paid"],
  rejected: ["draft"],
  paid: []
};

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function roundAmount(value) {
  return Math.round(toAmount(value) * 100) / 100;
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function calculateRABill(items, deductions = {}) {
  const grossAmount = roundAmount(items.reduce((sum, item) => sum + toAmount(item.currentAmount), 0));
  const retention = roundAmount(deductions.retention);
  const advanceRecovery = roundAmount(deductions.advanceRecovery);
  const penalty = roundAmount(deductions.penalty);
  const otherDeduction = roundAmount(deductions.otherDeduction);
  const taxDeduction = roundAmount(deductions.taxDeduction);
  const gst = roundAmount(deductions.gst);
  const totalDeduction = roundAmount(retention + advanceRecovery + penalty + otherDeduction + taxDeduction);
  const netPayable = roundAmount(grossAmount - totalDeduction + gst);

  return { grossAmount, retention, advanceRecovery, penalty, otherDeduction, taxDeduction, gst, totalDeduction, netPayable };
}

function canTransition(from, to) {
  return (STATUS_TRANSITIONS[normalizeStatus(from)] || []).includes(normalizeStatus(to));
}

function labelForStatus(status) {
  return STATUS_LABELS[normalizeStatus(status)] || status;
}

module.exports = {
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  toAmount,
  roundAmount,
  normalizeStatus,
  isValidDate,
  calculateRABill,
  canTransition,
  labelForStatus
};
