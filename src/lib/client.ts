"use client";

// 前端統一 fetch 包裝，回傳 { ok, data } 或丟出錯誤訊息
export async function api<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const msg = json.error || `請求失敗 (${res.status})`;
    const err = new Error(msg) as Error & { details?: unknown; status?: number };
    err.details = json.details;
    err.status = res.status;
    throw err;
  }
  return json.data as T;
}
