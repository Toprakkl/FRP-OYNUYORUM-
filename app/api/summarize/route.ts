import { askSummary, humanizeGeminiError } from "@/lib/gemini";
import { cleanModel } from "@/lib/storage";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  summary: z.string().max(4000).optional(),
  recent: z.string().min(1).max(12000),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Özet isteği bozuk" }, { status: 400 });
  const apiKey = (parsed.data.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return Response.json({ error: "Anahtar yok" }, { status: 400 });
  const model = cleanModel(parsed.data.model || process.env.GEMINI_MODEL);
  try {
    const summary = await askSummary(apiKey, model, parsed.data.summary ?? "", parsed.data.recent);
    return Response.json({ summary });
  } catch (err) {
    return Response.json({ error: humanizeGeminiError(err, apiKey) }, { status: 502 });
  }
}
