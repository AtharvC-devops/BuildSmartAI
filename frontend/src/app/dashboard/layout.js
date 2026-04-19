"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const builderLinks = [
  { href: "/dashboard",                     label: "Overview",             icon: LayoutDashboard },
  { href: "/dashboard/cost-prediction",     label: "Cost Prediction",      icon: DollarSign },
  { href: "/dashboard/time-prediction",     label: "Time Prediction",      icon: Clock },
  { href: "/dashboard/resource-allocation", label: "Resource Allocation",  icon: Users },
];

const customerLinks = [
  { href: "/customer",          label: "Home",            icon: LayoutDashboard },
  { href: "/customer/search",   label: "Search Services", icon: Search },
  { href: "/customer/estimate", label: "Cost Estimate",   icon: Receipt },
  { href: "/customer/tracking", label: "Track Projects",  icon: BarChart3 },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
          {/* Builder Section */}
          {!collapsed && (
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Builder</div>
          )}
          <ul className="space-y-1 mb-6">
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

          {/* Customer Section */}
          {!collapsed && (
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Customer</div>
          )}
          <ul className="space-y-1">
            {customerLinks.map((link) => {
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

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                RK
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">Rajesh Kumar</div>
                <div className="text-[11px] text-slate-500">Builder Pro</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-sm"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && "Collapse"}
          </button>
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
          <div>
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {pathname === "/dashboard"
                ? "Dashboard Overview"
                : pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden md:block">AI Service Connected</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
