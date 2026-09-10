"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Search,
  Receipt,
  BarChart3,
  ArrowLeft,
  User,
} from "lucide-react";

const links = [
  { href: "/customer",          label: "Home",            icon: LayoutDashboard },
  { href: "/customer/search",   label: "Search Services", icon: Search },
  { href: "/customer/estimate", label: "Cost Estimate",   icon: Receipt },
  { href: "/customer/tracking", label: "Track Projects",  icon: BarChart3 },
];

export default function CustomerLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              BuildSmart AI
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Builder Dashboard
            </Link>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              PS
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-1">
        <div className="flex items-center justify-around">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg text-xs ${
                  active ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <main className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
