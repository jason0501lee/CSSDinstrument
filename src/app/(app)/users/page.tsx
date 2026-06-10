"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ROLE_LABEL, type Role } from "@/lib/types";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setUsers(await api<UserRow[]>("/api/users"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (err)
    return <div className="card text-rose-600">{err}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">用戶管理</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 新增帳號
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">帳號</th>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-mono">{u.username}</td>
                <td className="px-4 py-3">{u.displayName}</td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">
                  {u.active ? (
                    <span className="badge bg-emerald-100 text-emerald-700">
                      啟用
                    </span>
                  ) : (
                    <span className="badge bg-slate-200 text-slate-600">停用</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "OPERATOR" as Role,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-slate-800">新增帳號</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">帳號</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">姓名</label>
            <input
              className="input"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">密碼</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">角色</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as Role })
              }
            >
              <option value="ADMIN">管理員</option>
              <option value="OPERATOR">作業人員</option>
              <option value="READONLY">唯讀人員</option>
            </select>
          </div>
        </div>
        {error && (
          <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" disabled={busy} onClick={save}>
            {busy ? "建立中…" : "建立"}
          </button>
        </div>
      </div>
    </div>
  );
}
