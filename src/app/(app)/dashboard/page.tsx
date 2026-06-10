import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TX_LABEL, type TxType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instrumentCount, archivedCount, packCount, lowStock, recentTx, totalQty] =
    await Promise.all([
      prisma.instrument.count({ where: { status: "ACTIVE" } }),
      prisma.instrument.count({ where: { status: "ARCHIVED" } }),
      prisma.pack.count(),
      prisma.instrument.findMany({
        where: { status: "ACTIVE", quantity: { lte: 2 } },
        orderBy: { quantity: "asc" },
        take: 8,
        select: { code: true, name: true, quantity: true, unit: true },
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { operator: { select: { displayName: true } } },
      }),
      prisma.instrument.aggregate({
        where: { status: "ACTIVE" },
        _sum: { quantity: true },
      }),
    ]);

  const stats = [
    { label: "啟用器械", value: instrumentCount, href: "/instruments" },
    { label: "庫存總量", value: totalQty._sum.quantity ?? 0, href: "/instruments" },
    { label: "盤包數", value: packCount, href: "/packs" },
    { label: "已封存", value: archivedCount, href: "/instruments?status=ARCHIVED" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">總覽</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card hover:shadow-md">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">低庫存提醒（≤ 2）</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400">目前無低庫存器械</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((i) => (
                <li key={i.code} className="flex justify-between py-2 text-sm">
                  <Link
                    href={`/instruments/${i.code}`}
                    className="text-brand hover:underline"
                  >
                    {i.code} · {i.name}
                  </Link>
                  <span className="font-medium text-rose-600">
                    {i.quantity} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">近期交易</h2>
          {recentTx.length === 0 ? (
            <p className="text-sm text-slate-400">尚無交易紀錄</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentTx.map((t) => (
                <li key={t.id} className="flex justify-between py-2 text-sm">
                  <span>
                    <span className="font-mono text-xs text-slate-400">
                      {t.serial}
                    </span>{" "}
                    <span className="badge bg-slate-100 text-slate-600">
                      {TX_LABEL[t.type as TxType]}
                    </span>{" "}
                    {t.instrumentCode}
                  </span>
                  <span className="text-slate-400">
                    {t.operator?.displayName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
