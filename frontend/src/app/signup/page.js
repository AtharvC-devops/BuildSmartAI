"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Building2, Home, Building, LandPlot, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [builderScale, setBuilderScale] = useState("MID");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup({
        name,
        email,
        password,
        builderScale,
        companyName: companyName || `${name}'s Construction`
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-2">
          <Building2 className="w-8 h-8 text-blue-500" />
          <span>BuildSmart<span className="text-blue-500">AI</span></span>
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Create Builder Account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Register a clean empty account to manage projects & daily logs in SQL database
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full relative z-10">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Infra Ltd."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="builder@domain.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Builder Scale Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Select Your Builder Scale Tier
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SMALL SCALE */}
                <div
                  onClick={() => setBuilderScale("SMALL")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    builderScale === "SMALL"
                      ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-white"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Home className={`w-5 h-5 ${builderScale === "SMALL" ? "text-emerald-400" : "text-slate-400"}`} />
                    <span className="font-bold text-sm">Small Scale</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Up to 2 active projects. Essential site logging & BOQ.</p>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-emerald-300 w-fit">
                    Home & Small Contractors
                  </span>
                </div>

                {/* MID SCALE */}
                <div
                  onClick={() => setBuilderScale("MID")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    builderScale === "MID"
                      ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 text-white"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building className={`w-5 h-5 ${builderScale === "MID" ? "text-blue-400" : "text-slate-400"}`} />
                    <span className="font-bold text-sm">Mid Scale</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Up to 10 active projects. RA Billing & Sourcing.</p>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-blue-300 w-fit">
                    Commercial & Multi-Unit
                  </span>
                </div>

                {/* LARGE SCALE */}
                <div
                  onClick={() => setBuilderScale("LARGE")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    builderScale === "LARGE"
                      ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500 text-white"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <LandPlot className={`w-5 h-5 ${builderScale === "LARGE" ? "text-purple-400" : "text-slate-400"}`} />
                    <span className="font-bold text-sm">Large Scale</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Unlimited projects. Full AI Risk & Compliance.</p>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-purple-300 w-fit">
                    Enterprise Infrastructure
                  </span>
                </div>
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
              <span>
                New accounts are initialized with a <strong>clean empty database state</strong>. You will be able to add your own projects, BOQs, and daily site logs directly stored in SQL!
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Clean Builder Account"}
            </button>
          </form>

          <div className="pt-4 text-center border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Already have an account or want to try pre-seeded dummy accounts?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4">
                Sign In Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
