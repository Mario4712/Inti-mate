"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api, { authApi } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  role: "CONSUMER" | "CREATOR" | "MODERATOR" | "ADMIN";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  profile?: {
    artisticName?: string;
    avatarUrl?: string;
    bio?: string;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, totpCode?: string) => Promise<{ requiresTwoFactor?: boolean; role?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user from /auth/me
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      // Token invalid or expired — interceptor handles refresh
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string, totpCode?: string) => {
      const { data } = await authApi.login({ email, password, totpCode });

      if (data.requiresTwoFactor) {
        return { requiresTwoFactor: true };
      }

      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);

      // Fetch full user profile
      const { data: me } = await authApi.me();
      setUser(me);

      return { role: me.role };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — server might reject if token already expired
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    document.cookie = "has_session=; path=/; max-age=0";
    setUser(null);
    router.push("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refresh,
    }),
    [user, isLoading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
