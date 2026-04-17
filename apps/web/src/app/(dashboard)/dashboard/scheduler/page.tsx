"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar, Clock, Plus, X, Loader2, BarChart2, Lightbulb,
  Instagram, Twitter, Video,
} from "lucide-react";
import api from "@/lib/api";

type Platform = "INSTAGRAM" | "TWITTER_X" | "TIKTOK";

interface ScheduledPost {
  id: string;
  platform: Platform;
  caption: string;
  mediaUrl?: string;
  scheduledAt: string;
  status: string;
  clicks?: number;
}

interface SuggestedTime {
  hour: number;
  day: string;
  score: number;
}

interface PlatformReport {
  platform: string;
  clicks: number;
  posts: number;
}

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  INSTAGRAM: <Instagram size={14} />,
  TWITTER_X: <Twitter size={14} />,
  TIKTOK:    <Video size={14} />,
};

const PLATFORM_COLORS: Record<Platform, string> = {
  INSTAGRAM: "text-pink-400 bg-pink-400/10",
  TWITTER_X: "text-sky-400 bg-sky-400/10",
  TIKTOK:    "text-red-400 bg-red-400/10",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  "bg-blue-500/20 text-blue-400",
  PUBLISHED:  "bg-green-500/20 text-green-400",
  FAILED:     "bg-red-500/20 text-red-400",
  CANCELLED:  "bg-gray-500/20 text-gray-500",
};

const TABS = [
  { value: "posts",    label: "Posts",       icon: Calendar },
  { value: "report",   label: "Relatório",   icon: BarChart2 },
  { value: "suggest",  label: "Melhores horários", icon: Lightbulb },
];

export default function SchedulerPage() {
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [report, setReport] = useState<PlatformReport[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    platform: "INSTAGRAM" as Platform,
    caption: "",
    mediaUrl: "",
    scheduledAt: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(() => {
    setLoading(true);
    api.get("/scheduler/posts")
      .then((r) => setPosts(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPosts();
    api.get("/scheduler/report").then((r) => setReport(r.data ?? []));
    api.get("/scheduler/suggest").then((r) => setSuggestions(r.data ?? []));
  }, [loadPosts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/scheduler/posts", {
        platform: form.platform,
        caption: form.caption,
        mediaUrl: form.mediaUrl || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      setShowForm(false);
      setForm({ platform: "INSTAGRAM", caption: "", mediaUrl: "", scheduledAt: "" });
      loadPosts();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao agendar post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(postId: string) {
    setCancelling(postId);
    try {
      await api.patch(`/scheduler/posts/${postId}/cancel`);
      loadPosts();
    } catch {
      setError("Erro ao cancelar post.");
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendador Social</h1>
          <p className="mt-1 text-sm text-gray-400">Agende teasers para Instagram, X/Twitter e TikTok.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
        >
          <Plus size={15} /> Novo post
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <h2 className="font-semibold text-white">Agendar novo post</h2>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="grid grid-cols-3 gap-2">
            {(["INSTAGRAM", "TWITTER_X", "TIKTOK"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, platform: p }))}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  form.platform === p
                    ? "border-purple-600 bg-purple-600/20 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {PLATFORM_ICONS[p]}
                {p === "TWITTER_X" ? "X" : p === "TIKTOK" ? "TikTok" : "Instagram"}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Legenda</label>
            <textarea
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              required
              rows={3}
              maxLength={2200}
              placeholder="Texto do post..."
              className="w-full rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
            <p className="mt-0.5 text-right text-xs text-gray-600">{form.caption.length}/2200</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">URL da mídia (opcional)</label>
            <input
              type="url"
              value={form.mediaUrl}
              onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Data e hora</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              required
              className="w-full rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-700 py-2 text-sm text-gray-400 hover:border-gray-600">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-xl bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
              {submitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Agendar"}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setTab(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              tab === value ? "bg-purple-700 text-white" : "text-gray-400 hover:text-gray-200"
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {tab === "posts" && (
        loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Calendar size={32} className="mb-3 opacity-40" />
            <p>Nenhum post agendado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium shrink-0 ${PLATFORM_COLORS[post.platform]}`}>
                    {PLATFORM_ICONS[post.platform]}
                    {post.platform === "TWITTER_X" ? "X" : post.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 line-clamp-2">{post.caption}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={11} />{new Date(post.scheduledAt).toLocaleString("pt-BR")}</span>
                      <span className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[post.status] ?? "bg-gray-700 text-gray-400"}`}>{post.status}</span>
                    </div>
                  </div>
                  {post.status === "SCHEDULED" && (
                    <button onClick={() => handleCancel(post.id)} disabled={cancelling === post.id}
                      className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-red-900/20 hover:text-red-400">
                      {cancelling === post.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Report tab */}
      {tab === "report" && (
        <div className="space-y-3">
          {report.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Nenhum dado disponível ainda.</p>
          ) : (
            report.map((r) => (
              <div key={r.platform} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${PLATFORM_COLORS[r.platform as Platform] ?? "bg-gray-700 text-gray-400"}`}>
                    {PLATFORM_ICONS[r.platform as Platform]}
                    {r.platform === "TWITTER_X" ? "X" : r.platform}
                  </span>
                  <span className="text-sm text-gray-400">{r.posts} post{r.posts !== 1 ? "s" : ""}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{r.clicks.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-gray-500">cliques</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Suggestions tab */}
      {tab === "suggest" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Melhores horários para publicar baseados na atividade dos seus assinantes.</p>
          {suggestions.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Dados insuficientes para sugestões.</p>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{s.day}</p>
                  <p className="text-sm text-gray-500">{String(s.hour).padStart(2, "0")}:00</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-purple-600/30 overflow-hidden w-24">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, s.score)}%` }} />
                  </div>
                  <span className="text-xs text-purple-400 w-10 text-right">{s.score}%</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
