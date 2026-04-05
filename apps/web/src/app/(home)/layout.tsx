"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Bell,
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Radio,
  Search,
  User,
  Wallet,
} from "lucide-react";
import { useState } from "react";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    return null;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
  }

  const isCreator = user?.role === "CREATOR";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/feed" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600">
              <span className="text-xs font-bold text-white">I</span>
            </div>
            <span className="hidden font-bold text-white sm:block">
              Inti<span className="text-purple-400">.mate</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center">
            <div className="relative w-full max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar criadores..."
                className="w-full rounded-full bg-gray-800 py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Link href="/notifications" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
              <Bell size={18} />
            </Link>
            <Link href="/messages" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
              <MessageCircle size={18} />
            </Link>
            {isCreator && (
              <>
                <Link href="/wallet" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200" title="Carteira">
                  <Wallet size={18} />
                </Link>
                <Link href="/dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200" title="Dashboard">
                  <LayoutDashboard size={18} />
                </Link>
              </>
            )}
            <Link href="/settings" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200" title="Configurações">
              <User size={18} />
            </Link>
            <button onClick={logout} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Bottom tabs */}
        <div className="flex border-t border-gray-800/50">
          <div className="mx-auto flex max-w-6xl w-full px-4">
            {[
              { href: "/feed", label: "Início", icon: Home },
              { href: "/discover", label: "Descobrir", icon: Compass },
              { href: "/lives", label: "Lives", icon: Radio },
              { href: "/messages", label: "Mensagens", icon: MessageCircle },
            ].map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
