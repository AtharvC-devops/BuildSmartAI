"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getProjectSegmentConfig } from "@/lib/api";
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  Users,
  Search,
  Receipt,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Hammer,
  ShieldAlert,
  FileText,
  Flag,
  Sparkles,
  LogIn
} from "lucide-react";

const builderLinks = [
  { href: "/dashboard",                     label: "Overview",             icon: LayoutDashboard, featureKey: "dashboard" },
  { href: "/dashboard/cost-estimator",      label: "BOQ Estimator",        icon: DollarSign,      featureKey: "boq" },
  { href: "/dashboard/daily-logs",          label: "Daily Site Logs",      icon: FileText,        featureKey: "daily_logs" },
  { href: "/dashboard/project-milestones",  label: "Project Milestones",   icon: Flag,            featureKey: "projects" },
  { href: "/dashboard/material-sourcing",   label: "Material Rates",       icon: Hammer,          featureKey: "material_sourcing" },
  { href: "/dashboard/ra-billing",          label: "RA Billing",           icon: Receipt,         featureKey: "ra_billing" },
  { href: "/dashboard/muster-roll",         label: "Muster Roll",          icon: Users,           featureKey: "worker_allocation" },
  { href: "/dashboard/risk-advisor",        label: "Construction Risk Checklist", icon: ShieldAlert, featureKey: "risk_advisory" },
  { href: "/dashboard/cost-prediction",     label: "AI Cost Predictor",    icon: DollarSign,      featureKey: "boq", largeOnly: true },
  { href: "/dashboard/time-prediction",     label: "Time Prediction",      icon: Clock,           featureKey: "projects", largeOnly: true },
  { href: "/dashboard/resource-allocation", label: "Worker Allocation",   icon: Users,           featureKey: "worker_allocation", largeOnly: true },
];

const customerLinks = [
  { href: "/customer",          label: "Home",            icon: LayoutDashboard },
  { href: "/customer/search",   label: "Search Services", icon: Search },
  { href: "/customer/estimate", label: "Cost Estimate",   icon: Receipt },
  { href: "/customer/tracking", label: "Track Projects",  icon: BarChart3 },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, canAccessFeature } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    const storedLocale = localStorage.getItem("buildsmart_locale") || "en";
    setLocale(storedLocale);
  }, []);

  // Redirect unauthenticated users or client users away from builder dashboard
  useEffect(() => {
    if (!loading) {
      if (!user && pathname.startsWith("/dashboard")) {
        router.push("/login");
      } else if (user?.role === "client") {
        router.push("/client");
      }
    }
  }, [user, loading, pathname, router]);

  const scaleTier = user?.builderScale || "SMALL";
  const visibleLinks = builderLinks.filter(link => !link.largeOnly || scaleTier === "LARGE");
  const scaleColorMap = {
    SMALL: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    MID: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    LARGE: "bg-purple-500/20 text-purple-300 border-purple-500/30"
  };

  // Check authorization for current page
  const currentLink = builderLinks.find(l => l.href === pathname);
  const isAuthorized = !currentLink || (!currentLink.largeOnly || scaleTier === "LARGE") && canAccessFeature(currentLink.featureKey);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-[#0f172a] text-white flex flex-col transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-base tracking-tight">BuildSmart AI</span>}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Builder Section Header with Scale Badge */}
          {!collapsed && (
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
              <span>Builder Features</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${scaleColorMap[scaleTier]}`}>
                {scaleTier} SCALE
              </span>
            </div>
          )}
          <ul className="space-y-1 mb-6">
            {visibleLinks
              .filter((link) => canAccessFeature(link.featureKey))
              .map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`sidebar-link ${active ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                      title={collapsed ? link.label : undefined}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && link.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* User Account / Scale Info Bottom */}
        <div className="px-3 py-3 border-t border-white/5 space-y-2">
          {!collapsed && (
            <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.name ? user.name.charAt(0) : "B"}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-200 truncate">{user?.name || "Builder User"}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.companyName || "Construction Co."}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400">Scale Tier:</span>
                <span className="font-bold text-blue-400">{user?.builderScale || "SMALL"} Builder</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign Out / Change Account"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!collapsed && "Sign Out"}
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {pathname === "/dashboard"
                ? "Dashboard Overview"
                : pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
            </h1>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scaleColorMap[scaleTier]}`}>
              {scaleTier} SCALE BUILDER
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>

            <select
              className="bg-slate-100 border border-slate-200 text-xs font-bold px-2 py-1 rounded cursor-pointer"
              value={locale}
              onChange={(e) => {
                localStorage.setItem("buildsmart_locale", e.target.value);
                setLocale(e.target.value);
                window.dispatchEvent(new Event("languageChanged"));
              }}
            >
              <option value="en">English (EN)</option>
              <option value="hi">हिंदी (HI)</option>
              <option value="mr">मराठी (MR)</option>
            </select>
            <span className="text-xs text-slate-500 hidden md:block">SQLite DB Connected</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8">
          {isAuthorized ? (
            children
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-xl mx-auto mt-10 space-y-4 shadow-xl">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-lg">Module Access Restricted for {scaleTier} Scale</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                The module <strong>"{pathname.split("/").pop()?.replace(/-/g, " ")}"</strong> is reserved for <strong>Mid Scale</strong> or <strong>Large Scale</strong> builders.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="font-bold text-slate-700 uppercase tracking-wider">Upgrade Your Builder Scale</div>
                <p className="text-slate-600">
                  Switch account or re-register as a <strong>Mid Scale Builder</strong> or <strong>Large Scale Builder</strong> to unlock RA billing, worker allocation, material sourcing, and AI risk advisory!
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                Switch Builder Scale Account
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

