import { prisma } from "@/lib/prisma";
import { reduceStockSchema } from "@/lib/validation";
import { applyStockChange } from "@/lib/services/stock";
import { ok, fail, handleError, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ code: string }> };

const REASON_LABEL: Record<string, string> = {
  SCRAP: "報廢",
  LOST: "遺失",
  TRANSFER: "移轉",
};

// POST /api/instruments/[code]/reduce — 器械減損作業（報廢/遺失/移轉）
// 可選對應進貨批次，交易紀錄帶出當初 LOT 與單價（核賠查價）。
export async function POST(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("instrument:write");
    const { code } = await params;
    const body = reduceStockSchema.parse(await req.json());

    let batchNote = body.note ?? null;
    if (body.batchId) {
      const batch = await prisma.purchaseBatch.findUnique({
        where: { id: body.batchId },
      });
      if (!batch || batch.instrumentCode !== code)
        return fail("指定的進貨批次不存在或不屬於此器械", 422);
      batchNote =
        `${body.note ? `${body.note} · ` : ""}` +
        `核賠對應批次 單價 ${batch.unitPrice}` +
        `${batch.lotNo ? ` · LOT ${batch.lotNo}` : ""}`;
    }

    const result = await applyStockChange({
      instrumentCode: code,
      delta: -body.quantity,
      type: "REDUCE",
      reason: REASON_LABEL[body.reason],
      note: batchNote,
      batchId: body.batchId ?? null,
      operator,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
