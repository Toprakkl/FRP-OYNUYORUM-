import { getPack } from "./campaigns";
import { modifier } from "./dice";
import { now, uid } from "./ids";
import type { ItemSeed } from "./presets";
import type { Character, Difficulty, Game, GenreId, Item, Stats, ThemeId, Tone } from "./types";
import { computeAc } from "./applyCommands";

export type NewGameInput = {
  genre: GenreId;
  customGenre: string;
  theme: ThemeId;
  classId: string;
  name: string;
  race: string;
  age: number;
  concept: string;
  difficulty: Difficulty;
  magic: boolean;
  tone: Tone;
  stats?: Stats;
};

function blankStats(): Stats {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
}

function materialize(seed: ItemSeed, magic: boolean): Item {
  const magical = Boolean(seed.magical) && magic;
  return {
    id: uid(),
    name: seed.name,
    type: seed.type,
    subtype: seed.subtype ?? "",
    description: seed.description,
    lore: seed.lore ?? "",
    rarity: seed.rarity ?? "common",
    weight: seed.weight,
    value: seed.value,
    qty: seed.qty ?? 1,
    stackable: Boolean(seed.stackable),
    slot: seed.slot ?? null,
    equippedSlot: seed.equipped && !(seed.magical && !magic) ? seed.slot ?? null : null,
    magical,
    props: {
      ...(seed.damage ? { damage: seed.damage } : {}),
      ...(seed.ac ? { ac: seed.ac } : {}),
      ...(seed.heal ? { heal: seed.heal } : {}),
      ...(seed.healMana && magic ? { healMana: seed.healMana } : {}),
      ...(seed.stat ? { stat: seed.stat } : {}),
      ...(seed.hands === 2 ? { hands: 2 } : {}),
    },
  };
}

function withRace(text: string, race: string): string {
  const clean = race.trim();
  const key = clean.toLocaleLowerCase("tr");
  if (!clean || key === "insan" || key === "yerel") return text;
  return text.replace(/\.\s/, `. ${clean} olduğun göze çarpıyor. `);
}

export function createGame(input: NewGameInput): Game {
  const pack = getPack(input.genre);
  const preset = pack.classes.find((entry) => entry.id === input.classId) ?? pack.classes[0];
  const stats = input.stats ?? preset.stats;
  const magic = input.magic;
  const conShift = modifier(stats.con) - modifier(preset.stats.con);
  const maxHp = Math.max(8, preset.hp + conShift);
  const maxMana = magic ? Math.max(0, preset.mana + Math.max(0, modifier(stats.int) - modifier(preset.stats.int))) : 0;
  const name = input.name.trim().slice(0, 32) || "Adsız";
  const stamped = now();
  const worldLabel = input.genre === "ozel" && input.customGenre.trim() ? input.customGenre.trim() : pack.title;
  const openingCore = withRace(pack.opening({ name, className: preset.name }), input.race);
  const opening = input.genre === "ozel" && input.customGenre.trim() ? `Dünya: ${input.customGenre.trim()}.\n\n${openingCore}` : openingCore;

  const character: Character = {
    name,
    className: preset.name,
    race: input.race.trim(),
    age: Math.min(120, Math.max(1, Math.round(input.age || 30))),
    gender: "",
    appearance: "",
    personality: "",
    backstory: input.concept.trim(),
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    gold: preset.gold,
    ac: 10,
    stats: { ...blankStats(), ...stats },
    statPoints: 0,
    conditions: [],
    skills: preset.skills.map((skill) => ({ ...skill })),
    spells: magic ? [...preset.spells] : [],
    notes: "",
    reputation: {},
    isAlive: true,
  };

  const inventory = preset.items
    .filter((item) => magic || !item.magical)
    .map((item) => materialize(item, magic));

  const game: Game = {
    id: uid(),
    title: `${worldLabel} — ${name}`,
    settings: {
      genre: input.genre,
      customGenre: input.customGenre.trim(),
      theme: input.theme || pack.theme,
      magic,
      difficulty: input.difficulty,
      tone: input.tone,
      realism: false,
      adult: false,
      adultConfirmed: false,
      customRules: "",
      currency: pack.currency,
    },
    summary: "",
    summarizedMessageCount: 0,
    worldTime: pack.worldTime,
    location: pack.location,
    character,
    inventory,
    quests: [
      {
        id: uid(),
        title: pack.quest.title,
        description: pack.quest.description,
        status: "active",
        objectives: pack.quest.objectives.map((text) => ({ text, done: false })),
        reward: pack.quest.reward,
      },
    ],
    lore: pack.lore.map((entry) => ({ ...entry, id: uid(), tags: [...entry.tags] })),
    npcs: [
      {
        id: uid(),
        name: pack.npc.name,
        attitude: pack.npc.attitude,
        status: "alive",
        location: pack.npc.location,
        notes: pack.npc.notes,
      },
    ],
    messages: [{ id: uid(), role: "ai", content: opening, createdAt: stamped }],
    events: [{ id: uid(), source: "system", summary: "Macera açıldı", createdAt: stamped }],
    journal: [],
    history: [],
    createdAt: stamped,
    updatedAt: stamped,
  };
  game.character.ac = computeAc(game.character, game.inventory);
  return game;
}

export function defaultInput(genre: GenreId = "orta_cag"): NewGameInput {
  const pack = getPack(genre);
  const preset = pack.classes[0];
  return {
    genre,
    customGenre: "",
    theme: pack.theme,
    classId: preset.id,
    name: "",
    race: pack.raceSuggestions[0] ?? "",
    age: 30,
    concept: "",
    difficulty: "normal",
    magic: pack.magicDefault,
    tone: "normal",
    stats: { ...preset.stats },
  };
}
