"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DollarSign, Sparkles, Loader2, MapPin, Layers, Hammer, Building } from "lucide-react";
import { predictCost } from "@/lib/api";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

const materialOptions = [
  { value: 1, label: "Basic" },
  { value: 2, label: "Standard" },
  { value: 3, label: "Premium" },
  { value: 4, label: "Luxury" },
  { value: 5, label: "Ultra-Luxury" },
];

const locationOptions = [
  { value: 1, label: "Metro City (Tier 1)" },
  { value: 2, label: "Urban (Tier 2)" },
  { value: 3, label: "Rural (Tier 3)" },
];

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function CostPrediction() {
  const [form, setForm] = useState({ area: 2000, material_quality: 3, location_tier: 2, floors: 2 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await predictCost({
        area: parseFloat(form.area),
        material_quality: parseInt(form.material_quality),
        location_tier: parseInt(form.location_tier),
        floors: parseInt(form.floors),
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? Object.entries(result.breakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI Cost Prediction</h2>
        <p className="text-sm text-slate-500">
          Powered by Random Forest ML model trained on 500+ construction data points
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-emerald-600" /> Project Parameters
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Area (sq ft)</span>
              </label>
              <input
                type="number"
                className="input-field"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                min="100"
                max="50000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Material Quality</span>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location Tier</span>
              </label>
              <select
                className="input-field"
                value={form.location_tier}
                onChange={(e) => setForm({ ...form, location_tier: e.target.value })}
              >
                {locationOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Number of Floors</span>
              </label>
              <input
                type="number"
                className="input-field"
                value={form.floors}
                onChange={(e) => setForm({ ...form, floors: e.target.value })}
                min="1"
                max="10"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Predicting...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Predict Cost</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Total Cost Card */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-500">Predicted Total Cost</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>
                <div className="text-4xl font-black gradient-text mb-1">
                  {formatINR(result.predicted_cost)}
                </div>
                <div className="text-sm text-slate-400">
                  ≈ {formatINR(Math.round(result.predicted_cost / form.area))}/sq ft
                </div>
                {result.fallback && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    ⚠️ Using fallback calculation (AI service offline)
                  </div>
                )}
              </div>

              {/* Breakdown Chart */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Cost Breakdown</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown List */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Detailed Breakdown</h3>
                <div className="space-y-3">
                  {chartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatINR(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-10 flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Cost Prediction</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Fill in the project parameters and click &quot;Predict Cost&quot; to get an AI-powered estimate.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
