"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { TX_LABEL, type Transaction, type TxType } from "@/lib/types";

const TYPES: TxType[] = [
  "REGISTER",
  "ADD",
  "REDUCE",
  "PACK",
  "UNPACK",
  "ADJUST",
  "ARCHIVE",
  "EDIT",
];

export default function TransactionsPage() {
  const [list, setList] = useState<Transaction[]>([]);
  const [f, setF] = useState({ instrument: "", serial: "", type: "", from: "", to: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => v && sp.set(k, v));
      setList(await api<Transaction[]>(`/api/transactions?${sp.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [f]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">交易查詢</h1>

      <div className="card grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>
          <label className="label">器械編號</label>
          <input
            className="input font-mono"
            value={f.instrument}
            onChange={(e) => setF({ ...f, instrument: e.target.value })}
          />
        </div>
        <div>
          <label className="label">交易序號</label>
          <input
            className="input font-mono"
            value={f.serial}
            onChange={(e) => setF({ ...f, serial: e.target.value })}
          />
        </div>
        <div>
          <label className="label">類型</label>
          <select
            className="input"
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option value="">全部</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TX_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">起始日</label>
          <input
            type="date"
            className="input"
            value={f.from}
            onChange={(e) => setF({ ...f, from: e.target.value })}
          />
        </div>
        <div>
          <label className="label">結束日</label>
          <input
            type="date"
            className="input"
            value={f.to}
            onChange={(e) => setF({ ...f, to: e.target.value })}
          />
        </div>
        <div className="col-span-2 md:col-span-5">
          <button className="btn-primary" onClick={load}>
            查詢
          </button>
        </div>
      </div>

      {/* 桌面：表格 */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">交易序號</th>
              <th className="px-4 py-3">類型</th>
              <th className="px-4 py-3">器械</th>
              <th className="px-4 py-3 text-right">異動</th>
              <th className="px-4 py-3">說明</th>
              <th className="px-4 py-3">操作人 / 時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  載入中…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  查無交易
                </td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{t.serial}</td>
                  <td className="px-4 py-2">
                    <span className="badge bg-slate-100 text-slate-600">
                      {TX_LABEL[t.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {t.instrumentCode ? (
                      <Link
                        href={`/instruments/${t.instrumentCode}`}
                        className="text-brand hover:underline"
                      >
                        {t.instrumentCode}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      t.quantityChange > 0
                        ? "text-emerald-600"
                        : t.quantityChange < 0
                          ? "text-rose-600"
                          : "text-slate-400"
                    }`}
                  >
                    {t.quantityChange > 0 ? "+" : ""}
                    {t.quantityChange}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {[t.reason, t.note].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-400">
                    {t.operator?.displayName} ·{" "}
                    {new Date(t.createdAt).toLocaleString("zh-TW")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 手機：卡片 */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-slate-400">載入中…</p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-slate-400">查無交易</p>
        ) : (
          list.map((t) => (
            <div key={t.id} className="card space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-400">
                  {t.serial}
                </span>
                <span className="badge bg-slate-100 text-slate-600">
                  {TX_LABEL[t.type]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono">
                  {t.instrumentCode ? (
                    <Link
                      href={`/instruments/${t.instrumentCode}`}
                      className="text-brand hover:underline"
                    >
                      {t.instrumentCode}
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
                <span
                  className={`font-medium ${
                    t.quantityChange > 0
                      ? "text-emerald-600"
                      : t.quantityChange < 0
                        ? "text-rose-600"
                        : "text-slate-400"
                  }`}
                >
                  {t.quantityChange > 0 ? "+" : ""}
                  {t.quantityChange}
                </span>
              </div>
              {(t.reason || t.note) && (
                <p className="text-sm text-slate-500">
                  {[t.reason, t.note].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="text-xs text-slate-400">
                {t.operator?.displayName} ·{" "}
                {new Date(t.createdAt).toLocaleString("zh-TW")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
