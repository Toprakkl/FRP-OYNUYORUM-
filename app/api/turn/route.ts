import { acceptCommands } from "@/lib/commands";
import { resolveDice } from "@/lib/dice";
import { fallbackTurn } from "@/lib/fallback";
import { askGameMaster, humanizeGeminiError } from "@/lib/gemini";
import { cleanModel, coerceGame } from "@/lib/storage";
import { STAT_KEYS, type StatKey } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  game: z.unknown(),
  message: z.string().trim().min(1).max(2000),
  dice: z
    .object({
      natural: z.number().int().min(1).max(20),
      stat: z.string().nullable(),
    })
    .nullable()
    .optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  narrator: z.enum(["gemini", "yerel"]).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "İstek okunamadı" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Eksik ya da uzun bir hamle" }, { status: 400 });
  const game = coerceGame(parsed.data.game);
  if (!game) return Response.json({ error: "Masa verisi bozuk" }, { status: 400 });

  const stat = parsed.data.dice?.stat;
  const statKey = stat && STAT_KEYS.includes(stat as StatKey) ? (stat as StatKey) : null;
  const dice = parsed.data.dice ? resolveDice(parsed.data.dice.natural, statKey, game.character.stats, game.settings.difficulty) : null;
  const apiKey = (parsed.data.apiKey || process.env.GEMINI_API_KEY || "").trim();
  const model = cleanModel(parsed.data.model || process.env.GEMINI_MODEL);
  const wantLocal = parsed.data.narrator === "yerel" || !apiKey;

  if (wantLocal) {
    const local = fallbackTurn(game, parsed.data.message, dice);
    const accepted = acceptCommands(local.commands, "ai", game.settings, 6);
    return Response.json({
      narrative: local.narrative,
      commands: accepted.commands,
      rejected: accepted.rejected,
      dice,
      narrator: "yerel",
      warning: parsed.data.narrator === "gemini" && !apiKey ? "API anahtarı yok. Bu turu yerel anlatıcı yazdı." : undefined,
    });
  }

  try {
    const master = await askGameMaster({ apiKey, model, game, message: parsed.data.message, dice });
    const accepted = acceptCommands(master.commands, "ai", game.settings, 6);
    return Response.json({
      narrative: master.narrative,
      commands: accepted.commands,
      rejected: accepted.rejected,
      dice,
      narrator: "gemini",
      blocked: master.blocked,
    });
  } catch (err) {
    console.error("turn failed", humanizeGeminiError(err, apiKey));
    return Response.json({ error: humanizeGeminiError(err, apiKey) }, { status: 502 });
  }
}
