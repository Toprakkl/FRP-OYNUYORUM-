import { acceptCommands } from "@/lib/commands";
import { resolveDice, rollD20 } from "@/lib/dice";
import { fallbackTurn, playLocalTurn } from "@/lib/fallback";
import { askGameMaster, humanizeGeminiError } from "@/lib/gemini";
import { cleanModel, coerceGame } from "@/lib/storage";
import type { Game } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  game: z.unknown(),
  message: z.string().trim().min(1).max(2000),
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

  const apiKey = (parsed.data.apiKey || process.env.GEMINI_API_KEY || "").trim();
  const model = cleanModel(parsed.data.model || process.env.GEMINI_MODEL);
  const wantLocal = parsed.data.narrator === "yerel" || !apiKey;

  if (wantLocal) return Response.json(localPayload(game, parsed.data.message, parsed.data.narrator === "gemini" && !apiKey));

  try {
    const first = await askGameMaster({ apiKey, model, game, message: parsed.data.message, dice: null, allowCheck: true });
    if (first.blocked || !first.check) {
      const accepted = acceptCommands(first.commands, "ai", game.settings, 6);
      return Response.json({
        narrative: first.narrative,
        commands: accepted.commands,
        rejected: accepted.rejected,
        dice: null,
        narrator: "gemini",
        blocked: first.blocked,
      });
    }
    const dice = resolveDice(rollD20(), first.check.stat, game.character.stats, game.settings.difficulty, first.check.dc);
    dice.reason = first.check.reason;
    try {
      const second = await askGameMaster({ apiKey, model, game, message: parsed.data.message, dice, allowCheck: false });
      const accepted = acceptCommands(second.commands, "ai", game.settings, 6);
      return Response.json({
        narrative: second.narrative || fallbackTurn(game, parsed.data.message, dice).narrative,
        commands: accepted.commands,
        rejected: accepted.rejected,
        dice,
        narrator: "gemini",
        blocked: second.blocked,
      });
    } catch (err) {
      console.error("resolve failed", humanizeGeminiError(err, apiKey));
      const local = fallbackTurn(game, parsed.data.message, dice);
      const accepted = acceptCommands(local.commands, "ai", game.settings, 6);
      return Response.json({
        narrative: local.narrative,
        commands: accepted.commands,
        rejected: accepted.rejected,
        dice,
        narrator: "yerel",
        warning: "Zar atıldı. Hakem sonucu yazamadı, sahneyi yerel anlatıcı bağladı.",
      });
    }
  } catch (err) {
    console.error("turn failed", humanizeGeminiError(err, apiKey));
    return Response.json({ error: humanizeGeminiError(err, apiKey) }, { status: 502 });
  }
}

function localPayload(game: Game, message: string, missingKey: boolean) {
  const local = playLocalTurn(game, message);
  const accepted = acceptCommands(local.commands, "ai", game.settings, 6);
  return {
    narrative: local.narrative,
    commands: accepted.commands,
    rejected: accepted.rejected,
    dice: local.dice,
    narrator: "yerel" as const,
    warning: missingKey ? "API anahtarı yok. Bu turu yerel anlatıcı yazdı." : undefined,
  };
}
