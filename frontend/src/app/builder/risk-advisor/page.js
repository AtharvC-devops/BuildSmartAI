"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Sparkles, Loader2, Landmark, HelpCircle,
  Building, Users, Calendar, AlertTriangle, ShieldCheck, CloudRain
} from "lucide-react";
import { predictRisk } from "@/lib/api";

const cityOptions = [
  { value: "Mumbai", label: "Mumbai" },
  { value: "Delhi", label: "Delhi / NCR" },
  { value: "Bangalore", label: "Bangalore" },
  { value: "Chennai", label: "Chennai" },
  { value: "Pune", label: "Pune" },
];

const monthOptions = [
  { value: "January", label: "January" },
  { value: "February", label: "February" },
  { value: "March", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "May" },
  { value: "June", label: "June" },
  { value: "July", label: "July" },
  { value: "August", label: "August" },
  { value: "September", label: "September" },
  { value: "October", label: "October" },
  { value: "November", label: "November" },
  { value: "December", label: "December" },
];

const riskStyles = {
  High: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-600 text-white", meter: "bg-red-500", label: "High Risk" },
  Medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-500 text-white", meter: "bg-amber-500", label: "Medium Risk" },
  Low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-600 text-white", meter: "bg-emerald-500", label: "Low Risk" },
};

export default function RiskAdvisor() {
  const [form, setForm] = useState({ city: "Mumbai", floors: 3, workers: 25, start_month: "June" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await predictRisk({
        city: form.city,
        floors: parseInt(form.floors),
        workers: parseInt(form.workers),
        start_month: form.start_month,
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI Safety & Risk Advisor</h2>
        <p className="text-sm text-slate-500">
          Analyze construction site safety hazards, weather interruptions, and compliance delays.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" /> Site Parameters
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-slate-400" /> Project Location (City)
              </label>
              <select
                className="input-field"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              >
                {cityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Construction Start Month
              </label>
              <select
                className="input-field"
                value={form.start_month}
                onChange={(e) => setForm({ ...form, start_month: e.target.value })}
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Projected Floor Count
              </label>
              <input
                type="number"
                className="input-field"
                value={form.floors}
                onChange={(e) => setForm({ ...form, floors: e.target.value })}
                min="1"
                max="30"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Peak Crew Size (Workers)
              </label>
              <input
                type="number"
                className="input-field"
                value={form.workers}
                onChange={(e) => setForm({ ...form, workers: e.target.value })}
                min="1"
                max="300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing risks...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Analyze Site Risks</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Results page */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Score Card overview */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Safety */}
                  <div className={`glass-card p-4 border text-center ${riskStyles[result.safety_risk].bg} ${riskStyles[result.safety_risk].border}`}>
                    <ShieldAlert className="w-5 h-5 mx-auto mb-1 text-slate-700" />
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Safety Risk</div>
                    <div className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${riskStyles[result.safety_risk].badge}`}>
                      {result.safety_risk}
                    </div>
                  </div>

                  {/* Weather */}
                  <div className={`glass-card p-4 border text-center ${riskStyles[result.weather_risk].bg} ${riskStyles[result.weather_risk].border}`}>
                    <CloudRain className="w-5 h-5 mx-auto mb-1 text-slate-700" />
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Weather Risk</div>
                    <div className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${riskStyles[result.weather_risk].badge}`}>
                      {result.weather_risk}
                    </div>
                  </div>

                  {/* Compliance */}
                  <div className={`glass-card p-4 border text-center ${riskStyles[result.compliance_risk].bg} ${riskStyles[result.compliance_risk].border}`}>
                    <Landmark className="w-5 h-5 mx-auto mb-1 text-slate-700" />
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Permit Delay</div>
                    <div className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${riskStyles[result.compliance_risk].badge}`}>
                      {result.compliance_risk}
                    </div>
                  </div>
                </div>

                {/* Risk Meter Visualizer */}
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Risk Severity Levels
                  </h3>
                  <div className="space-y-4">
                    {/* Safety Risk */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Workforce Safety Hazard Index</span>
                        <span className={`capitalize ${riskStyles[result.safety_risk].text}`}>
                          {result.safety_risk.toLowerCase()} risk
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${riskStyles[result.safety_risk].meter}`}
                          style={{ width: result.safety_risk === "High" ? "90%" : result.safety_risk === "Medium" ? "55%" : "20%" }}
                        />
                      </div>
                    </div>

                    {/* Weather Risk */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Environmental Interruptions Risk</span>
                        <span className={`capitalize ${riskStyles[result.weather_risk].text}`}>
                          {result.weather_risk.toLowerCase()} risk
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${riskStyles[result.weather_risk].meter}`}
                          style={{ width: result.weather_risk === "High" ? "92%" : result.weather_risk === "Medium" ? "60%" : "25%" }}
                        />
                      </div>
                    </div>

                    {/* Compliance Risk */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Zoning NOC & Regulatory Compliance Risk</span>
                        <span className={`capitalize ${riskStyles[result.compliance_risk].text}`}>
                          {result.compliance_risk.toLowerCase()} risk
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${riskStyles[result.compliance_risk].meter}`}
                          style={{ width: result.compliance_risk === "High" ? "85%" : result.compliance_risk === "Medium" ? "50%" : "15%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Mitigations Checklist */}
                <div className="glass-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Actionable Mitigation Roadmap
                  </h3>
                  <ul className="space-y-3">
                    {result.mitigation_checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[350px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Site Risk Analysis</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Fill in the project location, start schedule, and structural parameters to assess site risks.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
