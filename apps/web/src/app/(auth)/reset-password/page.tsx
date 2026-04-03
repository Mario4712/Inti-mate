"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">("form");
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Link Inválido</h1>
        <p className="mt-4 text-gray-400">O link de redefinição de senha é inválido ou expirou.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm text-purple-400 hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passwordRegex.test(password)) {
      setError("Senha deve ter 8+ caracteres com maiúscula, minúscula, número e especial (@$!%*?&^#).");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setStatus("loading");
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setStatus("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setStatus("form");
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg ?? "Token expirado ou inválido.");
    }
  };

  if (status === "success") {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40">
          <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">Senha Redefinida</h1>
        <p className="mt-2 text-gray-400">Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8">
      <h1 className="text-2xl font-bold text-white">Nova Senha</h1>
      <p className="mt-2 text-sm text-gray-400">Digite sua nova senha abaixo.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">Nova senha</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 caracteres"
            required
          />
        </div>
        <div>
          <label className="label">Confirmar senha</label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
          {status === "loading" ? "Redefinindo..." : "Redefinir Senha"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
