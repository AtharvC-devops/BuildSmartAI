"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Building2, Loader2, ShieldAlert } from "lucide-react";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (allowedRole && user?.role !== allowedRole) {
        // Role mismatch: redirect to legitimate dashboard
        if (user?.role === "builder") {
          router.replace("/builder");
        } else if (user?.role === "client") {
          router.replace("/client");
        }
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRole, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 animate-bounce">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          Verifying Security Credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          Your current account role (<span className="text-emerald-400 font-semibold">{user?.role}</span>) does not have authorization to view this area. Redirecting to your assigned dashboard...
        </p>
      </div>
    );
  }

  return children;
}
