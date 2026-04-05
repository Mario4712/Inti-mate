"use client";

import { useEffect, useState } from "react";
import { Bot, Save, Loader2, Plus, X, Check, ToggleLeft, ToggleRight } from "lucide-react";
import api from "@/lib/api";

interface FaqEntry { q: string; a: string; }
interface Persona {
  displayName: string;
  voiceTone: string;
  systemPrompt: string;
  faqEntries: FaqEntry[];
  enabled: boolean;
}

export default function AiPersonaConfigPage() {
  const [persona, setPersona] = useState<Persona>({
    displayName: "",
    voiceTone: "",
    systemPrompt: "",
    faqEntries: [],
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/ai-persona/creator/config")
      .then((r) => {
        if (r.data) setPersona({
          displayName: r.data.displayName ?? "",
          voiceTone: r.data.voiceTone ?? "",
          systemPrompt: r.data.systemPrompt ?? "",
          faqEntries: r.data.faqEntries ?? [],
          enabled: r.data.enabled ?? false,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateFaq(i: number, field: "q" | "a", val: string) {
    setPersona((p) => ({
      ...p,
      faqEntries: p.faqEntries.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
    }));
  }

  function addFaq() {
    if (persona.faqEntries.length >= 20) return;
    setPersona((p) => ({ ...p, faqEntries: [...p.faqEntries, { q: "", a: "" }] }));
  }

  function removeFaq(i: number) {
    setPersona((p) => ({ ...p, faqEntries: p.faqEntries.filter((_, idx) => idx !== i) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!persona.displayName.trim() || !persona.voiceTone.trim() || !persona.systemPrompt.trim()) {
      setError("Preencha nome, tom de voz e prompt do sistema.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.put("/ai-persona/creator/config", persona);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao salvar persona.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Bot size={24} className="text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">IA Persona</h1>
          <p className="text-sm text-gray-500">Configure um clone de IA que responde seus fãs automaticamente</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Persona ativa</p>
            <p className="text-xs text-gray-500">Quando ativa, a IA responde fãs no modo IA Chat</p>
          </div>
          <button
            type="button"
            onClick={() => setPersona((p) => ({ ...p, enabled: !p.enabled }))}
            className={`text-2xl transition-colors ${persona.enabled ? "text-purple-400" : "text-gray-600"}`}
          >
            {persona.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-gray-400">Nome da persona</label>
          <input
            value={persona.displayName}
            onChange={(e) => setPersona((p) => ({ ...p, displayName: e.target.value }))}
            maxLength={60}
            placeholder="Ex: Sofia IA"
            className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-gray-400">Tom de voz</label>
          <input
            value={persona.voiceTone}
            onChange={(e) => setPersona((p) => ({ ...p, voiceTone: e.target.value }))}
            maxLength={500}
            placeholder="Ex: Carinhosa, divertida e um pouco misteriosa"
            className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-gray-400">Prompt do sistema</label>
          <textarea
            value={persona.systemPrompt}
            onChange={(e) => setPersona((p) => ({ ...p, systemPrompt: e.target.value }))}
            maxLength={4000}
            rows={5}
            placeholder="Você é Sofia, uma criadora de conteúdo carinhosa e divertida. Você gosta de..."
            className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
          />
          <p className="mt-1 text-right text-xs text-gray-600">{persona.systemPrompt.length}/4000</p>
        </div>

        {/* FAQ entries */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-400">Perguntas frequentes (FAQ) — até 20</label>
            <button type="button" onClick={addFaq} disabled={persona.faqEntries.length >= 20}
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {persona.faqEntries.length === 0 && (
            <p className="text-xs text-gray-600">Adicione perguntas e respostas para a IA usar como base.</p>
          )}
          <div className="space-y-3">
            {persona.faqEntries.map((entry, i) => (
              <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">#{i + 1}</span>
                  <button type="button" onClick={() => removeFaq(i)} className="ml-auto text-gray-600 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={entry.q}
                  onChange={(e) => updateFaq(i, "q", e.target.value)}
                  maxLength={200}
                  placeholder="Pergunta"
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                />
                <textarea
                  value={entry.a}
                  onChange={(e) => updateFaq(i, "a", e.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Resposta"
                  className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Salvo!</> : <><Save size={16} /> Salvar persona</>}
        </button>
      </form>
    </div>
  );
}
