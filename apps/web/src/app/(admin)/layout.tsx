"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  BarChart3,
  FileText,
  LogOut,
  Shield,
  Users,
  Wallet,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { useEffect } from "react";

const NAV = [
  { href: "/admin",            label: "Dashboard",   icon: BarChart3,    exact: true },
  { href: "/admin/users",      label: "Usuários",    icon: Users },
  { href: "/admin/kyc",        label: "KYC",         icon: CheckSquare },
  { href: "/admin/withdrawals",label: "Saques",      icon: Wallet },
  { href: "/admin/content",    label: "Conteúdo",    icon: FileText },
  { href: "/admin/reports",    label: "Denúncias",   icon: AlertTriangle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=/admin");
    }
    if (!isLoading && isAuthenticated && user?.role !== "ADMIN") {
      router.push("/feed");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") return null;

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-700">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Admin</p>
            <p className="text-xs text-gray-500">Inti.mate</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-red-700/20 text-red-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-800 p-3">
          <p className="mb-2 truncate px-2 text-xs text-gray-500">@{user.username}</p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
