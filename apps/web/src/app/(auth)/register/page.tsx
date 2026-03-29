"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])/,
      "Use maiúsculas, minúsculas, números e um caractere especial",
    ),
  cpf: z
    .string()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido")
    .transform((v) => v.replace(/\D/g, "")),
  artisticName: z.string().min(3).max(50).optional().or(z.literal("")),
  role: z.enum(["CONSUMER", "CREATOR"]).default("CONSUMER"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Aceite obrigatório" }) }),
  acceptPrivacyPolicy: z.literal(true, { errorMap: () => ({ message: "Aceite obrigatório" }) }),
  declareAdult: z.literal(true, { errorMap: () => ({ message: "Declaração obrigatória" }) }),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const role = watch("role");

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await authApi.register(values);
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Erro ao criar conta. Tente novamente.";
      setServerError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  }

  if (success) {
    return (
      <div className="card text-center">
        <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Verifique seu e-mail</h2>
        <p className="text-gray-400 text-sm">
          Enviamos um link de confirmação para o e-mail cadastrado. O link expira em 1 hora.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-white mb-1">Criar conta</h1>
      <p className="text-gray-400 text-sm mb-6">Comece gratuitamente</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Tipo de conta */}
        <div>
          <label className="label">Tipo de conta</label>
          <div className="grid grid-cols-2 gap-2">
            {(["CONSUMER", "CREATOR"] as const).map((r) => (
              <label
                key={r}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer text-sm font-medium transition-colors ${
                  role === r
                    ? "border-brand-500 bg-brand-600/20 text-brand-300"
                    : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                }`}
              >
                <input type="radio" value={r} {...register("role")} className="sr-only" />
                {r === "CONSUMER" ? "👤 Fã" : "🎬 Criador"}
              </label>
            ))}
          </div>
        </div>

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
          <label className="label" htmlFor="password">Senha</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
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

        {/* CPF */}
        <div>
          <label className="label" htmlFor="cpf">
            CPF <span className="text-gray-500">(verificação de maioridade)</span>
          </label>
          <input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            maxLength={14}
            className="input"
            {...register("cpf")}
          />
          {errors.cpf && <p className="error-message">{errors.cpf.message}</p>}
          <p className="mt-1 text-xs text-gray-600">
            Seu CPF é armazenado de forma criptografada e jamais é exibido publicamente.
          </p>
        </div>

        {/* Nome artístico (apenas criadores) */}
        {role === "CREATOR" && (
          <div>
            <label className="label" htmlFor="artisticName">Nome artístico</label>
            <input
              id="artisticName"
              type="text"
              placeholder="seu_nome_artistico"
              className="input"
              {...register("artisticName")}
            />
            {errors.artisticName && <p className="error-message">{errors.artisticName.message}</p>}
          </div>
        )}

        {/* Aceites obrigatórios */}
        <div className="space-y-3 pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            Declarações obrigatórias
          </p>

          {[
            {
              field: "declareAdult" as const,
              label: "Declaro que tenho 18 anos ou mais",
            },
            {
              field: "acceptTerms" as const,
              label: (
                <>
                  Li e aceito os{" "}
                  <a href="/termos" className="text-brand-400 hover:underline">
                    Termos de Uso
                  </a>
                </>
              ),
            },
            {
              field: "acceptPrivacyPolicy" as const,
              label: (
                <>
                  Li e aceito a{" "}
                  <a href="/privacidade" className="text-brand-400 hover:underline">
                    Política de Privacidade
                  </a>
                </>
              ),
            },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-brand-600 focus:ring-brand-500 focus:ring-offset-gray-950"
                {...register(field)}
              />
              <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
                {label}
              </span>
            </label>
          ))}

          {(errors.declareAdult || errors.acceptTerms || errors.acceptPrivacyPolicy) && (
            <p className="error-message">Todos os aceites são obrigatórios</p>
          )}
        </div>

        {/* Erro do servidor */}
        {serverError && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            {serverError}
          </div>
        )}

        {/* Botão */}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /> Criando conta...</>
          ) : (
            "Criar conta"
          )}
        </button>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <a href="/auth/login" className="text-brand-400 hover:underline">
            Entrar
          </a>
        </p>
      </form>
    </div>
  );
}
