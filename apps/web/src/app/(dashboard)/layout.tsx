"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  BarChart3,
  CalendarClock,
  CreditCard,
  ExternalLink,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  PackageOpen,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Users,
  Video,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",                   label: "Visão Geral",      icon: LayoutDashboard },
  { href: "/dashboard/content",           label: "Conteúdo",         icon: Upload },
  { href: "/dashboard/plans",             label: "Planos",           icon: PackageOpen },
  { href: "/dashboard/subscribers",       label: "Assinantes",       icon: Users },
  { href: "/creator/earnings",            label: "Receita",          icon: CreditCard },
  { href: "/dashboard/analytics",         label: "Analytics",        icon: BarChart3 },
  { href: "/dashboard/lives",             label: "Lives",            icon: Video },
  { href: "/messages",                    label: "Mensagens",        icon: MessageCircle },
  { href: "/dashboard/tournaments",       label: "Torneios",         icon: Trophy },
  { href: "/dashboard/scheduler",         label: "Agendador Social", icon: CalendarClock },
  { href: "/dashboard/content-gen",       label: "Geração IA",       icon: Sparkles },
  { href: "/dashboard/edit-suggestions",  label: "Sugestões",        icon: Lightbulb },
  { href: "/dashboard/verified-tier",     label: "Acesso Verificado",icon: ShieldCheck },
  { href: "/dashboard/settings",          label: "Configurações",    icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Client-side auth guard — redirects if not authenticated after loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
    return null;
  }

  // Only creators can access the dashboard
  if (user?.role !== "CREATOR") {
    if (typeof window !== "undefined") router.push("/feed");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar — hidden on mobile, shown on md+ */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-800 bg-gray-900 md:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
                <span className="text-sm font-bold text-white">I</span>
              </div>
              <span className="text-lg font-bold text-white">
                Inti<span className="text-purple-400">.mate</span>
              </span>
            </Link>
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-600/20 text-purple-300"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Back to feed */}
          <div className="px-3 pb-2">
            <Link
              href="/feed"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            >
              <ExternalLink size={15} />
              Ver como fã
            </Link>
          </div>

          {/* User section */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-gray-300">
                {user?.profile?.artisticName?.charAt(0)?.toUpperCase() ??
                  user?.email?.charAt(0)?.toUpperCase() ??
                  "U"}
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-gray-200">
                  {user?.profile?.artisticName ?? user?.username}
                </p>
                <p className="truncate text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600">
              <span className="text-xs font-bold text-white">I</span>
            </div>
            <span className="font-bold text-white">
              Inti<span className="text-purple-400">.mate</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/feed" className="rounded-lg p-2 text-gray-400 hover:text-gray-200" title="Ver como fã">
              <Home size={18} />
            </Link>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-200"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-800 bg-gray-900 md:hidden">
          {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                  isActive ? "text-purple-400" : "text-gray-500"
                }`}
              >
                <Icon size={18} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 md:p-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
