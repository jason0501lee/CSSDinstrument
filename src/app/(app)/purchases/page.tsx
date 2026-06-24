"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { PurchaseBatch } from "@/lib/types";

type Row = PurchaseBatch & {
  instrument: { code: string; name: string; unit: string };
};
type Report = {
  batches: Row[];
  summary: { count: number; totalQty: number; totalAmount: number };
};

const money = (n: number) =>
  `$${n.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;

export default function PurchasesPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [f, setF] = useState({ q: "", vendor: "", from: "", to: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => v && sp.set(k, v));
      setReport(await api<Report>(`/api/purchases?${sp.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [f]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = report?.batches ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">進貨 / 採購查詢</h1>

      {/* 統計卡 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">進貨筆數</p>
          <p className="mt-1 text-2xl font-bold text-brand">
            {report?.summary.count ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">總進貨量</p>
          <p className="mt-1 text-2xl font-bold text-brand">
            {report?.summary.totalQty ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">總金額</p>
          <p className="mt-1 text-2xl font-bold text-brand">
            {money(report?.summary.totalAmount ?? 0)}
          </p>
        </div>
      </div>

      {/* 篩選 */}
      <div className="card grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2">
          <label className="label">關鍵字（器械 / 品名 / 廠商 / 單號 / 料號 / LOT）</label>
          <input
            className="input"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
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
        <div className="col-span-2 md:col-span-4">
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
              <th className="px-4 py-3">進貨日期</th>
              <th className="px-4 py-3">器械</th>
              <th className="px-4 py-3">廠商</th>
              <th className="px-4 py-3">單號 / 料號 / LOT</th>
              <th className="px-4 py-3 text-right">數量</th>
              <th className="px-4 py-3 text-right">單價</th>
              <th className="px-4 py-3 text-right">金額</th>
              <th className="px-4 py-3">效期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  查無進貨資料
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{b.receivedDate.slice(0, 10)}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/instruments/${b.instrument.code}`}
                      className="text-brand hover:underline"
                    >
                      <span className="font-mono">{b.instrument.code}</span>{" "}
                      {b.instrument.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{b.vendor ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {[b.orderNo, b.partNo, b.lotNo].filter(Boolean).join(" / ") ||
                      "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{b.quantity}</td>
                  <td className="px-4 py-2 text-right">{money(b.unitPrice)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {money(b.amount)}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {b.expiryDate ? b.expiryDate.slice(0, 10) : "—"}
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
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-slate-400">查無進貨資料</p>
        ) : (
          rows.map((b) => (
            <div key={b.id} className="card space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {b.receivedDate.slice(0, 10)}
                </span>
                <span className="font-medium text-slate-700">
                  {money(b.amount)}
                </span>
              </div>
              <Link
                href={`/instruments/${b.instrument.code}`}
                className="block text-brand hover:underline"
              >
                <span className="font-mono">{b.instrument.code}</span>{" "}
                {b.instrument.name}
              </Link>
              <p className="text-xs text-slate-400">
                {b.vendor && `${b.vendor} · `}進 {b.quantity} {b.instrument.unit} ×{" "}
                {money(b.unitPrice)}
              </p>
              <p className="text-xs text-slate-400">
                {[
                  b.orderNo && `單號 ${b.orderNo}`,
                  b.partNo && `料號 ${b.partNo}`,
                  b.lotNo && `LOT ${b.lotNo}`,
                  b.expiryDate && `效期 ${b.expiryDate.slice(0, 10)}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
