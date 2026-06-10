"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { INSTRUMENT_CODE_REGEX } from "@/lib/validation";
import type { PackItem } from "@/lib/types";

type PackDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  items: PackItem[];
};

export default function PackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [rows, setRows] = useState<{ instrumentCode: string; standardQty: number }[]>(
    []
  );
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<PackDetail>(`/api/packs/${id}`);
    setPack(data);
    setRows(
      data.items.map((i) => ({
        instrumentCode: i.instrumentCode,
        standardQty: i.standardQty,
      }))
    );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!pack) return <p className="text-slate-400">載入中…</p>;

  async function saveItems() {
    setMsg(null);
    setBusy(true);
    try {
      const clean = rows.filter((r) => r.instrumentCode.trim());
      for (const r of clean) {
        if (!INSTRUMENT_CODE_REGEX.test(r.instrumentCode.toUpperCase())) {
          throw new Error(`器械編號格式錯誤：${r.instrumentCode}`);
        }
      }
      await api(`/api/packs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: pack!.name,
          items: clean.map((r) => ({
            instrumentCode: r.instrumentCode.toUpperCase(),
            standardQty: r.standardQty,
          })),
        }),
      });
      setMsg({ type: "ok", text: "標準清單已儲存" });
      load();
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function assemble() {
    if (!confirm("執行配包將依標準清單扣除各器械庫存，確定？")) return;
    setMsg(null);
    setBusy(true);
    try {
      const res = await api<{ transactions: { length?: number }[] }>(
        `/api/packs/${id}/assemble`,
        { method: "POST", body: JSON.stringify({}) }
      );
      setMsg({
        type: "ok",
        text: `配包完成，產生 ${res.transactions.length} 筆交易紀錄`,
      });
      load();
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/packs" className="text-sm text-slate-400 hover:underline">
        ← 盤包清單
      </Link>

      <div className="card">
        <p className="font-mono text-sm text-slate-400">{pack.code}</p>
        <h1 className="text-xl font-bold text-slate-800">{pack.name}</h1>
        {pack.description && (
          <p className="mt-1 text-sm text-slate-500">{pack.description}</p>
        )}
      </div>

      {msg && (
        <p
          className={`rounded px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">標準清單</h2>
          <button
            className="btn-ghost"
            onClick={() =>
              setRows([...rows, { instrumentCode: "", standardQty: 1 }])
            }
          >
            + 新增一列
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">器械編號</th>
              <th className="py-2">現有庫存</th>
              <th className="py-2 w-32">標準用量</th>
              <th className="py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const stock = pack.items.find(
                (i) => i.instrumentCode === r.instrumentCode.toUpperCase()
              )?.instrument?.quantity;
              return (
                <tr key={idx}>
                  <td className="py-1 pr-2">
                    <input
                      className="input font-mono uppercase"
                      value={r.instrumentCode}
                      onChange={(e) => {
                        const next = [...rows];
                        next[idx].instrumentCode = e.target.value;
                        setRows(next);
                      }}
                    />
                  </td>
                  <td className="py-1 pr-2 text-slate-400">
                    {stock ?? "—"}
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={r.standardQty}
                      onChange={(e) => {
                        const next = [...rows];
                        next[idx].standardQty = Number(e.target.value);
                        setRows(next);
                      }}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      className="text-rose-500 hover:underline"
                      onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  尚無清單項目
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button className="btn-ghost" disabled={busy} onClick={saveItems}>
            儲存清單
          </button>
          <button
            className="btn-primary"
            disabled={busy || pack.items.length === 0}
            onClick={assemble}
          >
            執行配包
          </button>
        </div>
      </div>
    </div>
  );
}
