"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Users, Handshake, Loader2, Check, X, Plus, FileText,
  ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";

interface Creator {
  id: string;
  username: string;
  artisticName: string;
  avatarUrl: string | null;
  subscriberCount?: number;
  category?: string;
}

interface CollabMatch {
  id: string;
  status: "PENDING" | "MATCHED" | "REJECTED";
  creatorA: Creator;
  creatorB: Creator;
  createdAt: string;
}

interface Contract {
  id: string;
  title: string;
  description: string;
  revenueSharePct: number;
  durationDays: number;
  status: "DRAFT" | "PENDING_SIGNATURES" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  signedByA: boolean;
  signedByB: boolean;
  createdAt: string;
  match: { id: string };
}

type TabId = "suggestions" | "matches" | "pending" | "contracts";

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_SIGNATURES: "Aguardando assinaturas",
  ACTIVE: "Ativo",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

const CONTRACT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-gray-400",
  PENDING_SIGNATURES: "text-yellow-400",
  ACTIVE: "text-green-400",
  EXPIRED: "text-gray-600",
  CANCELLED: "text-red-400",
};

export default function CollabPage() {
  const [tab, setTab] = useState<TabId>("suggestions");
  const [myId, setMyId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Creator[]>([]);
  const [matches, setMatches] = useState<CollabMatch[]>([]);
  const [pending, setPending] = useState<CollabMatch[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // New contract form
  const [showContractForm, setShowContractForm] = useState<string | null>(null); // matchId
  const [contractForm, setContractForm] = useState({ title: "", description: "", revenueSharePct: "50", durationDays: "30" });
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError] = useState("");

  // Sign contract
  const [signingId, setSigningId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [signError, setSignError] = useState("");
  const [signSaving, setSignSaving] = useState(false);

  const [sendingInterest, setSendingInterest] = useState<string | null>(null);
  const [interestSent, setInterestSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get("/auth/me").then((r) => setMyId(r.data?.id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/collab/suggestions?limit=12").catch(() => ({ data: [] })),
      api.get("/collab/matches").catch(() => ({ data: [] })),
      api.get("/collab/pending").catch(() => ({ data: [] })),
      api.get("/collab/contracts").catch(() => ({ data: [] })),
    ]).then(([sRes, mRes, pRes, cRes]) => {
      setSuggestions(Array.isArray(sRes.data) ? sRes.data : sRes.data?.items ?? []);
      setMatches(Array.isArray(mRes.data) ? mRes.data : mRes.data?.items ?? []);
      setPending(Array.isArray(pRes.data) ? pRes.data : pRes.data?.items ?? []);
      setContracts(Array.isArray(cRes.data) ? cRes.data : cRes.data?.items ?? []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleInterest(targetId: string) {
    setSendingInterest(targetId);
    try {
      await api.post("/collab/interest", { targetId });
      setInterestSent((s) => new Set(s).add(targetId));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Erro ao enviar interesse.");
    } finally {
      setSendingInterest(null);
    }
  }

  async function handleReject(matchId: string) {
    await api.patch(`/collab/match/${matchId}/reject`).catch(() => {});
    setPending((prev) => prev.filter((m) => m.id !== matchId));
  }

  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault();
    if (!showContractForm) return;
    setContractError("");
    setContractSaving(true);
    try {
      const res = await api.post("/collab/contracts", {
        matchId: showContractForm,
        title: contractForm.title.trim(),
        description: contractForm.description.trim(),
        revenueSharePct: parseFloat(contractForm.revenueSharePct),
        durationDays: parseInt(contractForm.durationDays),
      });
      setContracts((prev) => [res.data, ...prev]);
      setShowContractForm(null);
      setContractForm({ title: "", description: "", revenueSharePct: "50", durationDays: "30" });
      setTab("contracts");
    } catch (e: any) {
      setContractError(e?.response?.data?.message ?? "Erro ao criar contrato.");
    } finally {
      setContractSaving(false);
    }
  }

  async function handleSign(contractId: string) {
    if (!otp.trim()) { setSignError("Informe o OTP."); return; }
    setSignSaving(true);
    setSignError("");
    try {
      await api.post(`/collab/contracts/${contractId}/sign`, { otp });
      setContracts((prev) => prev.map((c) => c.id === contractId ? { ...c, status: "ACTIVE" as any } : c));
      setSigningId(null);
      setOtp("");
    } catch (e: any) {
      setSignError(e?.response?.data?.message ?? "OTP inválido.");
    } finally {
      setSignSaving(false);
    }
  }

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: "suggestions", label: "Sugestões" },
    { id: "matches", label: "Matches", count: matches.length },
    { id: "pending", label: "Pendentes", count: pending.length },
    { id: "contracts", label: "Contratos", count: contracts.length },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Handshake size={24} className="text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Colaborações</h1>
          <p className="text-sm text-gray-500">Conecte-se com outros criadores e feche contratos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-900 p-1">
        {TABS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {/* Suggestions */}
          {tab === "suggestions" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.length === 0 && (
                <p className="col-span-2 py-8 text-center text-sm text-gray-600">Nenhuma sugestão disponível no momento.</p>
              )}
              {suggestions.map((creator) => {
                const sent = interestSent.has(creator.id);
                return (
                  <div key={creator.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-700">
                      {creator.avatarUrl ? (
                        <Image src={creator.avatarUrl} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400">
                          {creator.artisticName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{creator.artisticName}</p>
                      <p className="text-xs text-gray-500 truncate">@{creator.username}</p>
                      {creator.category && <p className="text-xs text-gray-600">{creator.category}</p>}
                    </div>
                    <button
                      onClick={() => handleInterest(creator.id)}
                      disabled={!!sendingInterest || sent}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        sent ? "bg-gray-800 text-gray-500" : "bg-purple-600 text-white hover:bg-purple-700"
                      } disabled:opacity-60`}
                    >
                      {sendingInterest === creator.id ? <Loader2 size={13} className="animate-spin" /> : sent ? "Enviado" : "Conectar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Matches */}
          {tab === "matches" && (
            <div className="space-y-3">
              {matches.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-600">Nenhum match ainda. Envie interesses para conectar-se!</p>
              )}
              {matches.map((match) => {
                const other = myId === match.creatorA.id ? match.creatorB : match.creatorA;
                return (
                  <div key={match.id} className="rounded-xl border border-green-700/30 bg-green-900/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-700">
                        {other.avatarUrl ? (
                          <Image src={other.avatarUrl} alt="" fill className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
                            {other.artisticName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{other.artisticName}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <Check size={11} /> Match ativo
                        </p>
                      </div>
                      <button
                        onClick={() => setShowContractForm(match.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-600/30"
                      >
                        <FileText size={13} /> Contrato
                      </button>
                    </div>

                    {/* Contract form inline */}
                    {showContractForm === match.id && (
                      <form onSubmit={handleCreateContract} className="mt-4 space-y-3 border-t border-gray-800 pt-4">
                        <p className="text-xs font-medium text-gray-400">Novo contrato de colaboração</p>
                        <input
                          value={contractForm.title}
                          onChange={(e) => setContractForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Título do contrato"
                          maxLength={120}
                          className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <textarea
                          value={contractForm.description}
                          onChange={(e) => setContractForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Descrição do acordo"
                          rows={2}
                          maxLength={2000}
                          className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Divisão de receita (%)</label>
                            <input
                              type="number" min="1" max="99"
                              value={contractForm.revenueSharePct}
                              onChange={(e) => setContractForm((f) => ({ ...f, revenueSharePct: e.target.value }))}
                              className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Duração (dias)</label>
                            <input
                              type="number" min="1" max="365"
                              value={contractForm.durationDays}
                              onChange={(e) => setContractForm((f) => ({ ...f, durationDays: e.target.value }))}
                              className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                        {contractError && <p className="text-xs text-red-400">{contractError}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={contractSaving}
                            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                            {contractSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                            Criar contrato
                          </button>
                          <button type="button" onClick={() => setShowContractForm(null)}
                            className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:bg-gray-800">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending */}
          {tab === "pending" && (
            <div className="space-y-3">
              {pending.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-600">Nenhum pedido pendente.</p>
              )}
              {pending.map((match) => {
                const other = myId === match.creatorA.id ? match.creatorB : match.creatorA;
                const isSender = myId === match.creatorA.id;
                return (
                  <div key={match.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-700 shrink-0">
                      {other.avatarUrl ? (
                        <Image src={other.avatarUrl} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
                          {other.artisticName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{other.artisticName}</p>
                      <p className="text-xs text-gray-500">
                        {isSender ? "Aguardando resposta" : "Quer colaborar com você"}
                      </p>
                    </div>
                    {!isSender && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleInterest(other.id)}
                          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600">
                          <Check size={13} />
                        </button>
                        <button onClick={() => handleReject(match.id)}
                          className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-red-900/30 hover:text-red-400">
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Contracts */}
          {tab === "contracts" && (
            <div className="space-y-3">
              {contracts.length === 0 && (
                <div className="py-8 text-center">
                  <FileText size={32} className="mx-auto mb-3 text-gray-700" />
                  <p className="text-sm text-gray-600">Nenhum contrato ainda. Crie um a partir de um match ativo.</p>
                </div>
              )}
              {contracts.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{c.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{c.description}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>{c.revenueSharePct}% divisão</span>
                        <span>{c.durationDays} dias</span>
                        <span className={CONTRACT_STATUS_COLOR[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</span>
                      </div>
                    </div>
                  </div>

                  {c.status === "PENDING_SIGNATURES" && (
                    <div className="mt-3 border-t border-gray-800 pt-3">
                      {signingId === c.id ? (
                        <div className="flex gap-2">
                          <input
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="OTP recebido por SMS"
                            className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <button onClick={() => handleSign(c.id)} disabled={signSaving}
                            className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                            {signSaving ? <Loader2 size={13} className="animate-spin" /> : "Assinar"}
                          </button>
                          <button onClick={() => { setSigningId(null); setOtp(""); }}
                            className="rounded-lg border border-gray-700 px-2 py-2 text-xs text-gray-400">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setSigningId(c.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300">
                          <FileText size={13} /> Assinar contrato via OTP
                        </button>
                      )}
                      {signError && signingId === c.id && <p className="mt-1 text-xs text-red-400">{signError}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
