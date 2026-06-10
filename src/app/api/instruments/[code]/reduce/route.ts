import { reduceStockSchema } from "@/lib/validation";
import { applyStockChange } from "@/lib/services/stock";
import { ok, handleError, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ code: string }> };

const REASON_LABEL: Record<string, string> = {
  SCRAP: "報廢",
  LOST: "遺失",
  TRANSFER: "移轉",
};

// POST /api/instruments/[code]/reduce — 器械減損作業（報廢/遺失/移轉）
export async function POST(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("instrument:write");
    const { code } = await params;
    const body = reduceStockSchema.parse(await req.json());

    const result = await applyStockChange({
      instrumentCode: code,
      delta: -body.quantity,
      type: "REDUCE",
      reason: REASON_LABEL[body.reason],
      note: body.note ?? null,
      operator,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
