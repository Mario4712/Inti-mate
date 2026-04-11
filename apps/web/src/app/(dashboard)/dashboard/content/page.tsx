"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Video, Check, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/api";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];

interface UploadedMedia {
  id: string;
  title: string | null;
  type: "PHOTO" | "VIDEO";
  status: string;
  thumbnailUrl: string | null;
  createdAt?: string;
}

export default function ContentUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mediaList, setMediaList] = useState<UploadedMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState("SUBSCRIBERS");
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/content/my")
      .then((r) => setMediaList(r.data?.items ?? (Array.isArray(r.data) ? r.data : [])))
      .catch(() => {})
      .finally(() => setLoadingMedia(false));
  }, []);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
    setError("");
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    setProgress(0);

    const results: UploadedMedia[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const { data } = await api.post(
          `/content/upload?visibility=${visibility}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
              const fileProgress = (i / files.length + (e.loaded / (e.total ?? 1)) / files.length) * 100;
              setProgress(Math.round(fileProgress));
            },
          },
        );

        if (title.trim() && data.id) {
          await api.patch(`/content/${data.id}`, { title: title.trim() });
          data.title = title.trim();
        }

        results.push(data);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Erro ao enviar arquivo";
        setError(Array.isArray(msg) ? msg.join(", ") : msg);
      }
    }

    setMediaList((prev) => [...results, ...prev]);
    setFiles([]);
    setTitle("");
    setProgress(100);
    setUploading(false);
  };

  async function handleDelete(id: string) {
    if (!confirm("Remover este arquivo?")) return;
    try {
      await api.delete(`/content/${id}`);
      setMediaList((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Erro ao remover arquivo");
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Upload de Conteúdo</h1>
      <p className="mt-1 text-gray-400">Envie fotos e vídeos para seus assinantes</p>

      {/* Drop zone */}
      <div
        className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 p-8 transition-colors hover:border-purple-600"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload size={40} className="text-gray-600" />
        <p className="mt-3 text-gray-400">Arraste arquivos aqui ou clique para selecionar</p>
        <p className="mt-1 text-xs text-gray-600">JPG, PNG, WebP, MP4, WebM (máx. 500MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
              {file.type.startsWith("video") ? (
                <Video size={20} className="text-blue-400" />
              ) : (
                <ImageIcon size={20} className="text-green-400" />
              )}
              <span className="flex-1 truncate text-sm text-gray-300">{file.name}</span>
              <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {files.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Título (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Título do conteúdo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Visibilidade</label>
            <select
              className="input"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="SUBSCRIBERS">Assinantes</option>
              <option value="PUBLIC">Público</option>
              <option value="PPV">Pay-per-view</option>
            </select>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-400">{progress}% enviado</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !uploading && (
        <button onClick={handleUpload} className="btn-primary mt-4">
          <Upload size={16} />
          Enviar {files.length} arquivo{files.length > 1 ? "s" : ""}
        </button>
      )}

      {/* Media list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Meus Arquivos</h2>
        {loadingMedia ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : mediaList.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-gray-800 py-10 text-center">
            <p className="text-gray-500 text-sm">Nenhum arquivo enviado ainda.</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mediaList.map((m) => (
              <div key={m.id} className="group rounded-xl border border-gray-800 bg-gray-900 p-4 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.type === "VIDEO" ? (
                      <Video size={16} className="shrink-0 text-blue-400" />
                    ) : (
                      <ImageIcon size={16} className="shrink-0 text-green-400" />
                    )}
                    <span className="text-sm font-medium text-gray-200 truncate">{m.title || "Sem título"}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="shrink-0 rounded p-1 text-gray-600 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span className="rounded bg-gray-800 px-1.5 py-0.5">{m.type}</span>
                  <span className={`rounded px-1.5 py-0.5 ${
                    m.status === "APPROVED" ? "bg-green-900/40 text-green-400"
                    : m.status === "REJECTED" ? "bg-red-900/40 text-red-400"
                    : "bg-gray-800 text-gray-400"
                  }`}>{m.status === "APPROVED" ? "Aprovado" : m.status === "PENDING_REVIEW" ? "Em revisão" : m.status === "REJECTED" ? "Rejeitado" : m.status}</span>
                </div>
                {m.createdAt && (
                  <p className="mt-1 text-xs text-gray-600">
                    {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
