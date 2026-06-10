import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "./auth";
import { can, type Capability } from "./permissions";
import type { User } from "@prisma/client";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details: extra },
    { status }
  );
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail("輸入驗證失敗", 422, err.flatten().fieldErrors);
  }
  if (err instanceof HttpError) {
    return fail(err.message, err.status);
  }
  console.error(err);
  return fail("伺服器發生錯誤", 500);
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// 要求登入；未登入則丟出 401
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError("尚未登入", 401);
  return user;
}

// 要求登入 + 具備指定權限
export async function requireCapability(cap: Capability): Promise<User> {
  const user = await requireUser();
  if (!can(user.role, cap)) throw new HttpError("權限不足", 403);
  return user;
}
