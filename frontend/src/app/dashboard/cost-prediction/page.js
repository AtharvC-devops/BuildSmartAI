"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  MapPin, Ruler, BedDouble, Bath, Sparkles, Loader2, TrendingUp,
  IndianRupee, Building2, Info, ChevronDown, Search, Package,
  HardHat, Layers, Boxes, Truck, CheckCircle2, AlertTriangle,
  ArrowRight, X,
} from "lucide-react";
import { predictPrice, predictMaterials } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────────────
const BHK_OPTIONS = [
  { value: 1, label: "1 BHK" },
  { value: 2, label: "2 BHK" },
  { value: 3, label: "3 BHK" },
  { value: 4, label: "4 BHK" },
  { value: 5, label: "5+ BHK" },
];

const BATH_OPTIONS = [
  { value: 1, label: "1 Bath" },
  { value: 2, label: "2 Bath" },
  { value: 3, label: "3 Bath" },
  { value: 4, label: "4 Bath" },
  { value: 5, label: "5+ Bath" },
];

const QUALITY_OPTIONS = [
  { value: 1, label: "Class-C Economy",    desc: "Basic finishes, local materials",   mult: 0.70 },
  { value: 2, label: "Class-B Standard",   desc: "Good quality, branded fittings",    mult: 0.85 },
  { value: 3, label: "Class-A Premium",    desc: "Premium finishes, imported tiles",  mult: 1.00 },
  { value: 4, label: "Luxury",             desc: "High-end, designer interiors",      mult: 1.30 },
  { value: 5, label: "Ultra-Luxury",       desc: "World-class, bespoke materials",    mult: 1.60 },
];

const MATERIAL_COLORS = {
  "Cement":     "#6366f1",
  "TMT Steel":  "#f59e0b",
  "Sand":       "#10b981",
  "Bricks":     "#ec4899",
  "Paint":      "#3b82f6",
  "Labor":      "#8b5cf6",
};

const MATERIAL_ICONS = {
  "Cement":     Package,
  "TMT Steel":  HardHat,
  "Sand":       Layers,
  "Bricks":     Boxes,
  "Paint":      Truck,
  "Labor":      HardHat,
};

// ── Indian Price Formatter ───────────────────────────────────────────────
function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} Lakhs`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatINRFull(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ── Searchable Location Dropdown ─────────────────────────────────────────
function LocationCombobox({ locations, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = locations.filter((loc) =>
    loc.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        className={`input-field flex items-center gap-2 cursor-pointer ${open ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.1)]" : ""}`}
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
        {value ? (
          <span className="flex-1 truncate text-slate-900">{value}</span>
        ) : (
          <span className="flex-1 text-slate-400">Search location...</span>
        )}
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); setSearch(""); }}
            className="p-0.5 hover:bg-slate-100 rounded"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
          >
            {/* Search input */}
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Type to search locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  No locations found
                </div>
              ) : (
                filtered.slice(0, 50).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 ${
                      loc === value ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-700"
                    }`}
                    onClick={() => { onChange(loc); setOpen(false); setSearch(""); }}
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    {loc}
                    {loc === value && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                  </button>
                ))
              )}
              {filtered.length > 50 && (
                <div className="px-4 py-2 text-xs text-slate-400 text-center border-t border-slate-100">
                  Showing 50 of {filtered.length} — type to narrow down
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tooltip Component ────────────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs leading-relaxed shadow-lg z-50 pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-slate-800 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="h-4 w-32 animate-shimmer rounded" />
      <div className="h-10 w-48 animate-shimmer rounded" />
      <div className="h-3 w-40 animate-shimmer rounded" />
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 animate-shimmer rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── CPWD Material Estimator ──────────────────────────────────────────────
function estimateCPWDMaterials(sqft, bhk, qualityMult) {
  const floors = Math.max(1, Math.ceil(bhk / 2));
  return {
    "Cement":     { qty: Math.round(sqft * 0.4 * floors * qualityMult),      unit: "Bags",   rate: 380  },
    "TMT Steel":  { qty: Math.round(sqft * 5.0 * floors * qualityMult),      unit: "Kg",     rate: 65   },
    "Sand":       { qty: Math.round(sqft * 1.8 * floors * qualityMult),      unit: "cu.ft",  rate: 55   },
    "Bricks":     { qty: Math.round(sqft * 12  * floors * qualityMult),      unit: "Pcs",    rate: 9    },
    "Paint":      { qty: Math.round(sqft * 0.15 * floors * qualityMult),     unit: "Litres", rate: 320  },
    "Labor":      { qty: Math.round(sqft * 0.02 * floors * qualityMult * 8), unit: "Shifts", rate: 800  },
  };
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════
export default function CostPrediction() {
  // ── State ──────────────────────────────────────────────────────────────
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(true);

  const [form, setForm] = useState({
    location: "",
    total_sqft: "",
    bhk: 2,
    bath: 2,
    quality: 3,
    units: 1, // Number of flats/units in the building
  });

  const [result, setResult] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Load locations from public/location_list.json ──────────────────────
  useEffect(() => {
    async function fetchLocations() {
      try {
        // Try from API first (live from AI service)
        const res = await fetch("/location_list.json");
        const data = await res.json();
        setLocations(data.locations || []);
      } catch {
        // Fallback: try API endpoint
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/locations`
          );
          const data = await res.json();
          setLocations(data.locations || []);
        } catch {
          setLocations([]);
        }
      } finally {
        setLocLoading(false);
      }
    }
    fetchLocations();
  }, []);

  // ── Form validation ────────────────────────────────────────────────────
  const isValid = form.location && form.total_sqft && parseFloat(form.total_sqft) >= 200;

  // ── Submit prediction ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setMaterials(null);

    try {
      // 1. Get baseline prediction from the ML model
      const basePriceData = await predictPrice({
        location: form.location,
        total_sqft: parseFloat(form.total_sqft),
        bhk: parseInt(form.bhk),
        bath: parseInt(form.bhk), // Default bath to bhk to maintain API compatibility
      });

      // 2. Apply Quality Multiplier & Scale for Entire Building
      const qualityMult = QUALITY_OPTIONS.find((q) => q.value === form.quality)?.mult || 1.0;
      const numUnits = parseInt(form.units) || 1;
      
      const adjustedPrice = basePriceData.predicted_price * qualityMult * numUnits;
      // Price per sqft remains per-unit for display purposes, or can be scaled. It's usually a rate, so keep it flat.
      const adjustedPricePerSqft = basePriceData.price_per_sqft * qualityMult;
      
      setResult({
        ...basePriceData,
        predicted_price: adjustedPrice,
        price_per_sqft: adjustedPricePerSqft,
        price_display: formatINR(adjustedPrice).replace('₹', '') // format for display
      });

      // 3. Estimate CPWD materials for the entire building (total sqft * units)
      const totalBuildingSqft = parseFloat(form.total_sqft) * numUnits;
      const cpwdData = estimateCPWDMaterials(
        totalBuildingSqft,
        parseInt(form.bhk),
        qualityMult
      );
      setMaterials(cpwdData);

    } catch (err) {
      console.error("Prediction error:", err);
      setError("Could not get prediction. Ensure the AI service is running and the model is trained.");
    } finally {
      setLoading(false);
    }
  }, [form, isValid]);

  // ── Material chart data ────────────────────────────────────────────────
  const materialChartData = materials
    ? Object.entries(materials).map(([name, data]) => ({
        name,
        cost: data.qty * data.rate,
      }))
    : [];

  const totalMaterialCost = materialChartData.reduce((sum, d) => sum + d.cost, 0);

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              Cost Prediction
            </h2>
            <p className="text-sm text-slate-500">
              ML-powered property price prediction trained on 13,000+ real Indian properties + CPWD material estimation
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">Real ML Model Active</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ════════════════════════════════════════════════════════════════
            LEFT: INPUT FORM (2 cols on lg)
            ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 sticky top-24">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Project Parameters
            </h3>

            {/* Location */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Project Location
                <InfoTooltip text="Select the locality/area where the property is located. This is one of 286 real locations the ML model was trained on." />
              </label>
              {locLoading ? (
                <div className="h-10 animate-shimmer rounded-lg" />
              ) : (
                <LocationCombobox
                  locations={locations}
                  value={form.location}
                  onChange={(val) => setForm({ ...form, location: val })}
                />
              )}
            </div>

            {/* Built-up Area */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <Ruler className="w-3.5 h-3.5" />
                Built-up Area (sq. ft.)
                <InfoTooltip text="Built-up area includes carpet area + wall thickness + balcony. This is different from plot/land area. For a 2BHK flat, typical range is 800–1200 sq.ft." />
              </label>
              <div className="relative">
                <input
                  id="total-sqft-input"
                  type="number"
                  className="input-field pr-16"
                  placeholder="e.g. 1200"
                  value={form.total_sqft}
                  onChange={(e) => setForm({ ...form, total_sqft: e.target.value })}
                  min="200"
                  max="50000"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                  sq.ft / unit
                </span>
              </div>
            </div>

            {/* Building Units & Construction Quality */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Number of Flats / Units
                  <InfoTooltip text="Number of flats/apartments in the entire building. The cost will scale up accordingly." />
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="500"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Construction Quality
                  <InfoTooltip text="This affects the CPWD material estimation. Class-C uses basic local materials, while Ultra-Luxury uses imported premium materials." />
                </label>
                <select
                  id="quality-select"
                  className="input-field"
                  value={form.quality}
                  onChange={(e) => setForm({ ...form, quality: parseInt(e.target.value) })}
                >
                  {QUALITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BHK Row */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <BedDouble className="w-3.5 h-3.5" />
                BHK (Bedrooms)
              </label>
              <select
                id="bhk-select"
                className="input-field"
                value={form.bhk}
                onChange={(e) => setForm({ ...form, bhk: parseInt(e.target.value) })}
              >
                {BHK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Construction Quality */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <Layers className="w-3.5 h-3.5" />
                Construction Quality
                <InfoTooltip text="This affects the CPWD material estimation. Class-C uses basic local materials, while Ultra-Luxury uses imported premium materials. The quality tier scales material quantities by a CPWD multiplier." />
              </label>
              <select
                id="quality-select"
                className="input-field"
                value={form.quality}
                onChange={(e) => setForm({ ...form, quality: parseInt(e.target.value) })}
              >
                {QUALITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Validation hint */}
            {form.total_sqft && parseFloat(form.total_sqft) < 200 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Minimum built-up area is 200 sq.ft for accurate predictions.
              </div>
            )}

            {/* Submit */}
            <button
              id="predict-button"
              type="submit"
              disabled={loading || !isValid}
              className="w-full py-3.5 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with ML Model...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Get Smart Estimate</>
              )}
            </button>
          </form>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT: RESULTS (3 cols on lg)
            ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-5">
          <AnimatePresence mode="wait">
            {loading ? (
              /* ── Loading Skeleton ─────────────────────────────────── */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <SkeletonCard />
                <SkeletonCard />
              </motion.div>

            ) : error ? (
              /* ── Error State ──────────────────────────────────────── */
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Prediction Error</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
              </motion.div>

            ) : result ? (
              /* ── Results ──────────────────────────────────────────── */
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* ═══ Section A: Financial Overview (Builder View) ═══ */}
                <div className="glass-card overflow-hidden">
                  {/* Gradient header */}
                  <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white/90">Section A — Builder Financial Overview</h3>
                        <p className="text-[11px] text-white/60">Powered by BuildSmart AI Engine & CPWD Standards</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-medium border border-white/20">
                      {Math.round((result.confidence || 0.85) * 100)}% confidence
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Building Cost */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8" />
                        <div className="text-sm font-semibold text-slate-500 mb-1">Estimated Building Cost</div>
                        <div className="text-3xl font-black text-slate-900 leading-tight mb-1">
                          {formatINR(totalMaterialCost)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatINRFull(totalMaterialCost)} • Raw Materials + Labor
                        </div>
                      </div>

                      {/* Market Value */}
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-8 -mt-8" />
                        <div className="text-sm font-semibold text-emerald-700 mb-1">Estimated Project Price</div>
                        <div className="text-3xl font-black gradient-text leading-tight mb-1">
                          ₹{result.price_display}
                        </div>
                        <div className="text-xs text-emerald-600/70">
                          {formatINRFull(result.predicted_price)} • ML Model Prediction
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Gross Margin</div>
                        <div className="text-lg font-bold text-emerald-600">
                          {Math.max(0, Math.round(((result.predicted_price - totalMaterialCost) / result.predicted_price) * 100))}%
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Build / sq.ft</div>
                        <div className="text-lg font-bold text-slate-900 flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                          {Math.round(totalMaterialCost / (parseFloat(form.total_sqft) * parseInt(form.units || 1))).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Location</div>
                        <div className="text-sm font-semibold text-slate-900 truncate" title={form.location}>{form.location}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Config</div>
                        <div className="text-sm font-semibold text-slate-900">{form.units} Units of {form.bhk} BHK</div>
                      </div>
                    </div>

                    {/* Value Gap Analysis */}
                    <div className="pt-5 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-4">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-sm font-semibold text-slate-800">Value Gap Analysis</h4>
                        <span className="text-xs text-slate-500 ml-auto">Where does the difference go?</span>
                      </div>
                      
                      {(() => {
                        const gap = result.predicted_price - totalMaterialCost;
                        const landAndSoft = Math.max(0, gap * 0.7); // 70% of the gap is land & permits
                        const profit = Math.max(0, gap * 0.3);      // 30% of the gap is profit
                        
                        const pctBuild = (totalMaterialCost / result.predicted_price) * 100;
                        const pctLand = (landAndSoft / result.predicted_price) * 100;
                        const pctProfit = (profit / result.predicted_price) * 100;

                        return (
                          <div className="space-y-4">
                            {/* Stacked Bar */}
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div style={{ width: `${pctBuild}%` }} className="bg-blue-500 hover:opacity-90 transition-opacity" title="Construction Cost" />
                              <div style={{ width: `${pctLand}%` }} className="bg-amber-400 hover:opacity-90 transition-opacity" title="Land & Approvals" />
                              <div style={{ width: `${pctProfit}%` }} className="bg-emerald-500 hover:opacity-90 transition-opacity" title="Estimated Profit" />
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 uppercase mb-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" /> Construction
                                </div>
                                <div className="text-sm font-bold text-slate-900">{formatINR(totalMaterialCost)}</div>
                              </div>
                              
                              <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 uppercase mb-1">
                                  <div className="w-2 h-2 rounded-full bg-amber-400" /> Land & Permits
                                </div>
                                <div className="text-sm font-bold text-slate-900">{formatINR(landAndSoft)}</div>
                              </div>

                              <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase mb-1">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Net Profit
                                </div>
                                <div className="text-sm font-bold text-slate-900">{formatINR(profit)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ═══ Section B: CPWD Material Breakdown ═══ */}
                {materials && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="glass-card overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                            <Package className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white/90">Section B — CPWD Bill of Quantities</h3>
                            <p className="text-[11px] text-white/60">Based on CPWD Schedule of Rates for {QUALITY_OPTIONS.find(q => q.value === form.quality)?.label}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-medium border border-white/20">
                          Est. {formatINR(totalMaterialCost)}
                        </span>
                      </div>

                      <div className="p-6">
                        {/* Material cards grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                          {Object.entries(materials).map(([name, data], idx) => {
                            const Icon = MATERIAL_ICONS[name] || Package;
                            const color = MATERIAL_COLORS[name] || "#6366f1";
                            const cost = data.qty * data.rate;

                            return (
                              <motion.div
                                key={name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + idx * 0.05 }}
                                className="relative rounded-xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all group"
                              >
                                <div className="absolute top-3 right-3 w-2 h-2 rounded-full opacity-60" style={{ background: color }} />
                                <Icon className="w-5 h-5 mb-2" style={{ color }} />
                                <div className="text-xs font-medium text-slate-400 mb-0.5">{name}</div>
                                <div className="text-xl font-bold text-slate-900">{data.qty.toLocaleString("en-IN")}</div>
                                <div className="text-[11px] text-slate-400">{data.unit}</div>
                                <div className="text-xs font-semibold mt-2 pt-2 border-t border-slate-50" style={{ color }}>
                                  {formatINR(cost)}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Material cost bar chart */}
                        <div className="bg-slate-50 rounded-xl p-4">
                          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Material Cost Distribution</h4>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={materialChartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                              <XAxis type="number" tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }} />
                              <RechartsTooltip
                                formatter={(v) => formatINRFull(v)}
                                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                              />
                              <Bar dataKey="cost" radius={[0, 6, 6, 0]} barSize={20}>
                                {materialChartData.map((entry) => (
                                  <Cell key={entry.name} fill={MATERIAL_COLORS[entry.name] || "#6366f1"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                          <span className="text-sm font-medium text-slate-600">Estimated Total Material Cost</span>
                          <span className="text-lg font-bold gradient-text">{formatINR(totalMaterialCost)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

            ) : (
              /* ── Empty State ──────────────────────────────────────── */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-12 flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-5 border border-emerald-100">
                  <Building2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">BuildSmart Estimation Engine</h3>
                <p className="text-sm text-slate-400 max-w-sm mb-6">
                  Enter your project details on the left to get an ML-powered price prediction
                  and a detailed CPWD-standard material bill of quantities.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Real Real-Estate Data", "AI Estimation Engine", "CPWD Standards", "286 Locations"].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
