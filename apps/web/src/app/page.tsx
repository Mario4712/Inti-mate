"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(user?.role === "CREATOR" ? "/dashboard" : "/feed");
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <span className="text-xl font-bold text-brand-500">Inti.mate</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm">
            Entrar
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Criar conta
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Conecte-se com seus{" "}
          <span className="text-brand-500">criadores favoritos</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400 sm:text-xl">
          Conteúdo exclusivo, mensagens privadas, lives interativas e muito mais.
          Uma plataforma feita para criadores e fãs.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Comece agora
          </Link>
          <Link href="/discover" className="btn-secondary px-8 py-3 text-base">
            Explorar criadores
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-sm text-gray-500 sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <span>&copy; {new Date().getFullYear()} Inti.mate</span>
          <Link href="/termos" className="hover:text-gray-300">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-gray-300">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
