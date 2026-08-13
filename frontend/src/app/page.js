"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  Building2,
  Zap,
  Shield,
  TrendingUp,
  CheckCircle2,
  LogOut,
  User,
  HardHat,
  UserCheck,
} from "lucide-react";

const features = [
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: "AI Cost Prediction",
    desc: "Random Forest ML model predicts construction costs with 90%+ accuracy based on area, materials, location, and floors.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Time Estimation",
    desc: "Get precise project timelines with phase-by-phase breakdowns powered by regression analysis.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Smart Resource Allocation",
    desc: "Auto-assign the best agents using a weighted scoring algorithm considering distance, rating, and skills.",
    color: "from-purple-500 to-pink-600",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Real-Time Dashboard",
    desc: "Monitor KPIs, budget usage, and project timelines with interactive charts and visualizations.",
    color: "from-amber-500 to-orange-600",
  },
];

const stats = [
  { value: "95%", label: "Prediction Accuracy" },
  { value: "40%", label: "Time Saved" },
  { value: "500+", label: "Projects Managed" },
  { value: "₹250Cr", label: "Budget Optimized" },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const dashboardRoute = user?.role === "builder" ? "/builder" : user?.role === "client" ? "/client" : "/login";

  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            BuildSmart AI
          </Link>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hidden md:block hover:text-white transition-colors">Features</a>
            <a href="#stats" className="hidden md:block hover:text-white transition-colors">Stats</a>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href={dashboardRoute}
                  className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {user.role === "builder" ? <HardHat className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  {user.role === "builder" ? "Builder Dashboard" : "Client Dashboard"}
                </Link>
                <button
                  onClick={logout}
                  title="Log Out"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" /> AI-Powered Role-Based Construction Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
              Build Smarter
              <br />
              <span className="gradient-text">with Artificial Intelligence</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Predict costs, estimate timelines, and allocate resources intelligently with a clean separation between Builder and Client workspaces.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {isAuthenticated ? (
              <Link
                href={dashboardRoute}
                className="px-8 py-3.5 rounded-xl gradient-primary text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
              >
                Go to {user?.role === "builder" ? "Builder Dashboard" : "Client Dashboard"} <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register?role=builder"
                  className="px-8 py-3.5 rounded-xl gradient-primary text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
                >
                  <HardHat className="w-5 h-5" /> Continue as Builder <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/register?role=client"
                  className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <UserCheck className="w-5 h-5" /> Continue as Client
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <section id="stats" className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center p-6 rounded-2xl bg-white/[0.03] border border-white/5"
            >
              <div className="text-3xl md:text-4xl font-black gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powered by <span className="gradient-text">Machine Learning</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every decision backed by data. Every prediction refined by AI models trained on real construction data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.color} mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">
            How It <span className="gradient-text">Works</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Authenticate Account", desc: "Log in or register as a Builder or Client with secure role-based access." },
              { step: "02", title: "Access Role Dashboard", desc: "Builders manage projects, logs, and milestones; Clients track project progress & AI estimates." },
              { step: "03", title: "Get Smart Insights", desc: "Receive accurate predictions for cost, timeline, and optimal resource allocations." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-10 rounded-3xl gradient-primary relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Smarter?</h2>
              <p className="text-emerald-100 mb-8 max-w-md mx-auto">
                Join builders and clients optimizing construction management with AI.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="px-8 py-3.5 rounded-xl bg-white text-emerald-700 font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2"
                >
                  Log In to Platform <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
                >
                  Create New Account
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="w-4 h-4" />
          <span className="font-semibold text-slate-400">BuildSmart AI</span>
        </div>
        © 2026 BuildSmart AI. Role-Based Authentication System.
      </footer>
    </div>
  );
}
