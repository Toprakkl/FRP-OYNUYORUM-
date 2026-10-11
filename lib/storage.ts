import { computeAc } from "./applyCommands";
import type { Game, GameSettings, GenreId, Stats, ThemeId } from "./types";
import { STAT_KEYS } from "./types";

export const SAVE_KEY = "frp-masasi-save-v1";
export const PREFS_KEY = "frp-masasi-prefs-v1";

export type Prefs = {
  apiKey: string;
  model: string;
  sound: boolean;
  narrator: "gemini" | "yerel";
};

export const DEFAULT_MODEL = "gemini-3.8-flash";

export const DEFAULT_PREFS: Prefs = {
  apiKey: "",
  model: DEFAULT_MODEL,
  sound: true,
  narrator: "gemini",
};

const GENRES: GenreId[] = ["orta_cag", "istihbarat", "distopya", "bilimkurgu", "ozel"];
const THEMES: ThemeId[] = ["orta_cag", "istihbarat", "distopya", "bilimkurgu"];

function statsOf(value: unknown): Stats {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const key of STAT_KEYS) {
    const n = Number(row[key]);
    if (Number.isFinite(n)) stats[key] = Math.min(24, Math.max(1, Math.round(n)));
  }
  return stats;
}

export function coerceGame(input: unknown): Game | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Partial<Game>;
  if (!row.character || typeof row.character !== "object" || typeof row.character.name !== "string") return null;
  if (!row.settings || typeof row.settings !== "object") return null;
  const settings = row.settings as Partial<GameSettings>;
  const genre = GENRES.includes(settings.genre as GenreId) ? (settings.genre as GenreId) : "orta_cag";
  const theme = THEMES.includes(settings.theme as ThemeId) ? (settings.theme as ThemeId) : "orta_cag";
  const character = {
    name: row.character.name.slice(0, 32) || "Adsız",
    className: row.character.className || "Gezgin",
    race: row.character.race || "",
    age: Number(row.character.age) || 30,
    gender: row.character.gender || "",
    appearance: row.character.appearance || "",
    personality: row.character.personality || "",
    backstory: row.character.backstory || "",
    level: Number(row.character.level) || 1,
    xp: Number(row.character.xp) || 0,
    hp: Number(row.character.hp) || 1,
    maxHp: Number(row.character.maxHp) || 1,
    mana: Number(row.character.mana) || 0,
    maxMana: Number(row.character.maxMana) || 0,
    gold: Number(row.character.gold) || 0,
    ac: Number(row.character.ac) || 10,
    stats: statsOf(row.character.stats),
    statPoints: Number(row.character.statPoints) || 0,
    conditions: Array.isArray(row.character.conditions) ? row.character.conditions.filter((entry) => typeof entry === "string") : [],
    skills: Array.isArray(row.character.skills) ? row.character.skills : [],
    spells: Array.isArray(row.character.spells) ? row.character.spells.filter((entry) => typeof entry === "string") : [],
    notes: row.character.notes || "",
    reputation: row.character.reputation && typeof row.character.reputation === "object" ? row.character.reputation : {},
    portraitDataUrl: row.character.portraitDataUrl,
    isAlive: row.character.isAlive !== false,
  };
  const game: Game = {
    id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
    title: typeof row.title === "string" ? row.title : character.name,
    settings: {
      genre,
      customGenre: settings.customGenre || "",
      theme,
      magic: settings.magic !== false,
      difficulty: settings.difficulty === "kolay" || settings.difficulty === "sert" ? settings.difficulty : "normal",
      tone: settings.tone === "kisa" || settings.tone === "detayli" ? settings.tone : "normal",
      realism: Boolean(settings.realism),
      adult: Boolean(settings.adult),
      adultConfirmed: Boolean(settings.adultConfirmed),
      customRules: settings.customRules || "",
      currency: settings.currency || "altın",
    },
    summary: row.summary || "",
    summarizedMessageCount: Number(row.summarizedMessageCount) || 0,
    worldTime: Number(row.worldTime) || 0,
    location: row.location || "Bilinmeyen",
    character,
    inventory: Array.isArray(row.inventory) ? row.inventory : [],
    quests: Array.isArray(row.quests) ? row.quests : [],
    lore: Array.isArray(row.lore) ? row.lore : [],
    npcs: Array.isArray(row.npcs) ? row.npcs : [],
    messages: Array.isArray(row.messages) ? row.messages : [],
    events: Array.isArray(row.events) ? row.events : [],
    journal: Array.isArray(row.journal) ? row.journal : [],
    history: [],
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString(),
  };
  game.character.ac = computeAc(game.character, game.inventory);
  return game;
}

export function stripForApi(game: Game): Game {
  const copy = structuredClone(game);
  delete copy.character.portraitDataUrl;
  copy.history = [];
  copy.events = copy.events.slice(-20);
  copy.messages = copy.messages.slice(-24);
  copy.journal = copy.journal.slice(0, 6);
  return copy;
}

export function cleanModel(input: string | undefined, fallback = DEFAULT_MODEL): string {
  const value = (input || "").trim();
  if (/^[a-zA-Z0-9._-]{3,80}$/.test(value)) return value;
  return fallback;
}
