import type { Role } from "@prisma/client";

// 角色權限矩陣
// ADMIN    — 全部功能（含用戶資料維護、交易資料維護）
// OPERATOR — 作業類（建檔/增加/減損/盤包/配包/解包）+ 查詢類
// READONLY — 僅查詢類

export type Capability =
  | "instrument:read"
  | "instrument:write" // 建檔/增加/減損/封存
  | "pack:read"
  | "pack:write" // 盤包維護/配包/解包
  | "transaction:read"
  | "transaction:edit" // 交易資料維護（管理員限定）
  | "audit:read:self"
  | "audit:read:all"
  | "user:manage"; // 用戶資料維護（管理員限定）

const MATRIX: Record<Role, Capability[]> = {
  ADMIN: [
    "instrument:read",
    "instrument:write",
    "pack:read",
    "pack:write",
    "transaction:read",
    "transaction:edit",
    "audit:read:self",
    "audit:read:all",
    "user:manage",
  ],
  OPERATOR: [
    "instrument:read",
    "instrument:write",
    "pack:read",
    "pack:write",
    "transaction:read",
    "audit:read:self",
  ],
  READONLY: [
    "instrument:read",
    "pack:read",
    "transaction:read",
    "audit:read:self",
  ],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

export const roleLabel: Record<Role, string> = {
  ADMIN: "管理員",
  OPERATOR: "作業人員",
  READONLY: "唯讀人員",
};
