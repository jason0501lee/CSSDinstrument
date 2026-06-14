"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { TX_LABEL, type PurchaseBatch, type TxType } from "@/lib/types";

type Detail = {
  code: string;
  name: string;
  englishName: string | null;
  brand: string | null;
  model: string | null;
  origin: string | null;
  departmentCode: string;
  categoryCode: string;
  commonCode: string | null;
  propertyNo: string | null;
  unit: string;
  quantity: number;
  status: string;
  note: string | null;
  department: { name: string };
  category: { name: string };
  batches: PurchaseBatch[];
  transactions: {
    id: string;
    serial: string;
    type: TxType;
    quantityChange: number;
    beforeQty: number | null;
    afterQty: number | null;
    reason: string | null;
    note: string | null;
    createdAt: string;
    operator: { displayName: string };
  }[];
};

type Action = "add" | "reduce" | "edit" | "purchase";

export default function InstrumentDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Detail>(`/api/instruments/${code}`));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <div className="card text-rose-600">
        {error}{" "}
        <Link href="/instruments" className="text-brand underline">
          返回清單
        </Link>
      </div>
    );
  if (!data) return <p className="text-slate-400">載入中…</p>;

  const archived = data.status === "ARCHIVED";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/instruments" className="text-sm text-slate-400 hover:underline">
          ← 器械清單
        </Link>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-slate-800">
                {data.code}
              </h1>
              {archived ? (
                <span className="badge bg-slate-200 text-slate-600">已封存</span>
              ) : (
                <span className="badge bg-emerald-100 text-emerald-700">啟用</span>
              )}
            </div>
            <p className="mt-1 text-lg text-slate-700">
              {data.name}
              {data.englishName && (
                <span className="ml-2 text-sm text-slate-400">
                  {data.englishName}
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {data.department.name} / {data.category.name}
              {data.brand && ` · 廠牌 ${data.brand}`}
              {data.model && ` · 型號 ${data.model}`}
              {data.origin && ` · 產地 ${data.origin}`}
              {data.propertyNo && ` · 財產編號 ${data.propertyNo}`}
              {data.commonCode && ` · 共同碼 ${data.commonCode}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">目前庫存</p>
            <p className="text-3xl font-bold text-brand">
              {data.quantity}{" "}
              <span className="text-base font-normal text-slate-400">
                {data.unit}
              </span>
            </p>
          </div>
        </div>

        {!archived && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button className="btn-primary" onClick={() => setAction("purchase")}>
              進貨
            </button>
            <button className="btn-ghost" onClick={() => setAction("add")}>
              增加
            </button>
            <button className="btn-ghost" onClick={() => setAction("reduce")}>
              減損
            </button>
            <button className="btn-ghost" onClick={() => setAction("edit")}>
              編輯
            </button>
            <ArchiveButton code={code} onDone={load} />
          </div>
        )}
      </div>

      {/* 進貨批次 */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-700">
          進貨批次{" "}
          <span className="text-sm font-normal text-slate-400">
            （{data.batches.length} 筆 · 報廢核賠可查當初單價）
          </span>
        </h2>
        {data.batches.length === 0 ? (
          <p className="text-sm text-slate-400">尚無進貨紀錄</p>
        ) : (
          <div className="space-y-2">
            {data.batches.map((b) => (
              <div
                key={b.id}
                className="rounded-md border border-slate-100 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">
                    {b.receivedDate.slice(0, 10)} · 進 {b.quantity} {data.unit}
                  </span>
                  <span className="text-slate-600">
                    單價 ${b.unitPrice} · 金額 ${b.amount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {[
                    b.vendor && `廠商 ${b.vendor}`,
                    b.orderNo && `單號 ${b.orderNo}`,
                    b.partNo && `料號 ${b.partNo}`,
                    b.lotNo && `LOT ${b.lotNo}`,
                    b.expiryDate && `效期 ${b.expiryDate.slice(0, 10)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                  {b.note && ` · ${b.note}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="px-4 pt-4 font-semibold text-slate-700">交易紀錄</h2>
        <table className="mt-2 hidden w-full text-sm md:table">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">交易序號</th>
              <th className="px-4 py-2">類型</th>
              <th className="px-4 py-2 text-right">異動</th>
              <th className="px-4 py-2 text-right">前 → 後</th>
              <th className="px-4 py-2">說明</th>
              <th className="px-4 py-2">操作人 / 時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-mono text-xs">{t.serial}</td>
                <td className="px-4 py-2">
                  <span className="badge bg-slate-100 text-slate-600">
                    {TX_LABEL[t.type]}
                  </span>
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
                <td className="px-4 py-2 text-right text-slate-500">
                  {t.beforeQty} → {t.afterQty}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {[t.reason, t.note].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {t.operator.displayName}
                  <br />
                  <span className="text-xs">
                    {new Date(t.createdAt).toLocaleString("zh-TW")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 手機：交易卡片 */}
        <div className="space-y-2 p-3 md:hidden">
          {data.transactions.length === 0 ? (
            <p className="py-4 text-center text-slate-400">尚無交易紀錄</p>
          ) : (
            data.transactions.map((t) => (
              <div key={t.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-400">
                    {t.serial}
                  </span>
                  <span className="badge bg-slate-100 text-slate-600">
                    {TX_LABEL[t.type]}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {t.beforeQty} → {t.afterQty}
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
                  <p className="mt-1 text-sm text-slate-500">
                    {[t.reason, t.note].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {t.operator.displayName} ·{" "}
                  {new Date(t.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {action === "purchase" && (
        <PurchaseModal
          code={code}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            load();
          }}
        />
      )}
      {action && action !== "purchase" && (
        <ActionModal
          code={code}
          mode={action}
          current={data}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ArchiveButton({ code, onDone }: { code: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function archive() {
    if (
      !confirm(
        "確定封存此器械？將一鍵歸零庫存並標記為已封存，歷史紀錄仍可查詢，但不可再異動。"
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/instruments/${code}/archive`, { method: "POST" });
      onDone();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="btn-danger ml-auto" disabled={busy} onClick={archive}>
      {busy ? "封存中…" : "封存器械"}
    </button>
  );
}

function PurchaseModal({
  code,
  onClose,
  onDone,
}: {
  code: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    receivedDate: today,
    quantity: 1,
    unitPrice: 0,
    vendor: "",
    orderNo: "",
    partNo: "",
    lotNo: "",
    expiryDate: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amount = Math.round(form.quantity * form.unitPrice * 100) / 100;

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await api(`/api/instruments/${code}/batches`, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="card max-h-full w-full max-w-lg space-y-3 overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800">
          新增進貨 · <span className="font-mono">{code}</span>
        </h2>
        <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          進貨後將自動把數量加入庫存，並產生「進貨」交易序號。
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">進貨日期</label>
            <input
              type="date"
              className="input"
              value={form.receivedDate}
              onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">廠商（供應商）</label>
            <input
              className="input"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </div>
          <div>
            <label className="label">數量</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">單價</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={form.unitPrice}
              onChange={(e) =>
                setForm({ ...form, unitPrice: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">訂購單號</label>
            <input
              className="input"
              value={form.orderNo}
              onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">料號（院內物料號）</label>
            <input
              className="input"
              value={form.partNo}
              onChange={(e) => setForm({ ...form, partNo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">LOT 批號</label>
            <input
              className="input"
              value={form.lotNo}
              onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">效期</label>
            <input
              type="date"
              className="input"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label">備註（選填）</label>
          <input
            className="input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <p className="text-right text-sm text-slate-500">
          金額：<span className="font-semibold text-slate-700">${amount}</span>
        </p>
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
            disabled={busy || form.quantity < 1 || !form.receivedDate}
            onClick={save}
          >
            {busy ? "處理中…" : "確認進貨"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  code,
  mode,
  current,
  onClose,
  onDone,
}: {
  code: string;
  mode: "add" | "reduce" | "edit";
  current: Detail;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("SCRAP");
  const [batchId, setBatchId] = useState("");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState({
    name: current.name,
    englishName: current.englishName ?? "",
    brand: current.brand ?? "",
    model: current.model ?? "",
    origin: current.origin ?? "",
    propertyNo: current.propertyNo ?? "",
    commonCode: current.commonCode ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "add") {
        await api(`/api/instruments/${code}/add`, {
          method: "POST",
          body: JSON.stringify({ quantity: qty, note }),
        });
      } else if (mode === "reduce") {
        await api(`/api/instruments/${code}/reduce`, {
          method: "POST",
          body: JSON.stringify({ quantity: qty, reason, batchId: batchId || null, note }),
        });
      } else {
        await api(`/api/instruments/${code}`, {
          method: "PATCH",
          body: JSON.stringify(edit),
        });
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "add" ? "器械增加" : mode === "reduce" ? "器械減損" : "編輯器械資料";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="card max-h-full w-full max-w-md space-y-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800">
          {title} · <span className="font-mono">{code}</span>
        </h2>

        {mode !== "edit" && (
          <div>
            <label className="label">數量</label>
            <input
              type="number"
              min={1}
              className="input"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
            {mode === "reduce" && (
              <p className="mt-1 text-xs text-slate-400">
                目前庫存 {current.quantity}，扣除後為{" "}
                {current.quantity - qty}
              </p>
            )}
          </div>
        )}

        {mode === "reduce" && (
          <>
            <div>
              <label className="label">原因</label>
              <select
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="SCRAP">報廢</option>
                <option value="LOST">遺失</option>
                <option value="TRANSFER">移轉</option>
              </select>
            </div>
            {current.batches.length > 0 && (
              <div>
                <label className="label">對應進貨批次（核賠查價，選填）</label>
                <select
                  className="input"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                >
                  <option value="">不指定</option>
                  {current.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.receivedDate.slice(0, 10)} · 單價 ${b.unitPrice}
                      {b.lotNo ? ` · LOT ${b.lotNo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {mode === "edit" && (
          <div className="space-y-3">
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
              系統將自動產生 EDIT 交易序號並記錄變更前後值，無需手動查序號。
              器械編號為主鍵，不可更改。
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">中文品名</label>
                <input
                  className="input"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">英文品名</label>
                <input
                  className="input"
                  value={edit.englishName}
                  onChange={(e) =>
                    setEdit({ ...edit, englishName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">廠牌</label>
                <input
                  className="input"
                  value={edit.brand}
                  onChange={(e) => setEdit({ ...edit, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="label">型號 / 器械編號</label>
                <input
                  className="input"
                  value={edit.model}
                  onChange={(e) => setEdit({ ...edit, model: e.target.value })}
                />
              </div>
              <div>
                <label className="label">產地</label>
                <input
                  className="input"
                  value={edit.origin}
                  onChange={(e) => setEdit({ ...edit, origin: e.target.value })}
                />
              </div>
              <div>
                <label className="label">財產編號</label>
                <input
                  className="input"
                  value={edit.propertyNo}
                  onChange={(e) =>
                    setEdit({ ...edit, propertyNo: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="label">共同碼</label>
              <input
                className="input"
                value={edit.commonCode}
                onChange={(e) =>
                  setEdit({ ...edit, commonCode: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {mode !== "edit" && (
          <div>
            <label className="label">備註（選填）</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" disabled={busy} onClick={submit}>
            {busy ? "處理中…" : "確認"}
          </button>
        </div>
      </div>
    </div>
  );
}
