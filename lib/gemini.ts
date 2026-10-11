import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type, type GenerateContentConfig, type ThinkingConfig } from "@google/genai";
import { readAiPayload } from "./modelJson";
import type { Game } from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { DiceResolved } from "./types";

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    commands: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          delta: { type: Type.NUMBER },
          delta_hours: { type: Type.NUMBER },
          name: { type: Type.STRING },
          stat: { type: Type.STRING },
          qty: { type: Type.NUMBER },
          itemType: { type: Type.STRING },
          description: { type: Type.STRING },
          rarity: { type: Type.STRING },
          weight: { type: Type.NUMBER },
          value: { type: Type.NUMBER },
          slot: { type: Type.STRING },
          magical: { type: Type.BOOLEAN },
          title: { type: Type.STRING },
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING },
          objective_done: { type: Type.STRING },
          text: { type: Type.STRING },
          faction: { type: Type.STRING },
          location: { type: Type.STRING },
          notes: { type: Type.STRING },
          level: { type: Type.NUMBER },
          damage: { type: Type.STRING },
          heal: { type: Type.NUMBER },
          ac: { type: Type.NUMBER },
          reward: { type: Type.STRING },
        },
        required: ["type"],
      },
    },
  },
  required: ["narrative", "commands"],
};

export function humanizeGeminiError(err: unknown, apiKey = ""): string {
  const raw = err instanceof Error ? err.message : "Bilinmeyen hata";
  const msg = apiKey ? raw.split(apiKey).join("***") : raw;
  if (/API key|API_KEY_INVALID|401|403|permission|unauthenticated/i.test(msg)) {
    return "API anahtarı kabul edilmedi. Google AI Studio anahtarını kontrol et. Gemini sohbet aboneliği bu anahtarın yerine geçmez.";
  }
  if (/not found|404|was not found|invalid model/i.test(msg)) {
    return "Model bulunamadı. Ayarlardan gemini-3.8-flash seç.";
  }
  if (/quota|429|resource exhausted|rate/i.test(msg)) {
    return "Kota doldu. Biraz bekle ya da yerel anlatıcıya geç.";
  }
  return `Oyun yöneticisi yanıt veremedi. ${msg.slice(0, 220)}`;
}

function adultOn(game: Game): boolean {
  return Boolean(game.settings.adult && game.settings.adultConfirmed && !(game.character.age > 0 && game.character.age < 18));
}

function safetySettings(game: Game) {
  const adult = adultOn(game);
  return [
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: adult ? HarmBlockThreshold.BLOCK_ONLY_HIGH : HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
}

function thinkingFor(model: string): ThinkingConfig | undefined {
  if (model.includes("2.5-flash") && !model.includes("lite")) return { thinkingBudget: 0 };
  if (model.startsWith("gemini-3")) return { thinkingLevel: "LOW" as ThinkingConfig["thinkingLevel"] };
  return undefined;
}

const SOFT = "Bu sahne anlatılamadı. Bir adım geri çekilip başka bir kapıdan devam edelim. Ne yapmak istersin?";

async function generate(apiKey: string, model: string, system: string, user: string, game: Game, withSchema: boolean, withThinking: boolean) {
  const ai = new GoogleGenAI({ apiKey });
  const config: GenerateContentConfig = {
    systemInstruction: system,
    temperature: 0.9,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    safetySettings: safetySettings(game),
  };
  if (withSchema) config.responseSchema = SCHEMA;
  if (withThinking) config.thinkingConfig = thinkingFor(model);
  return ai.models.generateContent({ model, contents: user, config });
}

export async function askGameMaster(options: {
  apiKey: string;
  model: string;
  game: Game;
  message: string;
  dice: DiceResolved | null;
}): Promise<{ narrative: string; commands: unknown[]; blocked: boolean }> {
  const system = buildSystemPrompt(options.game);
  const user = buildUserPrompt(options.game, options.message, options.dice);
  let hint = "";
  let withSchema = true;
  let withThinking = true;
  let lastError = "Hakem JSON döndürmedi";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await generate(options.apiKey, options.model, system, user + hint, options.game, withSchema, withThinking);
      const finish = response.candidates?.[0]?.finishReason;
      if (finish === "SAFETY" || response.promptFeedback?.blockReason) {
        return { narrative: SOFT, commands: [], blocked: true };
      }
      const text = response.text ?? "";
      if (!text.trim()) {
        lastError = "Boş yanıt";
        hint = "\n\nYalnızca narrative ve commands içeren JSON döndür.";
        continue;
      }
      const payload = readAiPayload(text);
      return { narrative: payload.narrative, commands: payload.commands, blocked: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/thinking/i.test(message) && withThinking) {
        withThinking = false;
        continue;
      }
      if (/schema|responseMimeType|json schema|invalid argument/i.test(message) && withSchema) {
        withSchema = false;
        continue;
      }
      if (/JSON|Anlatı boş|nesne değil/i.test(message)) {
        lastError = message;
        hint = "\n\nÖnceki çıktın geçersizdi. Yalnızca {\"narrative\":\"...\",\"commands\":[]} biçiminde JSON döndür.";
        continue;
      }
      throw err;
    }
  }
  throw new Error(lastError);
}

export async function askSummary(apiKey: string, model: string, previous: string, recent: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: `Eski özet:\n${previous || "(yok)"}\n\nYeni turlar:\n${recent}\n\nTek kişilik FRP oturumunu 160 kelimeyi geçmeden Türkçe özetle. Bilinenler ve henüz açılmamış sırlar ayrı kalsın. Yalnızca özeti yaz.`,
    config: { temperature: 0.4, maxOutputTokens: 700 },
  });
  return (response.text ?? "").trim().slice(0, 2500);
}

export async function pingModel(apiKey: string, model: string): Promise<void> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: "Yanıtın tek kelime olsun: tamam",
    config: { temperature: 0, maxOutputTokens: 32 },
  });
  if (!response.text?.trim()) throw new Error("Model boş döndü");
}
