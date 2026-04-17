"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Bot,
  Compass,
  Glasses,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Moon,
  Radio,
  Search,
  Sun,
  Trophy,
  User,
  Wallet,
  BookImage,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTheme } from "@/contexts/theme-context";
import api from "@/lib/api";

interface SearchSuggestion {
  id: string;
  username: string;
  artisticName: string;
  avatarUrl: string | null;
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, toggleTheme } = useTheme();
  usePushNotifications();

  // Autocomplete with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search/creators?q=${encodeURIComponent(query.trim())}&limit=5`);
        const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setSuggestions(items.slice(0, 5));
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
  }

  function handleSuggestionClick(username: string) {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    router.push(`/creator/${username}`);
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
            <div ref={searchRef} className="relative w-full max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Buscar criadores..."
                className="w-full rounded-full bg-gray-800 py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={() => handleSuggestionClick(s.username)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                          {s.artisticName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-200">{s.artisticName}</p>
                          <p className="truncate text-xs text-gray-500">@{s.username}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 border-t border-gray-800 px-4 py-2 text-xs text-purple-400 hover:bg-gray-800 transition-colors"
                    >
                      <Search size={12} /> Ver todos os resultados para "{query}"
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
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
              { href: "/feed",        label: "Início",     icon: Home },
              { href: "/discover",    label: "Descobrir",  icon: Compass },
              { href: "/stories",     label: "Stories",    icon: BookImage },
              { href: "/tournaments", label: "Torneios",   icon: Trophy },
              { href: "/vr",          label: "VR",         icon: Glasses },
              { href: "/lives",       label: "Lives",      icon: Radio },
              { href: "/ai-chats",    label: "IA Chats",   icon: Bot },
              { href: "/messages",    label: "Mensagens",  icon: MessageCircle },
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
