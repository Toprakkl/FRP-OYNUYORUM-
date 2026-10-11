import { getPack } from "./campaigns";
import { modifier } from "./dice";
import { now, uid } from "./ids";
import type { ItemSeed } from "./presets";
import type { Character, Difficulty, Game, GenreId, Item, Stats, ThemeId, Tone } from "./types";
import { computeAc } from "./applyCommands";
import { blankVeyraSheet, essenceMax, getOrigin, pathById, raceByName } from "./veyra";

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
  originId?: string;
  bonusSkill?: string;
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
  const veyra = input.genre === "veyra";
  const origin = veyra ? getOrigin(input.originId) : null;
  const path = veyra ? pathById(input.classId) : null;
  const race = veyra ? raceByName(input.race) : undefined;
  const stats = input.stats ?? preset.stats;
  const magic = veyra ? true : input.magic;
  const conShift = modifier(stats.con) - modifier(preset.stats.con);
  const maxHp = path ? Math.max(1, path.die + modifier(stats.con)) : Math.max(8, preset.hp + conShift);
  const maxMana = !magic ? 0 : path ? essenceMax(path, 1, stats, race) : Math.max(0, preset.mana + Math.max(0, modifier(stats.int) - modifier(preset.stats.int)));
  const name = input.name.trim().slice(0, 32) || "Adsız";
  const stamped = now();
  const worldLabel = input.genre === "ozel" && input.customGenre.trim() ? input.customGenre.trim() : pack.title;
  const className = path?.name ?? preset.name;
  const openingCore = withRace((origin ?? pack).opening({ name, className }), input.race);
  const opening = input.genre === "ozel" && input.customGenre.trim() ? `Dünya: ${input.customGenre.trim()}.\n\n${openingCore}` : openingCore;
  const skills = (path?.skills ?? preset.skills).map((skill) => ({ ...skill }));
  const bonus = input.bonusSkill?.trim();
  if (veyra && race?.id === "insan" && bonus) {
    const known = skills.find((skill) => skill.name.toLocaleLowerCase("tr") === bonus.toLocaleLowerCase("tr"));
    if (known) known.level = Math.min(2, known.level + 1);
    else skills.push({ name: bonus.slice(0, 40), level: 1 });
  }
  const sheet = blankVeyraSheet();

  const character: Character = {
    name,
    className,
    race: input.race.trim(),
    age: Math.min(veyra ? 3000 : 120, Math.max(1, Math.round(input.age || 30))),
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
    gold: (path?.gold ?? preset.gold) + (origin?.gold ?? 0),
    ac: 10,
    stats: { ...blankStats(), ...stats },
    statPoints: 0,
    conditions: [],
    skills,
    spells: magic ? [...preset.spells] : [],
    notes: "",
    reputation: { ...(origin?.reputation ?? {}) },
    ...sheet,
    talentPoints: veyra ? 2 : 0,
    guildRank: origin?.guildRank ?? "",
    origin: origin?.id ?? "",
    traits: race?.trait ?? "",
    lastStand: Boolean(race?.lastStand),
    naturalArmor: Boolean(race?.naturalArmor),
    isAlive: true,
  };

  const seeds = path?.items ?? preset.items;
  const inventory = seeds
    .filter((item) => magic || !item.magical)
    .map((item) => materialize(item, magic));
  if (origin?.guildRank) {
    inventory.push(materialize({ name: "Lonca kartı", type: "quest", subtype: "kart", description: `${origin.guildRank} rütbe. Serbest Kanat.`, weight: 0, value: 0 }, true));
  }

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
    worldTime: origin?.worldTime ?? pack.worldTime,
    location: origin?.location ?? pack.location,
    character,
    inventory,
    quests: [
      {
        id: uid(),
        title: (origin ?? pack).quest.title,
        description: (origin ?? pack).quest.description,
        status: "active",
        objectives: (origin ?? pack).quest.objectives.map((text) => ({ text, done: false })),
        reward: (origin ?? pack).quest.reward,
      },
    ],
    lore: [
      ...pack.lore.map((entry) => ({ ...entry, id: uid(), tags: [...entry.tags] })),
      ...(origin
        ? [{
            id: uid(),
            kind: "story" as const,
            title: origin.name,
            content: origin.lore,
            tags: [origin.id, origin.location],
            visibility: "player_visible" as const,
            alwaysInclude: true,
          }]
        : []),
    ],
    npcs: [
      {
        id: uid(),
        name: (origin ?? pack).npc.name,
        attitude: (origin ?? pack).npc.attitude,
        status: "alive",
        location: (origin ?? pack).npc.location,
        notes: (origin ?? pack).npc.notes,
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
