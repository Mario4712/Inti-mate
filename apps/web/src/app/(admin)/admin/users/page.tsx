"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Ban, CheckCircle, ChevronLeft, ChevronRight, Loader2, Search, Shield, UserCog } from "lucide-react";
import api from "@/lib/api";

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  artisticName: string;
  avatarUrl: string | null;
  kycStatus: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    "bg-red-500/20 text-red-400",
  MODERATOR:"bg-orange-500/20 text-orange-400",
  CREATOR:  "bg-purple-500/20 text-purple-400",
  CONSUMER: "bg-gray-700 text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-green-500/20 text-green-400",
  SUSPENDED: "bg-yellow-500/20 text-yellow-400",
  BANNED:    "bg-red-500/20 text-red-400",
};

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [q,      setQ]      = useState(searchParams.get("q")      ?? "");
  const [role,   setRole]   = useState(searchParams.get("role")   ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [page,   setPage]   = useState(Number(searchParams.get("page") ?? 1));

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError,   setActionError]   = useState("");

  const [showRoleModal,  setShowRoleModal]  = useState<UserRow | null>(null);
  const [showBanModal,   setShowBanModal]   = useState<UserRow | null>(null);
  const [banReason,      setBanReason]      = useState("");
  const [newRole,        setNewRole]        = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (q)      params.set("q",      q);
    if (role)   params.set("role",   role);
    if (status) params.set("status", status);

    api.get(`/admin/users?${params}`)
      .then((r) => {
        setUsers(r.data.items);
        setTotal(r.data.pagination.total);
        setPages(r.data.pagination.pages);
      })
      .finally(() => setLoading(false));
  }, [page, q, role, status]);

  useEffect(() => { load(); }, [load]);

  async function handleBan(user: UserRow) {
    if (!banReason.trim()) return;
    setActionLoading(user.id);
    setActionError("");
    try {
      await api.patch(`/admin/users/${user.id}/ban`, { reason: banReason });
      setShowBanModal(null);
      setBanReason("");
      load();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? "Erro");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnban(userId: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/unban`);
      load();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? "Erro");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleChangeRole(user: UserRow) {
    if (!newRole) return;
    setActionLoading(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      setShowRoleModal(null);
      setNewRole("");
      load();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? "Erro");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="mt-1 text-gray-400">{total} usuário{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por username ou email..."
            className="w-full rounded-lg bg-gray-800 pl-8 pr-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="">Todos os roles</option>
          <option value="CONSUMER">Consumer</option>
          <option value="CREATOR">Creator</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="BANNED">Banido</option>
        </select>
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{actionError}</p>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">KYC</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cadastro</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-600" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-500">Nenhum usuário encontrado</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="bg-gray-900/50 hover:bg-gray-900">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{u.artisticName || u.username}</p>
                    <p className="text-xs text-gray-500">@{u.username} · {u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-700 text-gray-400"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[u.status] ?? "bg-gray-700 text-gray-400"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${u.kycStatus === "APPROVED" ? "text-green-400" : u.kycStatus === "PENDING" ? "text-yellow-400" : u.kycStatus === "REJECTED" ? "text-red-400" : "text-gray-600"}`}>
                    {u.kycStatus ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {actionLoading === u.id ? (
                      <Loader2 size={14} className="animate-spin text-gray-500" />
                    ) : (
                      <>
                        <button
                          onClick={() => { setShowRoleModal(u); setNewRole(u.role); }}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-700 hover:text-gray-200"
                          title="Alterar role"
                        >
                          <UserCog size={14} />
                        </button>
                        {u.status === "BANNED" ? (
                          <button
                            onClick={() => handleUnban(u.id)}
                            className="rounded p-1.5 text-green-500 hover:bg-gray-700"
                            title="Desbanir"
                          >
                            <CheckCircle size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => { setShowBanModal(u); setBanReason(""); }}
                            className="rounded p-1.5 text-red-500 hover:bg-gray-700"
                            title="Banir"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">Página {page} de {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40 hover:border-gray-500">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40 hover:border-gray-500">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: alterar role */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-orange-400" />
              <h2 className="font-bold text-white">Alterar role</h2>
            </div>
            <p className="text-sm text-gray-400">Usuário: <span className="text-white">@{showRoleModal.username}</span></p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="CONSUMER">CONSUMER</option>
              <option value="CREATOR">CREATOR</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowRoleModal(null)} className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400 hover:border-gray-500">
                Cancelar
              </button>
              <button onClick={() => handleChangeRole(showRoleModal)} className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: banir */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Ban size={18} className="text-red-400" />
              <h2 className="font-bold text-white">Banir usuário</h2>
            </div>
            <p className="text-sm text-gray-400">Usuário: <span className="text-white">@{showBanModal.username}</span></p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Motivo do banimento (obrigatório)..."
              rows={3}
              className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBanModal(null)} className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400 hover:border-gray-500">
                Cancelar
              </button>
              <button onClick={() => handleBan(showBanModal)} disabled={!banReason.trim()}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                Banir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
