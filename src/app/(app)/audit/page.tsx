"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { AuditLog } from "@/lib/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<AuditLog[]>("/api/audit")
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">我的操作紀錄</h1>
        <p className="mt-1 text-sm text-slate-500">
          自助查閱您本人的所有操作（append-only 稽核日誌，不可竄改）。
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">時間</th>
              <th className="px-4 py-3">動作</th>
              <th className="px-4 py-3">對象</th>
              <th className="px-4 py-3">變更內容</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  載入中…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  尚無操作紀錄
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {new Date(l.createdAt).toLocaleString("zh-TW")}
                  </td>
                  <td className="px-4 py-2">
                    <span className="badge bg-slate-100 text-slate-600">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {l.entity} · {l.entityId}
                  </td>
                  <td className="px-4 py-2">
                    <ChangeView before={l.before} after={l.after} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChangeView({ before, after }: { before: unknown; after: unknown }) {
  if (!before && !after) return <span className="text-slate-300">—</span>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-brand">檢視前後值</summary>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <pre className="overflow-auto rounded bg-rose-50 p-2 text-rose-700">
          {JSON.stringify(before ?? null, null, 1)}
        </pre>
        <pre className="overflow-auto rounded bg-emerald-50 p-2 text-emerald-700">
          {JSON.stringify(after ?? null, null, 1)}
        </pre>
      </div>
    </details>
  );
}
