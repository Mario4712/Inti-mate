"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  totpCode: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      const result = await login(values.email, values.password, values.totpCode);

      if (result.requiresTwoFactor) {
        setRequires2fa(true);
        return;
      }

      // Set session flag cookie for middleware (httpOnly: false, same-site)
      document.cookie = "has_session=1; path=/; max-age=604800; samesite=lax";

      // Role-based redirect: creators go to dashboard, fans go to feed
      if (redirect !== "/dashboard") {
        router.push(redirect);
      } else {
        router.push(result.role === "CREATOR" ? "/dashboard" : "/feed");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Credenciais inválidas";
      setServerError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-white mb-1">Entrar</h1>
      <p className="text-gray-400 text-sm mb-6">Bem-vindo de volta</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* E-mail */}
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

        {/* Senha */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label !mb-0" htmlFor="password">Senha</label>
            <a href="/forgot-password" className="text-xs text-brand-400 hover:underline">
              Esqueci a senha
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="input pr-10"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="error-message">{errors.password.message}</p>}
        </div>

        {/* Código 2FA (exibido apenas se necessário) */}
        {requires2fa && (
          <div>
            <label className="label" htmlFor="totpCode">
              Código de autenticação (2FA)
            </label>
            <input
              id="totpCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="input text-center tracking-widest text-lg"
              {...register("totpCode")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Abra seu aplicativo autenticador e insira o código de 6 dígitos.
            </p>
          </div>
        )}

        {/* Erro */}
        {serverError && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /> Entrando...</>
          ) : (
            "Entrar"
          )}
        </button>

        <p className="text-center text-sm text-gray-500">
          Não tem conta?{" "}
          <a href="/register" className="text-brand-400 hover:underline">
            Criar conta
          </a>
        </p>
      </form>
    </div>
  );
}
