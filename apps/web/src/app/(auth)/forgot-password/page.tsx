"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import api from "@/lib/api";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.post("/auth/forgot-password", values);
      setSent(true);
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="card text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-700 bg-green-900/30">
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Verifique seu e-mail</h2>
        <p className="text-sm text-gray-400">
          Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.
          O link expira em 1 hora.
        </p>
        <a href="/login" className="mt-6 inline-block text-sm text-brand-400 hover:underline">
          Voltar para o login
        </a>
      </div>
    );
  }

  return (
    <div className="card">
      <a href="/login" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={14} />
        Voltar
      </a>

      <h1 className="mb-1 text-2xl font-bold text-white">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-gray-400">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className="input"
            {...register("email")}
          />
          {errors.email && <p className="error-message">{errors.email.message}</p>}
        </div>

        {serverError && (
          <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /> Enviando...</>
          ) : (
            "Enviar link de redefinição"
          )}
        </button>
      </form>
    </div>
  );
}
