import type { GenreId, ItemType, LoreKind, Rarity, Skill, Slot, StatKey, Stats, ThemeId } from "./types";

export type ItemSeed = {
  name: string;
  type: ItemType;
  subtype?: string;
  description: string;
  lore?: string;
  rarity?: Rarity;
  weight: number;
  value: number;
  qty?: number;
  slot?: Slot | null;
  equipped?: boolean;
  stackable?: boolean;
  magical?: boolean;
  damage?: string;
  ac?: number;
  heal?: number;
  healMana?: number;
  stat?: StatKey;
  hands?: number;
};

export type ClassPreset = {
  id: string;
  name: string;
  blurb: string;
  stats: Stats;
  hp: number;
  mana: number;
  gold: number;
  skills: Skill[];
  spells: string[];
  items: ItemSeed[];
};

export type LoreSeed = {
  kind: LoreKind;
  title: string;
  content: string;
  tags: string[];
  visibility: "player_visible" | "ai_only";
  alwaysInclude: boolean;
};

export type GenrePack = {
  id: GenreId;
  title: string;
  pitch: string;
  currency: string;
  theme: ThemeId;
  magicDefault: boolean;
  worldTime: number;
  location: string;
  raceSuggestions: string[];
  classes: ClassPreset[];
  opening: (who: { name: string; className: string }) => string;
  lore: LoreSeed[];
  quest: { title: string; description: string; reward: string; objectives: string[] };
  npc: { name: string; attitude: number; location: string; notes: string };
};
