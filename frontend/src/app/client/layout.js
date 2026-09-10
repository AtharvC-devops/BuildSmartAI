"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Building2,
  LayoutDashboard,
  Search,
  Receipt,
  BarChart3,
  LogOut,
  UserCheck
} from "lucide-react";

const links = [
  { href: "/client",          label: "Home",            icon: LayoutDashboard },
  { href: "/client/search",   label: "Search Services", icon: Search },
  { href: "/client/estimate", label: "Cost Estimate",   icon: Receipt },
  { href: "/client/tracking", label: "Track Projects",  icon: BarChart3 },
];

export default function CustomerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <ProtectedRoute allowedRole="client">
      <div className="min-h-screen bg-[#f8fafc]">
        {/* Top Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/client" className="flex items-center gap-2 font-bold text-slate-900">
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
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-blue-900">{user?.name || "Client"}</span>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">(Client)</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
                    active ? "text-blue-600 font-bold" : "text-slate-400"
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
    </ProtectedRoute>
  );
}
