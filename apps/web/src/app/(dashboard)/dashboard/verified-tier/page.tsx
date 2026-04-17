"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

interface VerifiedStatus {
  hasAccess: boolean;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED" | null;
  grantedAt?: string;
}

const BENEFITS = [
  "Publicar conteúdo na seção Acesso Verificado",
  "Moderação humana reforçada (mais segurança para o criador)",
  "Badge exclusivo de Criador Verificado no perfil",
  "Destaque prioritário nas recomendações da plataforma",
];

export default function VerifiedTierPage() {
  const [status, setStatus] = useState<VerifiedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const r = await api.get("/verified-tier/status");
      setStatus(r.data);
    } catch {
      setMessage({ type: "error", text: "Erro ao carregar status." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  async function handleRequest() {
    setActionLoading(true);
    setMessage(null);
    try {
      const r = await api.post("/verified-tier/request");
      setMessage({ type: "success", text: r.data.message });
      await loadStatus();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.message ?? "Erro ao solicitar acesso." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Tem certeza que deseja revogar seu Acesso Verificado?")) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api.delete("/verified-tier/revoke");
      setMessage({ type: "success", text: "Acesso Verificado revogado com sucesso." });
      await loadStatus();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.message ?? "Erro ao revogar acesso." });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Acesso Verificado</h1>
        <p className="mt-1 text-gray-400 text-sm">
          Publique conteúdo exclusivo na seção premium da plataforma. Requer verificação de identidade (KYC) completa e aprovada.
        </p>
      </div>

      {/* Status card */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          <div className={`rounded-2xl border p-6 ${
            status?.hasAccess
              ? "border-green-700/50 bg-green-900/10"
              : status?.status === "SUSPENDED"
              ? "border-red-700/50 bg-red-900/10"
              : "border-gray-700 bg-gray-900"
          }`}>
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                status?.hasAccess ? "bg-green-500/20" : "bg-gray-700/50"
              }`}>
                {status?.hasAccess ? (
                  <ShieldCheck className="h-7 w-7 text-green-400" />
                ) : (
                  <ShieldOff className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white text-lg">
                  {status?.hasAccess
                    ? "Acesso Verificado ativo"
                    : status?.status === "SUSPENDED"
                    ? "Acesso suspenso"
                    : "Sem Acesso Verificado"}
                </p>
                <p className="text-sm text-gray-400">
                  {status?.hasAccess && status.grantedAt
                    ? `Ativo desde ${new Date(status.grantedAt).toLocaleDateString("pt-BR")}`
                    : status?.status === "SUSPENDED"
                    ? "Entre em contato com o suporte para reativar."
                    : "Complete o KYC para solicitar acesso."}
                </p>
              </div>
            </div>

            {message && (
              <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
              }`}>
                {message.type === "success"
                  ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
                  : <XCircle size={14} className="mt-0.5 shrink-0" />}
                {message.text}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              {!status?.hasAccess && status?.status !== "SUSPENDED" && (
                <button
                  onClick={handleRequest}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Solicitar Acesso Verificado
                </button>
              )}
              {status?.hasAccess && (
                <button
                  onClick={handleRevoke}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl border border-red-700/50 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                  Revogar acesso
                </button>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
            <h2 className="font-semibold text-white">Requisitos</h2>
            <div className="flex items-start gap-3 rounded-xl bg-yellow-900/10 border border-yellow-700/30 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-400" />
              <p className="text-sm text-yellow-300">
                É necessário ter a verificação de identidade (KYC) com documento e selfie <strong>aprovados</strong> para solicitar Acesso Verificado.
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
            <h2 className="font-semibold text-white">Benefícios</h2>
            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle size={14} className="shrink-0 text-purple-400" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Moderation notice */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
            <p className="text-xs text-gray-500">
              O Acesso Verificado <strong className="text-gray-400">não reduz</strong> a moderação de conteúdo. Todo conteúdo continua sujeito a scan CSAM obrigatório e revisão humana reforçada. O acesso pode ser revogado automaticamente se o KYC for cancelado ou rejeitado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
