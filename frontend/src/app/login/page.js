"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Building2, AlertCircle, ArrowRight, HardHat, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userProfile = await login(email.trim(), password);
      if (userProfile?.role === "builder") {
        router.push("/builder");
      } else if (userProfile?.role === "client") {
        router.push("/client");
      } else {
        router.push("/dashboard/ra-billing");
      }
    } catch (err) {
      setError(err.message || "Invalid email or password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-2">
          <Building2 className="w-8 h-8 text-blue-500" />
          <span>BuildSmart<span className="text-blue-500">AI</span></span>
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Sign In to Account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your email and password to access your personalized workspace
        </p>
      </div>

      <div className="max-w-md mx-auto w-full relative z-10">
        {/* Credentials Form */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : "Sign In"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Need a Client account?
              </span>
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4">
                Register as Client
              </Link>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-emerald-400" /> Building Contractor?
              </span>
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4">
                Create Builder Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
