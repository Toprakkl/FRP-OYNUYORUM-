import { suggestedDc } from "./dice";
import { STAT_KEYS, STAT_LABEL, type Difficulty, type StatKey } from "./types";

export type CheckRequest = {
  stat: StatKey;
  dc: number;
  reason: string;
  skill?: string;
};

const ALIAS: Record<string, StatKey> = {
  str: "str",
  strength: "str",
  guc: "str",
  güç: "str",
  dex: "dex",
  cev: "dex",
  çev: "dex",
  ceviklik: "dex",
  çeviklik: "dex",
  con: "con",
  day: "con",
  dayaniklilik: "con",
  dayanıklılık: "con",
  int: "int",
  zek: "int",
  zeka: "int",
  wis: "wis",
  sez: "wis",
  sezgi: "wis",
  cha: "cha",
  kar: "cha",
  karizma: "cha",
};

export function normalizeStat(value: unknown): StatKey | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLocaleLowerCase("tr");
  if ((STAT_KEYS as readonly string[]).includes(key)) return key as StatKey;
  return ALIAS[key] ?? null;
}

export function parseCheck(
  statRaw: unknown,
  dcRaw: unknown,
  reasonRaw: unknown,
  difficulty: Difficulty,
  scale: "classic" | "veyra" = "classic",
  skillRaw?: unknown,
): CheckRequest | null {
  const stat = normalizeStat(statRaw);
  if (!stat) return null;
  const dcNum = Number(dcRaw);
  const ceiling = scale === "veyra" ? 26 : 30;
  const dc = Number.isFinite(dcNum) && dcNum >= 5 ? Math.min(ceiling, Math.round(dcNum)) : suggestedDc(difficulty, scale);
  const reason = typeof reasonRaw === "string" && reasonRaw.trim() ? reasonRaw.trim().slice(0, 80) : STAT_LABEL[stat];
  const skill = typeof skillRaw === "string" && skillRaw.trim() ? skillRaw.trim().slice(0, 40) : undefined;
  return { stat, dc, reason, skill };
}

export function localCheck(message: string, difficulty: Difficulty, scale: "classic" | "veyra" = "classic"): CheckRequest | null {
  const lower = message.toLocaleLowerCase("tr");
  if (/dinlen|uyuy|uyku|kamp kur|nefeslen/.test(lower)) return null;
  const dc = suggestedDc(difficulty, scale);
  const pick = (stat: StatKey, reason: string, skill: string, pattern: RegExp): CheckRequest | null =>
    pattern.test(lower) ? { stat, dc, reason, skill } : null;
  return (
    pick("str", "Saldırı", "Atletizm", /saldır|vuruyorum|vururum|kılıç|yumruk|bıçak|öldür/) ||
    pick("dex", "Gizlenme", "Gizlilik", /gizlen|sokul|sessiz|kaçıyorum|tırman|kilit|çalıyorum|atlıyorum/) ||
    pick("dex", "Açmak", "Kilit Açma", /açıyorum|kapıyı aç/) ||
    pick("cha", "İkna", "İkna", /ikna|yalan|pazarlık|kandır/) ||
    pick("cha", "Konuşma", "İkna", /konuş|selam|merhaba/) ||
    pick("int", "İnceleme", "Tarih", /incele|okuyorum|arıyorum/) ||
    pick("wis", "Fark etme", "Gözlem", /dinliyorum|seziyorum|tuzak|fark ed/) ||
    pick("con", "Dayanma", "Hayatta Kalma", /dayanıyorum|zehir/) ||
    pick("dex", "Hamle", "Parkur", /takip|çözüyorum|giriyorum/) ||
    null
  );
}
