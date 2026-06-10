"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { TX_LABEL, type TxType } from "@/lib/types";

type Detail = {
  code: string;
  name: string;
  brand: string | null;
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

export default function InstrumentDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<null | "add" | "reduce" | "edit">(null);

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
            <p className="mt-1 text-lg text-slate-700">{data.name}</p>
            <p className="mt-1 text-sm text-slate-400">
              {data.department.name} / {data.category.name}
              {data.brand && ` · ${data.brand}`}
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
            <button className="btn-primary" onClick={() => setAction("add")}>
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

      <div className="card overflow-x-auto p-0">
        <h2 className="px-4 pt-4 font-semibold text-slate-700">交易紀錄</h2>
        <table className="mt-2 w-full text-sm">
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
      </div>

      {action && (
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
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState({
    name: current.name,
    brand: current.brand ?? "",
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
          body: JSON.stringify({ quantity: qty, reason, note }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md space-y-4">
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
        )}

        {mode === "edit" && (
          <div className="space-y-3">
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
              系統將自動產生 EDIT 交易序號並記錄變更前後值，無需手動查序號。
              器械編號為主鍵，不可更改。
            </p>
            <div>
              <label className="label">品名</label>
              <input
                className="input"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">廠牌</label>
                <input
                  className="input"
                  value={edit.brand}
                  onChange={(e) => setEdit({ ...edit, brand: e.target.value })}
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
