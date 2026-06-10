import { addStockSchema } from "@/lib/validation";
import { applyStockChange } from "@/lib/services/stock";
import { ok, handleError, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ code: string }> };

// POST /api/instruments/[code]/add — 器械增加作業
export async function POST(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("instrument:write");
    const { code } = await params;
    const body = addStockSchema.parse(await req.json());

    const result = await applyStockChange({
      instrumentCode: code,
      delta: body.quantity,
      type: "ADD",
      note: body.note ?? "器械增加作業",
      operator,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
