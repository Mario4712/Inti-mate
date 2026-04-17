"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import api from "@/lib/api";

type JobType = "background" | "effect" | "scene";

interface ContentGenJob {
  id: string;
  prompt: string;
  jobType: JobType;
  status: string;
  outputKey?: string;
  outputUrl?: string;
  rejectionReason?: string;
  createdAt: string;
}

const JOB_TYPE_INFO: Record<JobType, { label: string; description: string }> = {
  background: { label: "Fundo",       description: "Gera um novo fundo para o conteúdo" },
  effect:     { label: "Efeito",      description: "Aplica efeito visual sobre a mídia base" },
  scene:      { label: "Cena",        description: "Gera uma cena alternativa completa" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING:    { color: "text-yellow-400 bg-yellow-500/10", icon: <Clock size={12} />,         label: "Aguardando" },
  PROCESSING: { color: "text-blue-400 bg-blue-500/10",    icon: <Loader2 size={12} className="animate-spin" />, label: "Processando" },
  DONE:       { color: "text-green-400 bg-green-500/10",  icon: <CheckCircle size={12} />,   label: "Concluído" },
  FAILED:     { color: "text-red-400 bg-red-500/10",      icon: <XCircle size={12} />,       label: "Falhou" },
  MODERATION: { color: "text-orange-400 bg-orange-500/10",icon: <Eye size={12} />,           label: "Em moderação" },
};

export default function ContentGenPage() {
  const [jobs, setJobs] = useState<ContentGenJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ContentGenJob | null>(null);

  const [form, setForm] = useState({
    prompt: "",
    jobType: "background" as JobType,
    inputKey: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/content-gen?page=${page}&limit=20`)
      .then((r) => {
        setJobs(r.data.items ?? r.data ?? []);
        setTotal(r.data.pagination?.total ?? r.data?.length ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/content-gen", {
        prompt: form.prompt,
        jobType: form.jobType,
        inputKey: form.inputKey || undefined,
      });
      setForm((f) => ({ ...f, prompt: "", inputKey: "" }));
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao criar job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Geração de Conteúdo IA</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gere fundos, efeitos e cenas alternativas com IA. Limite: 20 jobs/dia.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" /> Novo job de geração
        </h2>

        {error && <p className="text-sm text-red-400 rounded-lg bg-red-900/20 px-3 py-2">{error}</p>}

        {/* Job type */}
        <div>
          <label className="mb-2 block text-xs text-gray-400">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(JOB_TYPE_INFO) as JobType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, jobType: type }))}
                className={`flex flex-col items-center rounded-xl border p-3 text-center transition-colors ${
                  form.jobType === type
                    ? "border-purple-600 bg-purple-600/20 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className="text-sm font-medium">{JOB_TYPE_INFO[type].label}</span>
                <span className="text-xs text-gray-500 mt-0.5">{JOB_TYPE_INFO[type].description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Prompt de geração</label>
          <textarea
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            required
            rows={3}
            maxLength={1000}
            placeholder="Descreva o que deseja gerar..."
            className="w-full rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
          />
          <p className="mt-0.5 text-right text-xs text-gray-600">{form.prompt.length}/1000</p>
        </div>

        {/* Input key */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Chave S3 da mídia base (opcional)</label>
          <input
            value={form.inputKey}
            onChange={(e) => setForm((f) => ({ ...f, inputKey: e.target.value }))}
            placeholder="uploads/media/..."
            className="w-full rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Gerar conteúdo
        </button>
      </form>

      {/* Jobs list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Histórico de jobs</h2>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Sparkles size={32} className="mb-3 opacity-30" />
            <p>Nenhum job ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG["PENDING"];
              return (
                <div key={job.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-purple-400 bg-purple-500/10 rounded px-2 py-0.5">
                          {JOB_TYPE_INFO[job.jobType as JobType]?.label ?? job.jobType}
                        </span>
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">{job.prompt}</p>
                      <p className="mt-1 text-xs text-gray-600">{new Date(job.createdAt).toLocaleString("pt-BR")}</p>
                      {job.rejectionReason && (
                        <p className="mt-1 text-xs text-red-400">Rejeitado: {job.rejectionReason}</p>
                      )}
                    </div>

                    {job.status === "DONE" && job.outputUrl && (
                      <button
                        onClick={() => setPreview(job)}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-green-700/20 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-700/30"
                      >
                        <Eye size={12} /> Ver output
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">Output gerado</h2>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-300">
                <XCircle size={18} />
              </button>
            </div>
            <div className="rounded-xl bg-gray-800 overflow-hidden aspect-video flex items-center justify-center">
              {preview.outputUrl?.match(/\.(mp4|webm)/i) ? (
                <video src={preview.outputUrl} controls className="w-full h-full object-contain" />
              ) : (
                <img src={preview.outputUrl} alt="output" className="w-full h-full object-contain" />
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono break-all">{preview.outputUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
