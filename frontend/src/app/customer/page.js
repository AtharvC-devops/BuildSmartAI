"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, DollarSign, BarChart3, ArrowRight, Shield,
  Sparkles, Clock, Loader2, Layers, Building
} from "lucide-react";
import { getServices, predictCost, predictTime } from "@/lib/api";

const fadeIn = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.1 } },
});

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

function ServiceCard({ service, i }) {
  const [expanded, setExpanded] = useState(false);
  const [area, setArea] = useState(1500);
  const [quality, setQuality] = useState(2);
  const [floors, setFloors] = useState(1);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const handlePredict = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const location_tier = 2; // Standard urban
      const workers = 15;
      const complexity = service.category === "construction" ? 3 : 2;

      const [costRes, timeRes] = await Promise.all([
        predictCost({ area, material_quality: quality, location_tier, floors }),
        predictTime({ area, workers, complexity })
      ]);

      setPrediction({
        cost: costRes.predicted_cost,
        days: timeRes.estimated_days,
        confidence: (costRes.confidence + timeRes.confidence) / 2,
        fallback: costRes.fallback || timeRes.fallback,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeIn(i)} className="glass-card p-5 flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="text-3xl mb-3">{service.icon}</div>
        <h3 className="font-semibold text-slate-900 mb-1">{service.name}</h3>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">{service.description}</p>
        
        <AnimatePresence mode="wait">
          {!expanded ? (
            <motion.div
              key="static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 text-xs text-slate-400 mb-5"
            >
              <span className="flex items-center gap-1 font-medium">
                <DollarSign className="w-3.5 h-3.5" /> 
                {formatINR(service.minBudget)} – {formatINR(service.maxBudget)}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" /> {service.duration}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="interactive"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600"
            >
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Area: {area} sq ft</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="8000" 
                  step="100"
                  value={area} 
                  onChange={(e) => {
                    setArea(parseInt(e.target.value));
                    setPrediction(null);
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Quality</label>
                  <select 
                    value={quality} 
                    onChange={(e) => {
                      setQuality(parseInt(e.target.value));
                      setPrediction(null);
                    }}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-[11px]"
                  >
                    <option value={1}>Basic</option>
                    <option value={2}>Standard</option>
                    <option value={3}>Premium</option>
                    <option value={4}>Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Floors</label>
                  <select 
                    value={floors} 
                    onChange={(e) => {
                      setFloors(parseInt(e.target.value));
                      setPrediction(null);
                    }}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-[11px]"
                  >
                    <option value={1}>1 Floor</option>
                    <option value={2}>2 Floors</option>
                    <option value={3}>3 Floors</option>
                  </select>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handlePredict}
                disabled={loading}
                className="w-full py-2 rounded-lg gradient-primary text-white font-bold text-[10px] flex items-center justify-center gap-1 disabled:opacity-50 hover:opacity-95 transition-opacity"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Predict AI Quote
              </button>

              {prediction && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-slate-800"
                >
                  <div className="flex justify-between font-bold">
                    <span>AI Cost:</span>
                    <span className="text-emerald-700 font-black">{formatINR(prediction.cost)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>AI Timeline:</span>
                    <span>{prediction.days} days ({Math.round(prediction.days / 30)} mos)</span>
                  </div>
                  <div className="text-[9px] text-slate-400 text-right flex justify-between mt-1">
                    {prediction.fallback ? <span>⚠️ Fallback</span> : <span>🤖 Live ML Model</span>}
                    <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors text-xs font-bold flex items-center justify-center gap-1 mt-2"
      >
        {expanded ? "Show Standard Prices" : "Customize AI Quote"}
      </button>
    </motion.div>
  );
}

export default function CustomerHome() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    getServices().then(setServices).catch(console.error);
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden"
      >
        <div className="gradient-hero p-10 md:p-14 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_60%)]" />
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Build Your Dream <span className="gradient-text">with AI</span>
            </h1>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Get instant cost estimates, find the best construction services, and track your project progress — all powered by artificial intelligence.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/customer/estimate"
                className="px-6 py-2.5 rounded-xl gradient-primary text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
              >
                <Sparkles className="w-4 h-4" /> Get Cost Estimate
              </Link>
              <Link
                href="/customer/search"
                className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-medium flex items-center gap-2 hover:bg-white/15 transition-all text-sm"
              >
                <Search className="w-4 h-4" /> Browse Services
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: Search, title: "Find Services", desc: "Search by location and budget", href: "/customer/search", color: "from-blue-500 to-indigo-600" },
          { icon: DollarSign, title: "Cost Estimate", desc: "AI-powered instant prediction", href: "/customer/estimate", color: "from-emerald-500 to-teal-600" },
          { icon: BarChart3, title: "Track Project", desc: "Monitor progress in real-time", href: "/customer/tracking", color: "from-purple-500 to-pink-600" },
        ].map((item, i) => (
          <motion.div key={item.title} {...fadeIn(i)}>
            <Link href={item.href} className="glass-card p-6 flex items-start gap-4 group block">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-1">
                  {item.title}
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Available Services */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-5">Available Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} i={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
