"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { Pack } from "@/lib/types";

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setPacks(await api<Pack[]>("/api/packs"));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">盤包配包</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 新增盤包
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packs.map((p) => (
          <Link key={p.id} href={`/packs/${p.id}`} className="card hover:shadow-md">
            <p className="font-mono text-sm text-slate-400">{p.code}</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{p.name}</p>
            {p.description && (
              <p className="mt-1 text-sm text-slate-500">{p.description}</p>
            )}
            <p className="mt-3 text-sm text-brand">
              標準清單 {p._count?.items ?? 0} 項 →
            </p>
          </Link>
        ))}
        {packs.length === 0 && (
          <p className="text-sm text-slate-400">尚無盤包，請新增。</p>
        )}
      </div>

      {showCreate && (
        <CreatePackModal
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

function CreatePackModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await api("/api/packs", {
        method: "POST",
        body: JSON.stringify({ ...form, items: [] }),
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
        <h2 className="text-lg font-bold text-slate-800">新增盤包</h2>
        <div>
          <label className="label">盤包代碼</label>
          <input
            className="input"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div>
          <label className="label">盤包名稱</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">說明（選填）</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
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
          <button
            className="btn-primary"
            disabled={busy || !form.code || !form.name}
            onClick={save}
          >
            {busy ? "建立中…" : "建立"}
          </button>
        </div>
      </div>
    </div>
  );
}
