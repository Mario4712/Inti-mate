"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import api from "@/lib/api";

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])/,
      "Use maiúsculas, minúsculas, números e um caractere especial",
    ),
});

type FormValues = z.infer<typeof schema>;

export default function ConfirmPasswordChangePage() {
  return (
    <Suspense>
      <ConfirmPasswordChangeForm />
    </Suspense>
  );
}

function ConfirmPasswordChangeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [showPwd, setShowPwd] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.post("/auth/change-password/confirm", { token, newPassword: values.newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (e: any) {
      setServerError(e?.response?.data?.message ?? "Token inválido ou expirado");
    }
  }

  if (!token) {
    return (
      <div className="card text-center">
        <p className="text-red-400 text-sm">Link inválido ou expirado.</p>
        <a href="/login" className="mt-4 inline-block text-sm text-purple-400 hover:underline">Voltar ao login</a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card text-center">
        <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Senha alterada!</h2>
        <p className="text-gray-400 text-sm">Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-white mb-1">Confirmar nova senha</h1>
      <p className="text-gray-400 text-sm mb-6">Digite sua nova senha para finalizar a alteração.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="label">Nova senha</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              className="input pr-10"
              placeholder="Mín. 8 caracteres"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && <p className="error-message">{errors.newPassword.message}</p>}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Confirmar nova senha"}
        </button>
      </form>
    </div>
  );
}
