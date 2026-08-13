"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, Sparkles, Loader2, Users, Ruler, Gauge } from "lucide-react";
import { predictTime } from "@/lib/api";

const complexityLabels = [
  { value: 1, label: "Simple – Basic structure" },
  { value: 2, label: "Standard – Moderate features" },
  { value: 3, label: "Complex – Multiple systems" },
  { value: 4, label: "Advanced – Premium finishes" },
  { value: 5, label: "Ultra – Architectural marvel" },
];

export default function TimePrediction() {
  const [form, setForm] = useState({ area: 3000, workers: 20, complexity: 3 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await predictTime({
        area: parseFloat(form.area),
        workers: parseInt(form.workers),
        complexity: parseInt(form.complexity),
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI Time Prediction</h2>
        <p className="text-sm text-slate-500">
          Linear Regression model estimates project completion timelines
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Timeline Parameters
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Area (sq ft)</span>
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
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Number of Workers</span>
              </label>
              <input
                type="number"
                className="input-field"
                value={form.workers}
                onChange={(e) => setForm({ ...form, workers: e.target.value })}
                min="1"
                max="200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Project Complexity</span>
              </label>
              <select
                className="input-field"
                value={form.complexity}
                onChange={(e) => setForm({ ...form, complexity: e.target.value })}
              >
                {complexityLabels.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Estimating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Estimate Time</>
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
              {/* Total Days Card */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-500">Estimated Duration</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-slate-900">{result.estimated_days}</span>
                  <span className="text-lg text-slate-400">days</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  ≈ {Math.round(result.estimated_days / 30)} months
                </div>
                {result.fallback && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    ⚠️ Using fallback calculation (AI service offline)
                  </div>
                )}
              </div>

              {/* Timeline Visualization */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Project Phases</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={result.phases} layout="vertical" barSize={20}>
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} unit=" days" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                      formatter={(v) => [`${v} days`, "Duration"]}
                    />
                    <Bar dataKey="days" radius={[0, 8, 8, 0]} animationDuration={800}>
                      {result.phases.map((phase, i) => (
                        <Cell key={i} fill={phase.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Phase Details */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Phase Timeline</h3>
                <div className="space-y-3">
                  {result.phases.reduce((acc, phase, i) => {
                    const startDay = i === 0 ? 1 : acc[i - 1].endDay + 1;
                    const endDay = startDay + phase.days - 1;
                    acc.push({ ...phase, startDay, endDay });
                    return acc;
                  }, []).map((phase, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: phase.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-700">{phase.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        Day {phase.startDay} – {phase.endDay}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 w-16 text-right">{phase.days} days</span>
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
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Time Estimation</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Fill in the project parameters to get a phase-by-phase timeline estimate.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
