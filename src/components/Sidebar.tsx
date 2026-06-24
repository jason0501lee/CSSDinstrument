"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { ROLE_LABEL, type SafeUser } from "@/lib/types";
import { can } from "@/lib/permissions";

type NavItem = { href: string; label: string; show: boolean };

export function Sidebar({ user }: { user: SafeUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    { href: "/dashboard", label: "總覽", show: true },
    { href: "/instruments", label: "器械管理", show: true },
    { href: "/packs", label: "盤包配包", show: true },
    { href: "/purchases", label: "進貨採購", show: true },
    { href: "/transactions", label: "交易查詢", show: true },
    { href: "/audit", label: "我的操作紀錄", show: true },
    { href: "/users", label: "用戶管理", show: can(user.role, "user:manage") },
  ];

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items
        .filter((i) => i.show)
        .map((i) => {
          const active = pathname === i.href || pathname.startsWith(i.href + "/");
          return (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {i.label}
            </Link>
          );
        })}
    </nav>
  );

  const userBox = (
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
  );

  return (
    <>
      {/* 手機頂部列 + 漢堡 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <h1 className="text-base font-bold text-brand">手術器械管理系統</h1>
        <button
          aria-label="開啟選單"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* 手機抽屜 */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h1 className="text-base font-bold text-brand">手術器械管理系統</h1>
              <button
                aria-label="關閉選單"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {nav}
            {userBox}
          </aside>
        </div>
      )}

      {/* 桌面固定側欄 */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-base font-bold leading-tight text-brand">
            手術器械
            <br />
            管理系統
          </h1>
        </div>
        {nav}
        {userBox}
      </aside>
    </>
  );
}
