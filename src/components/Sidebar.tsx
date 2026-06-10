"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { ROLE_LABEL, type SafeUser } from "@/lib/types";
import { can } from "@/lib/permissions";

type NavItem = { href: string; label: string; show: boolean };

export function Sidebar({ user }: { user: SafeUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const items: NavItem[] = [
    { href: "/dashboard", label: "總覽", show: true },
    { href: "/instruments", label: "器械管理", show: true },
    { href: "/packs", label: "盤包配包", show: true },
    { href: "/transactions", label: "交易查詢", show: true },
    { href: "/audit", label: "我的操作紀錄", show: true },
    { href: "/users", label: "用戶管理", show: can(user.role, "user:manage") },
  ];

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h1 className="text-base font-bold leading-tight text-brand">
          手術器械
          <br />
          管理系統
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items
          .filter((i) => i.show)
          .map((i) => {
            const active =
              pathname === i.href || pathname.startsWith(i.href + "/");
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {i.label}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-slate-100 px-5 py-4 text-sm">
        <p className="font-medium text-slate-700">{user.displayName}</p>
        <p className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
        <button
          onClick={logout}
          className="mt-3 text-xs text-rose-500 hover:underline"
        >
          登出
        </button>
      </div>
    </aside>
  );
}
