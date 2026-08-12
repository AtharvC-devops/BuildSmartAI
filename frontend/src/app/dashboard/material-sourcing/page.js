"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Hammer, Sparkles, Loader2, Layers, Building, Ruler,
  MapPin, Star, BadgePercent, AlertCircle, ShoppingCart
} from "lucide-react";
import { predictMaterials, getSuppliers } from "@/lib/api";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

const materialOptions = [
  { value: 1, label: "Basic" },
  { value: 2, label: "Standard" },
  { value: 3, label: "Premium" },
  { value: 4, label: "Luxury" },
  { value: 5, label: "Ultra-Luxury" },
];

const typeOptions = [
  { value: "residential", label: "Residential Villa / House" },
  { value: "commercial", label: "Commercial Office / Retail" },
  { value: "industrial", label: "Industrial Factory / Warehouse" },
];

// Price approximations in INR for cost breakdown
const UNIT_PRICES = {
  "Cement (bags)": 420,
  "Steel (tons)": 65000,
  "Bricks (units)": 8,
  "Sand (cu ft)": 60,
  "Paint (liters)": 280,
};

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function MaterialSourcing() {
  const [form, setForm] = useState({ area: 2500, floors: 2, material_quality: 3, construction_type: "residential" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("Cement");
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await predictMaterials({
        area: parseFloat(form.area),
        floors: parseInt(form.floors),
        material_quality: parseInt(form.material_quality),
        construction_type: form.construction_type,
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load suppliers when selected material changes or when result is loaded
  useEffect(() => {
    async function loadSuppliers() {
      setSuppliersLoading(true);
      try {
        const data = await getSuppliers(selectedMaterial);
        setSuppliers(data.rankings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSuppliersLoading(false);
      }
    }
    loadSuppliers();
  }, [selectedMaterial]);

  // Compute values for charts
  const materialData = result
    ? Object.entries(result.materials).map(([name, val]) => {
        const cost = Math.round(val * (UNIT_PRICES[name] || 1));
        return { name, quantity: val, cost };
      })
    : [];

  const totalCost = materialData.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI Material Sourcing</h2>
        <p className="text-sm text-slate-500">
          Estimate construction materials quantity and source them from best-rated suppliers.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Parameters Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-emerald-600" /> Structure Specifications
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-slate-400" /> Area (sq ft)
              </label>
              <input
                type="number"
                className="input-field"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                min="100"
                max="100000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Number of Floors
              </label>
              <input
                type="number"
                className="input-field"
                value={form.floors}
                onChange={(e) => setForm({ ...form, floors: e.target.value })}
                min="1"
                max="12"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <BadgePercent className="w-3.5 h-3.5 text-slate-400" /> Material Quality Grade
              </label>
              <select
                className="input-field"
                value={form.material_quality}
                onChange={(e) => setForm({ ...form, material_quality: e.target.value })}
              >
                {materialOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Construction Type
              </label>
              <select
                className="input-field"
                value={form.construction_type}
                onChange={(e) => setForm({ ...form, construction_type: e.target.value })}
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Estimate Materials</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Estimation Results */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Total Cost Estimate Card */}
                <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-500">Estimated Material Cost</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      {Math.round(result.confidence * 100)}% accuracy
                    </span>
                  </div>
                  <div className="text-4xl font-black gradient-text mb-1">
                    {formatINR(totalCost)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Calculated using standard local wholesale material pricing indexes.
                  </p>
                  {result.fallback && (
                    <div className="mt-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Fallback engine activated (AI service offline)
                    </div>
                  )}
                </div>

                {/* Quantities & Chart Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detailed list */}
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                      Required Quantities
                    </h3>
                    <div className="space-y-3">
                      {materialData.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-slate-600">{item.name.split(" ")[0]}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-900">
                              {item.quantity.toLocaleString("en-IN")} {item.name.includes("(") ? item.name.substring(item.name.indexOf("(")) : ""}
                            </div>
                            <div className="text-[10px] text-slate-400">Est. {formatINR(item.cost)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="glass-card p-5 flex flex-col justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Cost Allocation</h3>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={materialData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="cost"
                          >
                            {materialData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 11, borderRadius: 8, border: "none" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                      {materialData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-1 text-[9px] text-slate-500">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          {item.name.split(" ")[0]} ({Math.round((item.cost / totalCost) * 100)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Hammer className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Quantities & Costs</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Provide project specs on the left to compute detailed material counts and estimated wholesale costs.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Supplier Matching Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-600" /> Local Suppliers Sourcing
            </h3>
            <p className="text-xs text-slate-400">
              Filter by material and allocate the best supplier with our AI scoring engine.
            </p>
          </div>

          {/* Sourcing tabs */}
          <div className="flex flex-wrap gap-1.5">
            {["Cement", "Steel", "Bricks", "Sand", "Paint"].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMaterial(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedMaterial === m
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Suppliers List */}
        {suppliersLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs text-slate-400">Finding suppliers...</span>
          </div>
        ) : suppliers.length > 0 ? (
          <div className="space-y-4">
            {/* Top Match recommendation banner */}
            <div className="rounded-xl gradient-accent p-4 text-white flex items-center justify-between flex-wrap gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base">
                  🏆
                </div>
                <div>
                  <div className="text-[10px] text-indigo-100 uppercase tracking-wider font-semibold">
                    Best Match Recommendation
                  </div>
                  <div className="text-lg font-bold">{suppliers[0].name}</div>
                  <div className="text-xs text-indigo-100 mt-0.5">
                    Score: {suppliers[0].score} • Dist: {suppliers[0].distance}km • Price Index: {suppliers[0].price_index}x
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-bold whitespace-nowrap">
                ⭐ {suppliers[0].rating} Rating
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="pb-3 pr-4 font-semibold">Supplier Name</th>
                    <th className="pb-3 pr-4 font-semibold">Distance</th>
                    <th className="pb-3 pr-4 font-semibold">Price Index</th>
                    <th className="pb-3 pr-4 font-semibold">Rating</th>
                    <th className="pb-3 pr-4 font-semibold">Availability</th>
                    <th className="pb-3 pr-4 font-semibold text-right">AI Score</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-xs text-slate-800 flex items-center gap-2">
                        {s.name}
                        {s.id === suppliers[0].id && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold border border-emerald-200">
                            Recomm.
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {s.distance} km
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">
                          {s.price_index}x
                        </span>{" "}
                        wholesale price
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {s.rating}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <span
                          className={`font-semibold ${
                            s.availability ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {s.availability ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-black text-xs text-indigo-600">
                        {s.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            No suppliers found for the selected material.
          </div>
        )}
      </motion.div>
    </div>
  );
}
