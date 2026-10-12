import { humanizeGeminiError, pingModel } from "@/lib/gemini";
import { cleanModel } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { apiKey?: string; model?: string; test?: boolean };
  const envKey = Boolean(process.env.GEMINI_API_KEY);
  const apiKey = (body.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!body.test) return Response.json({ hasEnvKey: envKey, ready: Boolean(apiKey) });
  if (!apiKey) return Response.json({ ok: false, error: "Anahtar yok. AI Studio'dan bir anahtar alıp buraya yapıştır." }, { status: 400 });
  try {
    const result = await pingModel(apiKey, cleanModel(body.model || process.env.GEMINI_MODEL));
    return Response.json({ ok: true, busy: result === "busy", hasEnvKey: envKey });
  } catch (err) {
    return Response.json({ ok: false, error: humanizeGeminiError(err, apiKey) }, { status: 400 });
  }
}
