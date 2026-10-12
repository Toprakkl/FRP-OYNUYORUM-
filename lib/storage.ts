import { computeAc } from "./applyCommands";
import { clamp } from "./format";
import type { Advisor, Companion, Game, GameSettings, GenreId, Kingdom, Npc, Profession, Stats, ThemeId } from "./types";
import { STAT_KEYS } from "./types";
import { WEATHERS } from "./veyraLife";

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

const GENRES: GenreId[] = ["veyra", "orta_cag", "istihbarat", "distopya", "bilimkurgu", "ozel"];
const THEMES: ThemeId[] = ["veyra", "orta_cag", "istihbarat", "distopya", "bilimkurgu"];

function professionOf(value: unknown): Profession | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Profession>;
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  return { name: row.name.slice(0, 40), mp: clamp(Math.round(Number(row.mp) || 0), 0, 9999) };
}

function kingdomOf(value: unknown): Kingdom | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Kingdom>;
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  const num = (input: unknown, min: number, max: number, fallback: number) => {
    const n = Number(input);
    if (!Number.isFinite(n)) return fallback;
    return clamp(Math.round(n), min, max);
  };
  const advisors = Array.isArray(row.advisors)
    ? row.advisors.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const advisor = entry as Partial<Advisor>;
        if (typeof advisor.role !== "string" || typeof advisor.name !== "string") return [];
        return [{ role: advisor.role.slice(0, 40), name: advisor.name.slice(0, 40), loyalty: num(advisor.loyalty, 0, 100, 70) }];
      }).slice(0, 7)
    : [];
  return {
    name: row.name.slice(0, 40),
    tier: num(row.tier, 1, 7, 1),
    population: num(row.population, 1, 5000000, 40),
    treasury: num(row.treasury, 0, 5000000, 0),
    army: num(row.army, 0, 5000000, 0),
    people: num(row.people, 0, 100, 50),
    stability: num(row.stability, 0, 100, 50),
    influence: num(row.influence, 0, 100, 30),
    legitimacy: num(row.legitimacy, 0, 100, 40),
    buildings: Array.isArray(row.buildings) ? row.buildings.filter((entry): entry is string => typeof entry === "string").slice(0, 12) : [],
    advisors,
    boons: Array.isArray(row.boons) ? row.boons.filter((entry): entry is string => typeof entry === "string").slice(0, 8) : [],
    pendingEvent: num(row.pendingEvent, 0, 20, 0),
  };
}

function npcsOf(value: unknown): Npc[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const npc = entry as Npc;
    if (typeof npc.name !== "string" || typeof npc.id !== "string") return [];
    return [{ ...npc, bond: clamp(Math.round(Number(npc.bond) || 0), 0, 100) }];
  });
}

function companionsOf(value: unknown): Companion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const companion = entry as Partial<Companion>;
    if (typeof companion.name !== "string" || !companion.name.trim()) return [];
    return [{
      id: typeof companion.id === "string" ? companion.id : crypto.randomUUID(),
      name: companion.name.slice(0, 40),
      loyalty: clamp(Math.round(Number(companion.loyalty) || 0), 0, 100),
      note: typeof companion.note === "string" ? companion.note.slice(0, 160) : "",
    }];
  }).slice(0, 3);
}

function statsOf(value: unknown): Stats {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const key of STAT_KEYS) {
    const n = Number(row[key]);
    if (Number.isFinite(n)) stats[key] = Math.min(30, Math.max(1, Math.round(n)));
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
    honor: Number(row.character.honor) || 0,
    talentPoints: Number(row.character.talentPoints) || 0,
    talents: Array.isArray(row.character.talents) ? row.character.talents.filter((entry) => typeof entry === "string") : [],
    peakGifts: Number(row.character.peakGifts) || 0,
    guildPoints: Number(row.character.guildPoints) || 0,
    guildRank: typeof row.character.guildRank === "string" ? row.character.guildRank : "",
    origin: typeof row.character.origin === "string" ? row.character.origin : "",
    oath: typeof row.character.oath === "string" ? row.character.oath : "",
    traits: typeof row.character.traits === "string" ? row.character.traits : "",
    lastStand: Boolean(row.character.lastStand),
    naturalArmor: Boolean(row.character.naturalArmor),
    profession: professionOf(row.character.profession),
    sideProfession: professionOf(row.character.sideProfession),
    fatigue: clamp(Math.round(Number(row.character.fatigue) || 0), 0, 5),
    homeTier: clamp(Math.round(Number(row.character.homeTier) || 0), 0, 5),
    portraitDataUrl: row.character.portraitDataUrl,
    isAlive: row.character.isAlive !== false,
  };
  const weather = WEATHERS.find((entry) => entry === row.weather) ?? (genre === "veyra" ? "Açık" : "");
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
    npcs: npcsOf(row.npcs),
    messages: Array.isArray(row.messages) ? row.messages : [],
    events: Array.isArray(row.events) ? row.events : [],
    journal: Array.isArray(row.journal) ? row.journal : [],
    history: [],
    kingdom: kingdomOf(row.kingdom),
    companions: companionsOf(row.companions),
    weather,
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
