"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, Sparkles, Loader2, MapPin, Layers, Building, Calendar, CheckCircle2, X } from "lucide-react";
import { predictCost, createProject } from "@/lib/api";

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

  // Booking states
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ name: "", location: "Mumbai", type: "Residential", description: "" });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookedProject, setBookedProject] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBookedProject(null);
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

  const handleBookProject = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      const project = await createProject({
        name: bookingForm.name,
        clientName: "Priya Sharma",
        clientId: 2,
        builderId: 1, // Rajesh Kumar
        budget: result.predicted_cost,
        location: bookingForm.location,
        area: parseFloat(form.area),
        floors: parseInt(form.floors),
        type: bookingForm.type,
        description: bookingForm.description || `${bookingForm.type} project requested by client Priya Sharma.`,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      setBookedProject(project);
      setShowBookModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setBookingLoading(false);
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
        <div className="lg:col-span-3 border-none">
          <AnimatePresence mode="wait">
            {bookedProject ? (
              <motion.div
                key="booked"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 text-center border-2 border-emerald-500 bg-emerald-50/10"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Project Request Submitted!</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  Your project <strong>{bookedProject.name}</strong> is now in <strong>Planning</strong> status. Builder Rajesh Kumar has been notified to allocate agents and launch construction.
                </p>
                <div className="p-3 bg-white/50 backdrop-blur rounded-xl text-xs text-slate-500 inline-block">
                  Project ID: #{bookedProject.id} • Budget: {formatINR(bookedProject.budget)} • Location: {bookedProject.location}
                </div>
              </motion.div>
            ) : result ? (
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

                  {/* Booking Trigger Button */}
                  <button
                    onClick={() => {
                      setBookingForm({
                        name: `Villa in ${form.location_tier === "1" ? "Mumbai" : "Pune"}`,
                        location: form.location_tier === "1" ? "Mumbai" : "Pune",
                        type: "Residential",
                        description: `A beautiful ${form.area} sq ft house with ${form.floors} floor(s).`,
                      });
                      setShowBookModal(true);
                    }}
                    className="mt-5 w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Calendar className="w-4 h-4" /> Request Project Launch
                  </button>
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

      {/* Booking Form Modal Overlay */}
      <AnimatePresence>
        {showBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="font-bold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Book Construction Project
                </div>
                <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleBookProject} className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name</label>
                  <input
                    type="text"
                    required
                    className="input-field text-slate-900"
                    placeholder="e.g. Dream House"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
                    <input
                      type="text"
                      required
                      className="input-field text-slate-900"
                      value={bookingForm.location}
                      onChange={(e) => setBookingForm({ ...bookingForm, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Project Type</label>
                    <select
                      className="input-field text-slate-900 font-medium"
                      value={bookingForm.type}
                      onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })}
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="input-field text-slate-900 py-2.5 resize-none"
                    placeholder="Brief description of your requirements..."
                    value={bookingForm.description}
                    onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                  />
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Budget</span>
                    <span className="font-semibold text-slate-800">{formatINR(result.predicted_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dimensions</span>
                    <span className="font-semibold text-slate-800">{form.area} sq ft, {form.floors} Floors</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {bookingLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Sparkles className="w-4 h-4" /> Submit Launch Request</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
