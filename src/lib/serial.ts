import type { Prisma } from "@prisma/client";

// 產生交易序號 "TX-YYYYMMDD-NNNN"
// 使用 SerialCounter 在同一個 DB transaction 內原子遞增，避免併發重號。
export async function nextSerial(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const key = `TX-${y}${m}${d}`;

  const counter = await tx.serialCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `${key}-${String(counter.value).padStart(4, "0")}`;
}
