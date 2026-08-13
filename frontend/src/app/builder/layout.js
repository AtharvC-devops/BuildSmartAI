"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  Users,
  Hammer,
  ShieldAlert,
  FileText,
  Flag,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";

const builderLinks = [
  { href: "/builder",                     label: "Overview",             icon: LayoutDashboard },
  { href: "/builder/cost-prediction",     label: "Cost Prediction",      icon: DollarSign },
  { href: "/builder/time-prediction",     label: "Time Prediction",      icon: Clock },
  { href: "/builder/resource-allocation", label: "Resource Allocation",  icon: Users },
  { href: "/builder/material-sourcing",   label: "Material Sourcing",    icon: Hammer },
  { href: "/builder/risk-advisor",        label: "Risk Advisor",         icon: ShieldAlert },
  { href: "/builder/daily-logs",          label: "Daily Logs",           icon: FileText },
  { href: "/builder/project-milestones",  label: "Project Milestones",   icon: Flag },
];

export default function BuilderLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <ProtectedRoute allowedRole="builder">
      <div className="flex min-h-screen bg-[#f8fafc]">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={`fixed top-0 left-0 bottom-0 z-40 bg-[#0f172a] text-white flex flex-col transition-all duration-300 ${
            collapsed ? "w-[72px]" : "w-[260px]"
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5 shrink-0">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              {!collapsed && <span className="font-bold text-base tracking-tight text-white">BuildSmart AI</span>}
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {!collapsed && (
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-1">
                <span>Builder Workspace</span>
              </div>
            )}
            <ul className="space-y-1">
              {builderLinks.map((link) => {
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

          {/* Bottom User Info & Logout */}
          <div className="px-3 py-4 border-t border-white/5 space-y-2 shrink-0">
            {!collapsed ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    {user?.avatar || "B"}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-white truncate">{user?.name || "Builder User"}</div>
                    <div className="text-[10px] text-emerald-400 font-medium capitalize truncate">{user?.company || "Builder"}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                title="Logout"
                className="w-full flex justify-center py-2.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-xs"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!collapsed && "Collapse Sidebar"}
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ───────────────────────────────────── */}
        <main
          className={`flex-1 transition-all duration-300 ${
            collapsed ? "ml-[72px]" : "ml-[260px]"
          }`}
        >
          {/* Header */}
          <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-30">
            <div>
              <h1 className="text-lg font-bold text-slate-900 capitalize">
                {pathname === "/builder"
                  ? "Builder Overview"
                  : pathname.split("/").pop()?.replace(/-/g, " ") || "Builder Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Role: Builder
              </span>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
