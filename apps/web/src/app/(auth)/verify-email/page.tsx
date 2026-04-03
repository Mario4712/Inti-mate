"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de verificação ausente.");
      return;
    }

    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        setMessage("E-mail verificado com sucesso! Redirecionando...");
        setTimeout(() => router.push("/login"), 3000);
      })
      .catch((err: any) => {
        setStatus("error");
        const msg = err?.response?.data?.message;
        setMessage(Array.isArray(msg) ? msg.join(", ") : msg ?? "Token inválido ou expirado.");
      });
  }, [token, router]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
      <h1 className="text-2xl font-bold text-white">Verificação de E-mail</h1>

      {status === "loading" && (
        <div className="mt-8">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
          <p className="mt-4 text-gray-400">Verificando seu e-mail...</p>
        </div>
      )}

      {status === "success" && (
        <div className="mt-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40">
            <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mt-4 text-green-400">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-900/40">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="mt-4 text-red-400">{message}</p>
          <Link href="/login" className="mt-6 inline-block text-sm text-purple-400 hover:underline">
            Voltar para o login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
