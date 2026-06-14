"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { INSTRUMENT_CODE_REGEX } from "@/lib/validation";
import type { Category, Department, Instrument } from "@/lib/types";

export default function InstrumentsPage() {
  const params = useSearchParams();
  const [list, setList] = useState<Instrument[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [depts, setDepts] = useState<Department[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (status) sp.set("status", status);
      const data = await api<Instrument[]>(`/api/instruments?${sp.toString()}`);
      setList(data);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<{ departments: Department[]; categories: Category[] }>("/api/meta")
      .then((m) => {
        setDepts(m.departments);
        setCats(m.categories);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">器械管理</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 新器械建檔
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="label">
            全文搜尋（編號 / 中英品名 / 廠牌 / 型號 / 財產編號 / 共同碼 / 訂購單號 / 廠商 / 料號 / LOT）
          </label>
          <input
            className="input"
            placeholder="輸入關鍵字…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <div>
          <label className="label">狀態</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">啟用中</option>
            <option value="ARCHIVED">已封存</option>
          </select>
        </div>
        <button className="btn-ghost" onClick={load}>
          搜尋
        </button>
      </div>

      {/* 桌面：表格 */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">編號</th>
              <th className="px-4 py-3">品名</th>
              <th className="px-4 py-3">廠牌</th>
              <th className="px-4 py-3">科別 / 類別</th>
              <th className="px-4 py-3 text-right">庫存</th>
              <th className="px-4 py-3">狀態</th>
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
                  查無資料
                </td>
              </tr>
            ) : (
              list.map((i) => (
                <tr key={i.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/instruments/${i.code}`}
                      className="text-brand hover:underline"
                    >
                      {i.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{i.name}</td>
                  <td className="px-4 py-3 text-slate-500">{i.brand ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {i.department?.name ?? i.departmentCode} /{" "}
                    {i.category?.name ?? i.categoryCode}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {i.quantity} {i.unit}
                  </td>
                  <td className="px-4 py-3">
                    {i.status === "ARCHIVED" ? (
                      <span className="badge bg-slate-200 text-slate-600">已封存</span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-700">啟用</span>
                    )}
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
          <p className="py-8 text-center text-slate-400">查無資料</p>
        ) : (
          list.map((i) => (
            <Link
              key={i.code}
              href={`/instruments/${i.code}`}
              className="card flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-brand">{i.code}</p>
                <p className="truncate font-medium text-slate-800">{i.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {i.department?.name ?? i.departmentCode} /{" "}
                  {i.category?.name ?? i.categoryCode}
                  {i.brand && ` · ${i.brand}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-slate-800">
                  {i.quantity}
                  <span className="text-xs font-normal text-slate-400">
                    {" "}
                    {i.unit}
                  </span>
                </p>
                {i.status === "ARCHIVED" ? (
                  <span className="badge bg-slate-200 text-slate-600">已封存</span>
                ) : (
                  <span className="badge bg-emerald-100 text-emerald-700">啟用</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {showCreate && (
        <CreateModal
          depts={depts}
          cats={cats}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateModal({
  depts,
  cats,
  onClose,
  onCreated,
}: {
  depts: Department[];
  cats: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    englishName: "",
    brand: "",
    model: "",
    origin: "",
    propertyNo: "",
    commonCode: "",
    initialQty: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const codeValid = INSTRUMENT_CODE_REGEX.test(form.code.toUpperCase());
  const deptCode = form.code[0]?.toUpperCase();
  const catCode = form.code[1]?.toUpperCase();
  const deptName = depts.find((d) => d.code === deptCode)?.name;
  const catName = cats.find((c) => c.code === catCode)?.name;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api("/api/instruments", {
        method: "POST",
        body: JSON.stringify({ ...form, code: form.code.toUpperCase() }),
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-lg space-y-4">
        <h2 className="text-lg font-bold text-slate-800">新器械建檔</h2>
        <div>
          <label className="label">
            器械編號（首字母=科別、次字母=類別，建立後不可更改）
          </label>
          <input
            className="input font-mono uppercase"
            placeholder="如 GA001"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <p className="mt-1 text-xs">
            {form.code.length === 0 ? (
              <span className="text-slate-400">格式：兩個英文字母 + 2~6 位數字</span>
            ) : !codeValid ? (
              <span className="text-rose-500">格式錯誤（如 GA001）</span>
            ) : (
              <span className="text-emerald-600">
                科別 {deptCode}{deptName ? `（${deptName}）` : "（尚未建檔）"} · 類別{" "}
                {catCode}{catName ? `（${catName}）` : "（尚未建檔）"}
              </span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">中文品名</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">英文品名</label>
            <input
              className="input"
              value={form.englishName}
              onChange={(e) => setForm({ ...form, englishName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">廠牌（製造商）</label>
            <input
              className="input"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </div>
          <div>
            <label className="label">型號 / 器械編號</label>
            <input
              className="input"
              placeholder="如 1815-3218"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
          <div>
            <label className="label">產地</label>
            <input
              className="input"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
            />
          </div>
          <div>
            <label className="label">財產編號</label>
            <input
              className="input"
              value={form.propertyNo}
              onChange={(e) => setForm({ ...form, propertyNo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">共同碼（選填）</label>
            <input
              className="input"
              value={form.commonCode}
              onChange={(e) => setForm({ ...form, commonCode: e.target.value })}
            />
          </div>
          <div>
            <label className="label">初始庫存</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.initialQty}
              onChange={(e) =>
                setForm({ ...form, initialQty: Number(e.target.value) })
              }
            />
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
          <button
            className="btn-primary"
            disabled={saving || !codeValid || !form.name}
            onClick={save}
          >
            {saving ? "建檔中…" : "建檔"}
          </button>
        </div>
      </div>
    </div>
  );
}
