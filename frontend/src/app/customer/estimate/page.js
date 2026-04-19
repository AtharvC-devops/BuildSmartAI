"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, Sparkles, Loader2, MapPin, Layers, Building } from "lucide-react";
import { predictCost } from "@/lib/api";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function CustomerEstimate() {
  const [form, setForm] = useState({ area: 1500, material_quality: 2, location_tier: 2, floors: 1 });
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

  const chartData = result ? Object.entries(result.breakdown).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Get Instant Cost Estimate</h2>
        <p className="text-sm text-slate-500">Our AI model predicts construction costs based on your project details</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Area (sq ft)</label>
              <input
                type="number"
                className="input-field"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                min="100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Material Quality</label>
              <select className="input-field" value={form.material_quality} onChange={(e) => setForm({ ...form, material_quality: e.target.value })}>
                <option value="1">Basic</option>
                <option value="2">Standard</option>
                <option value="3">Premium</option>
                <option value="4">Luxury</option>
                <option value="5">Ultra-Luxury</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
              <select className="input-field" value={form.location_tier} onChange={(e) => setForm({ ...form, location_tier: e.target.value })}>
                <option value="1">Metro City</option>
                <option value="2">Urban</option>
                <option value="3">Rural</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Floors</label>
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</> : <><Sparkles className="w-4 h-4" /> Get Estimate</>}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="glass-card p-6 text-center">
                  <div className="text-sm text-slate-500 mb-2">Your Estimated Cost</div>
                  <div className="text-5xl font-black gradient-text mb-2">{formatINR(result.predicted_cost)}</div>
                  <div className="text-sm text-slate-400">
                    {formatINR(Math.round(result.predicted_cost / form.area))}/sq ft • {Math.round(result.confidence * 100)}% confidence
                  </div>
                  {result.fallback && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      ⚠️ Using fallback calculation (AI service offline)
                    </div>
                  )}
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Where Your Money Goes</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="value" animationDuration={800}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-14 flex flex-col items-center justify-center text-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Instant AI Estimate</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Enter your project details on the left and get an AI-powered cost breakdown instantly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
