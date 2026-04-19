"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, DollarSign, BarChart3, ArrowRight, Shield, Sparkles, Clock } from "lucide-react";
import { getServices } from "@/lib/api";

const fadeIn = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.1 } },
});

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
            <motion.div key={service.id} {...fadeIn(i)} className="glass-card p-5">
              <div className="text-3xl mb-3">{service.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{service.name}</h3>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">{service.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ₹{(service.minBudget / 100000).toFixed(0)}L – ₹{(service.maxBudget / 100000).toFixed(0)}L</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
