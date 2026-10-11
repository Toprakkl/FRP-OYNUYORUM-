import type { GameSettings, ItemType, Rarity, Slot, StatKey } from "./types";
import { ITEM_TYPES, RARITIES, SLOTS, STAT_KEYS } from "./types";
import { clamp } from "./format";

export type Source = "ai" | "manual" | "system";

export type ItemDraft = {
  name: string;
  qty: number;
  itemType: ItemType;
  subtype: string;
  description: string;
  lore: string;
  rarity: Rarity;
  weight: number;
  value: number;
  slot: Slot | null;
  magical: boolean;
  stackable: boolean;
  damage?: string;
  ac?: number;
  heal?: number;
  healMana?: number;
  stat?: StatKey;
  hands?: number;
};

export type Command =
  | { type: "hp"; delta: number }
  | { type: "set_hp"; value: number }
  | { type: "max_hp"; delta: number }
  | { type: "set_max_hp"; value: number }
  | { type: "mana"; delta: number }
  | { type: "set_mana"; value: number }
  | { type: "set_max_mana"; value: number }
  | { type: "gold"; delta: number }
  | { type: "set_gold"; value: number }
  | { type: "xp"; delta: number }
  | { type: "set_xp"; value: number }
  | { type: "level_up" }
  | { type: "set_level"; value: number }
  | { type: "stat"; stat: StatKey; delta: number }
  | { type: "set_stat"; stat: StatKey; value: number }
  | { type: "time"; delta_hours: number }
  | { type: "set_time"; hours: number }
  | { type: "condition_add"; name: string }
  | { type: "condition_remove"; name: string }
  | { type: "item_add"; item: ItemDraft }
  | { type: "item_remove"; name: string; id?: string; qty: number }
  | { type: "item_equip"; name: string; id?: string; slot?: Slot }
  | { type: "item_unequip"; slot: Slot }
  | { type: "skill_add"; name: string; level: number }
  | { type: "spell_learn"; name: string }
  | { type: "location_set"; name: string }
  | { type: "quest_add"; title: string; description: string; objectives: string[]; reward: string }
  | { type: "quest_update"; title: string; status?: "active" | "completed" | "failed"; objective_done?: string }
  | {
      type: "npc_touch";
      name: string;
      delta: number;
      status?: "alive" | "dead" | "missing";
      location?: string;
      notes?: string;
    }
  | { type: "reputation"; faction: string; delta: number }
  | { type: "journal_add"; text: string }
  | { type: "set_alive"; value: boolean };

export type SanitizeResult = { ok: true; command: Command } | { ok: false; reason: string };

const AI_FORBIDDEN = new Set([
  "set_hp",
  "set_max_hp",
  "set_mana",
  "set_max_mana",
  "set_gold",
  "set_xp",
  "set_level",
  "set_stat",
  "set_time",
  "level_up",
]);

const TYPE_ALIAS: Record<string, ItemType> = {
  weapon: "weapon",
  silah: "weapon",
  armor: "armor",
  zirh: "armor",
  zırh: "armor",
  shield: "shield",
  kalkan: "shield",
  accessory: "accessory",
  tilsim: "accessory",
  tılsım: "accessory",
  yuzuk: "accessory",
  yüzük: "accessory",
  consumable: "consumable",
  iksir: "consumable",
  yiyecek: "consumable",
  tuketilebilir: "consumable",
  tüketilebilir: "consumable",
  tool: "tool",
  alet: "tool",
  material: "material",
  malzeme: "material",
  quest: "quest",
  gorev: "quest",
  görev: "quest",
  book: "book",
  kitap: "book",
  note: "book",
  key: "key",
  anahtar: "key",
  misc: "misc",
  diger: "misc",
  diğer: "misc",
};

const RARITY_ALIAS: Record<string, Rarity> = {
  common: "common",
  siradan: "common",
  sıradan: "common",
  uncommon: "uncommon",
  "az bulunur": "uncommon",
  rare: "rare",
  nadir: "rare",
  epic: "epic",
  destansi: "epic",
  destansı: "epic",
  legendary: "legendary",
  efsanevi: "legendary",
};

const SLOT_ALIAS: Record<string, Slot> = {
  head: "head",
  bas: "head",
  baş: "head",
  chest: "chest",
  govde: "chest",
  gövde: "chest",
  legs: "legs",
  bacak: "legs",
  feet: "feet",
  ayak: "feet",
  hands: "hands",
  eller: "hands",
  main_hand: "main_hand",
  "ana el": "main_hand",
  anael: "main_hand",
  off_hand: "off_hand",
  "yan el": "off_hand",
  yanel: "off_hand",
  ring_1: "ring_1",
  yuzuk: "ring_1",
  yüzük: "ring_1",
  ring_2: "ring_2",
  neck: "neck",
  boyun: "neck",
  back: "back",
  sirt: "back",
  sırt: "back",
  ranged: "ranged",
  menzil: "ranged",
};

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function int(value: unknown, fallback?: number): number | null {
  const n = num(value);
  if (n === null) return fallback ?? null;
  return Math.round(n);
}

function statOf(value: unknown): StatKey | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return STAT_KEYS.find((stat) => stat === key) ?? null;
}

function slotOf(value: unknown): Slot | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLocaleLowerCase("tr");
  return SLOT_ALIAS[key] ?? (SLOTS.find((slot) => slot === key) ?? null);
}

function itemTypeOf(value: unknown): ItemType {
  if (typeof value !== "string") return "misc";
  const key = value.trim().toLocaleLowerCase("tr");
  return TYPE_ALIAS[key] ?? (ITEM_TYPES.find((type) => type === key) ?? "misc");
}

function rarityOf(value: unknown): Rarity {
  if (typeof value !== "string") return "common";
  const key = value.trim().toLocaleLowerCase("tr");
  return RARITY_ALIAS[key] ?? "common";
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function limit(value: number, min: number, max: number, source: Source, hardMin: number, hardMax: number, label: string): SanitizeResult | number {
  if (source === "ai" && (value < min || value > max)) return { ok: false, reason: `${label} sınırı aşıldı` };
  return clamp(value, hardMin, hardMax);
}

export function sanitizeCommand(raw: unknown, source: Source, settings: GameSettings): SanitizeResult {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "Bozuk komut" };
  const row = raw as Record<string, unknown>;
  let type = typeof row.type === "string" ? row.type.trim() : "";
  if (type === "item_create") type = "item_add";
  if (!type) return { ok: false, reason: "Komut tipi yok" };
  if (source === "ai" && AI_FORBIDDEN.has(type)) return { ok: false, reason: `${type} yalnızca elle kullanılır` };

  const magicBlocked = !settings.magic && (type === "mana" || type === "set_mana" || type === "set_max_mana" || type === "spell_learn");
  if (magicBlocked) return { ok: false, reason: "Büyü kapalı" };

  switch (type) {
    case "hp":
    case "max_hp":
    case "mana":
    case "gold":
    case "xp":
    case "stat": {
      const delta = int(row.delta);
      if (delta === null || delta === 0) return { ok: false, reason: "Değişim yok" };
      if (type === "hp") {
        const checked = limit(delta, -30, 30, source, -999, 999, "Can");
        if (typeof checked !== "number") return checked;
        return { ok: true, command: { type: "hp", delta: checked } };
      }
      if (type === "max_hp") {
        const checked = limit(delta, -4, 8, source, -200, 200, "Azami can");
        if (typeof checked !== "number") return checked;
        return { ok: true, command: { type: "max_hp", delta: checked } };
      }
      if (type === "mana") {
        const checked = limit(delta, -20, 20, source, -200, 200, "Mana");
        if (typeof checked !== "number") return checked;
        return { ok: true, command: { type: "mana", delta: checked } };
      }
      if (type === "gold") {
        const checked = limit(delta, -200, 300, source, -999999, 999999, "Para");
        if (typeof checked !== "number") return checked;
        return { ok: true, command: { type: "gold", delta: checked } };
      }
      if (type === "xp") {
        const checked = limit(delta, 0, 60, source, -9999, 99999, "XP");
        if (typeof checked !== "number") return checked;
        return { ok: true, command: { type: "xp", delta: checked } };
      }
      const stat = statOf(row.stat);
      if (!stat) return { ok: false, reason: "Stat anlaşılmadı" };
      const checked = limit(delta, -1, 1, source, -10, 10, "Stat");
      if (typeof checked !== "number") return checked;
      return { ok: true, command: { type: "stat", stat, delta: checked } };
    }
    case "set_hp":
    case "set_max_hp":
    case "set_mana":
    case "set_max_mana":
    case "set_gold":
    case "set_xp":
    case "set_level":
    case "set_time": {
      const value = int(row.value ?? row.hours);
      if (value === null) return { ok: false, reason: "Sayı yok" };
      if (type === "set_hp") return { ok: true, command: { type, value: clamp(value, 0, 999) } };
      if (type === "set_max_hp" || type === "set_max_mana") return { ok: true, command: { type, value: clamp(value, 0, 999) } };
      if (type === "set_mana") return { ok: true, command: { type, value: clamp(value, 0, 999) } };
      if (type === "set_gold") return { ok: true, command: { type, value: clamp(value, 0, 999999) } };
      if (type === "set_xp") return { ok: true, command: { type, value: clamp(value, 0, 99999) } };
      if (type === "set_level") return { ok: true, command: { type, value: clamp(value, 1, 20) } };
      return { ok: true, command: { type: "set_time", hours: clamp(value, 0, 200000) } };
    }
    case "set_stat": {
      const stat = statOf(row.stat);
      const value = int(row.value);
      if (!stat || value === null) return { ok: false, reason: "Stat anlaşılmadı" };
      return { ok: true, command: { type: "set_stat", stat, value: clamp(value, 1, 24) } };
    }
    case "level_up":
      return { ok: true, command: { type: "level_up" } };
    case "time": {
      const delta = int(row.delta_hours ?? row.delta ?? row.hours);
      if (delta === null || delta === 0) return { ok: false, reason: "Saat değişmedi" };
      const checked = limit(delta, 0, 18, source, -48, 240, "Saat");
      if (typeof checked !== "number") return checked;
      return { ok: true, command: { type: "time", delta_hours: checked } };
    }
    case "condition_add":
    case "condition_remove": {
      const name = text(row.name, 40);
      if (!name) return { ok: false, reason: "Durum adı yok" };
      return { ok: true, command: { type, name } };
    }
    case "item_add": {
      const nested = row.item && typeof row.item === "object" ? (row.item as Record<string, unknown>) : row;
      const name = text(nested.name ?? row.name, 60);
      if (!name) return { ok: false, reason: "Eşya adı yok" };
      const qty = int(nested.qty ?? row.qty, 1) ?? 1;
      const qtyChecked = limit(qty, 1, 5, source, 1, 99, "Adet");
      if (typeof qtyChecked !== "number") return qtyChecked;
      const itemType = itemTypeOf(nested.itemType ?? nested.type ?? row.itemType ?? row.item_type);
      let magical = bool(nested.magical ?? nested.is_magical ?? row.magical);
      if (!settings.magic) magical = false;
      if (source === "ai" && magical && !settings.magic) return { ok: false, reason: "Büyü kapalı" };
      const weight = num(nested.weight ?? row.weight) ?? 0.2;
      const price = int(nested.value ?? nested.price ?? row.value ?? row.price, 0) ?? 0;
      const weightChecked = limit(Math.round(weight * 10) / 10, 0, 20, source, 0, 200, "Ağırlık");
      if (typeof weightChecked !== "number") return weightChecked;
      const priceChecked = limit(price, 0, 400, source, 0, 999999, "Değer");
      if (typeof priceChecked !== "number") return priceChecked;
      const stackableDefault = itemType === "consumable" || itemType === "material" || itemType === "misc";
      const draft: ItemDraft = {
        name,
        qty: qtyChecked,
        itemType,
        subtype: text(nested.subtype ?? row.subtype, 40) ?? "",
        description: text(nested.description ?? row.description, source === "ai" ? 240 : 800) ?? "",
        lore: text(nested.lore ?? row.lore, source === "ai" ? 280 : 1200) ?? "",
        rarity: rarityOf(nested.rarity ?? row.rarity),
        weight: weightChecked,
        value: priceChecked,
        slot: slotOf(nested.slot ?? row.slot),
        magical,
        stackable: nested.stackable === undefined && row.stackable === undefined ? stackableDefault : bool(nested.stackable ?? row.stackable),
      };
      const damage = text(nested.damage ?? row.damage, 12);
      const ac = int(nested.ac ?? row.ac);
      const heal = int(nested.heal ?? row.heal);
      const healMana = int(nested.healMana ?? row.healMana);
      const stat = statOf(nested.stat ?? row.stat);
      const hands = int(nested.hands ?? row.hands);
      if (damage) draft.damage = damage;
      if (ac !== null && ac > 0) draft.ac = clamp(ac, 0, source === "ai" ? 4 : 12);
      if (heal !== null && heal > 0) draft.heal = clamp(heal, 0, source === "ai" ? 20 : 99);
      if (healMana !== null && healMana > 0 && settings.magic) draft.healMana = clamp(healMana, 0, source === "ai" ? 20 : 99);
      if (stat) draft.stat = stat;
      if (hands === 2) draft.hands = 2;
      if (!draft.slot && (itemType === "weapon" || itemType === "armor" || itemType === "shield" || itemType === "accessory")) {
        draft.slot = defaultSlot(itemType, draft.subtype);
      }
      return { ok: true, command: { type: "item_add", item: draft } };
    }
    case "item_remove": {
      const name = text(row.name, 60);
      if (!name) return { ok: false, reason: "Eşya adı yok" };
      const qty = int(row.qty, 1) ?? 1;
      const checked = limit(qty, 1, 5, source, 1, 99, "Adet");
      if (typeof checked !== "number") return checked;
      const id = text(row.id, 80) ?? undefined;
      return { ok: true, command: { type: "item_remove", name, id, qty: checked } };
    }
    case "item_equip": {
      const name = text(row.name, 60);
      if (!name) return { ok: false, reason: "Eşya adı yok" };
      const id = text(row.id, 80) ?? undefined;
      const slot = slotOf(row.slot) ?? undefined;
      return { ok: true, command: { type: "item_equip", name, id, slot } };
    }
    case "item_unequip": {
      const slot = slotOf(row.slot ?? row.name);
      if (!slot) return { ok: false, reason: "Yuva anlaşılmadı" };
      return { ok: true, command: { type: "item_unequip", slot } };
    }
    case "skill_add": {
      const name = text(row.name, 40);
      if (!name) return { ok: false, reason: "Beceri adı yok" };
      const level = int(row.level, 1) ?? 1;
      const checked = limit(level, 1, 3, source, 1, 6, "Beceri");
      if (typeof checked !== "number") return checked;
      return { ok: true, command: { type: "skill_add", name, level: checked } };
    }
    case "spell_learn": {
      const name = text(row.name, 40);
      if (!name) return { ok: false, reason: "Büyü adı yok" };
      return { ok: true, command: { type: "spell_learn", name } };
    }
    case "location_set": {
      const name = text(row.name, 80);
      if (!name) return { ok: false, reason: "Konum yok" };
      return { ok: true, command: { type: "location_set", name } };
    }
    case "quest_add": {
      const title = text(row.title ?? row.name, 80);
      if (!title) return { ok: false, reason: "Görev adı yok" };
      const objectives = Array.isArray(row.objectives)
        ? row.objectives.map((entry) => (typeof entry === "string" ? text(entry, 120) : text((entry as { text?: string })?.text, 120))).filter((entry): entry is string => Boolean(entry)).slice(0, 6)
        : [];
      return {
        ok: true,
        command: {
          type: "quest_add",
          title,
          description: text(row.description, source === "ai" ? 400 : 1200) ?? "",
          objectives,
          reward: text(row.reward, 160) ?? "",
        },
      };
    }
    case "quest_update": {
      const title = text(row.title ?? row.name, 80);
      if (!title) return { ok: false, reason: "Görev adı yok" };
      const status = row.status === "active" || row.status === "completed" || row.status === "failed" ? row.status : undefined;
      const objective = text(row.objective_done ?? row.objective, 120) ?? undefined;
      if (!status && !objective) return { ok: false, reason: "Görev değişmedi" };
      return { ok: true, command: { type: "quest_update", title, status, objective_done: objective } };
    }
    case "npc_touch":
    case "npc_attitude":
    case "npc_status": {
      const name = text(row.name, 60);
      if (!name) return { ok: false, reason: "Kişi adı yok" };
      const delta = int(row.delta, 0) ?? 0;
      const checked = limit(delta, -25, 25, source, -100, 100, "Tutum");
      if (typeof checked !== "number") return checked;
      const status = row.status === "alive" || row.status === "dead" || row.status === "missing" ? row.status : undefined;
      return {
        ok: true,
        command: {
          type: "npc_touch",
          name,
          delta: checked,
          status,
          location: text(row.location, 80) ?? undefined,
          notes: text(row.notes, source === "ai" ? 240 : 800) ?? undefined,
        },
      };
    }
    case "reputation": {
      const faction = text(row.faction ?? row.name, 60);
      const delta = int(row.delta);
      if (!faction || delta === null || delta === 0) return { ok: false, reason: "İtibar değişmedi" };
      const checked = limit(delta, -20, 20, source, -100, 100, "İtibar");
      if (typeof checked !== "number") return checked;
      return { ok: true, command: { type: "reputation", faction, delta: checked } };
    }
    case "journal_add": {
      const entry = text(row.text ?? row.name, source === "ai" ? 400 : 2000);
      if (!entry) return { ok: false, reason: "Günlük boş" };
      return { ok: true, command: { type: "journal_add", text: entry } };
    }
    case "set_alive": {
      const value = bool(row.value);
      if (source === "ai" && (value || settings.difficulty !== "sert")) {
        return { ok: false, reason: "Ölüm ve dirilme senin elinde" };
      }
      return { ok: true, command: { type: "set_alive", value } };
    }
    default:
      return { ok: false, reason: `Bilinmeyen komut: ${type}` };
  }
}

export function defaultSlot(type: ItemType, subtype: string): Slot | null {
  const sub = subtype.toLocaleLowerCase("tr");
  if (type === "weapon" && /yay|tufek|tüfek|tabanca|menzil/.test(sub)) return "ranged";
  if (type === "weapon") return "main_hand";
  if (type === "armor") {
    if (/baslik|kask|şapka|sapka|maske/.test(sub)) return "head";
    if (/cizme|çizme|ayak/.test(sub)) return "feet";
    if (/eldiven/.test(sub)) return "hands";
    if (/pantolon|dizlik/.test(sub)) return "legs";
    if (/pelerin|canta|çanta/.test(sub)) return "back";
    return "chest";
  }
  if (type === "shield") return "off_hand";
  if (type === "accessory") {
    if (/yuzuk|yüzük/.test(sub)) return "ring_1";
    if (/pelerin/.test(sub)) return "back";
    return "neck";
  }
  if (type === "tool") return "main_hand";
  return null;
}

export function acceptCommands(raw: unknown[], source: Source, settings: GameSettings, max = 6): { commands: Command[]; rejected: string[] } {
  const commands: Command[] = [];
  const rejected: string[] = [];
  const list = Array.isArray(raw) ? raw : [];
  for (const entry of list) {
    if (commands.length >= max) {
      rejected.push("Tur başına komut sınırı doldu");
      break;
    }
    const result = sanitizeCommand(entry, source, settings);
    if (result.ok) commands.push(result.command);
    else rejected.push(result.reason);
  }
  return { commands, rejected };
}
