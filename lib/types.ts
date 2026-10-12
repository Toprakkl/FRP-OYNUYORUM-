export const STAT_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const STAT_LABEL: Record<StatKey, string> = {
  str: "Güç",
  dex: "Çeviklik",
  con: "Dayanıklılık",
  int: "Zeka",
  wis: "Sezgi",
  cha: "Karizma",
};

export const STAT_SHORT: Record<StatKey, string> = {
  str: "GÜÇ",
  dex: "ÇEV",
  con: "DAY",
  int: "ZEK",
  wis: "SEZ",
  cha: "KAR",
};

export const ITEM_TYPES = [
  "weapon",
  "armor",
  "shield",
  "accessory",
  "consumable",
  "tool",
  "material",
  "quest",
  "book",
  "key",
  "misc",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_LABEL: Record<ItemType, string> = {
  weapon: "Silah",
  armor: "Zırh",
  shield: "Kalkan",
  accessory: "Tılsım",
  consumable: "Tüketilir",
  tool: "Alet",
  material: "Malzeme",
  quest: "Görev",
  book: "Kitap",
  key: "Anahtar",
  misc: "Diğer",
};

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Sıradan",
  uncommon: "Az bulunur",
  rare: "Nadir",
  epic: "Destansı",
  legendary: "Efsanevi",
};

export const SLOTS = [
  "head",
  "chest",
  "legs",
  "feet",
  "hands",
  "main_hand",
  "off_hand",
  "ring_1",
  "ring_2",
  "neck",
  "back",
  "ranged",
] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABEL: Record<Slot, string> = {
  head: "Baş",
  chest: "Gövde",
  legs: "Bacak",
  feet: "Ayak",
  hands: "Eller",
  main_hand: "Ana el",
  off_hand: "Yan el",
  ring_1: "Yüzük",
  ring_2: "Yüzük II",
  neck: "Boyun",
  back: "Sırt",
  ranged: "Menzil",
};

export type ItemProps = {
  damage?: string;
  damageType?: string;
  stat?: StatKey;
  ac?: number;
  heal?: number;
  healMana?: number;
  hands?: number;
};

export type Item = {
  id: string;
  name: string;
  type: ItemType;
  subtype: string;
  description: string;
  lore: string;
  rarity: Rarity;
  weight: number;
  value: number;
  qty: number;
  stackable: boolean;
  slot: Slot | null;
  equippedSlot: Slot | null;
  magical: boolean;
  props: ItemProps;
};

export type Skill = { name: string; level: number };

export type Profession = { name: string; mp: number };

export type Advisor = { role: string; name: string; loyalty: number };

export const KINGDOM_STATS = ["treasury", "army", "people", "stability", "influence", "legitimacy", "population"] as const;
export type KingdomStat = (typeof KINGDOM_STATS)[number];

export type Kingdom = {
  name: string;
  tier: number;
  population: number;
  treasury: number;
  army: number;
  people: number;
  stability: number;
  influence: number;
  legitimacy: number;
  buildings: string[];
  advisors: Advisor[];
  boons: string[];
  pendingEvent: number;
};

export type Companion = { id: string; name: string; loyalty: number; note: string };

export type Character = {
  name: string;
  className: string;
  race: string;
  age: number;
  gender: string;
  appearance: string;
  personality: string;
  backstory: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  ac: number;
  stats: Stats;
  statPoints: number;
  conditions: string[];
  skills: Skill[];
  spells: string[];
  notes: string;
  reputation: Record<string, number>;
  honor: number;
  talentPoints: number;
  talents: string[];
  peakGifts: number;
  guildPoints: number;
  guildRank: string;
  origin: string;
  oath: string;
  traits: string;
  lastStand: boolean;
  naturalArmor: boolean;
  profession: Profession | null;
  sideProfession: Profession | null;
  fatigue: number;
  homeTier: number;
  portraitDataUrl?: string;
  isAlive: boolean;
};

export type GenreId = "veyra" | "orta_cag" | "istihbarat" | "distopya" | "bilimkurgu" | "ozel";
export type ThemeId = "veyra" | "orta_cag" | "istihbarat" | "distopya" | "bilimkurgu";
export type Difficulty = "kolay" | "normal" | "sert";
export type Tone = "kisa" | "normal" | "detayli";

export const GENRE_LABEL: Record<GenreId, string> = {
  veyra: "VEYRA: DOĞUŞ",
  orta_cag: "Orta Çağ",
  istihbarat: "Modern istihbarat",
  distopya: "Distopya",
  bilimkurgu: "Bilimkurgu",
  ozel: "Özel dünya",
};

export const THEME_LABEL: Record<ThemeId, string> = {
  veyra: "Kızıl Yıldız",
  orta_cag: "Parşömen",
  istihbarat: "Gece vardiyası",
  distopya: "Pas",
  bilimkurgu: "Güverte",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  kolay: "Kolay",
  normal: "Normal",
  sert: "Sert",
};

export const TONE_LABEL: Record<Tone, string> = {
  kisa: "Kısa",
  normal: "Normal",
  detayli: "Ayrıntılı",
};

export type GameSettings = {
  genre: GenreId;
  customGenre: string;
  theme: ThemeId;
  magic: boolean;
  difficulty: Difficulty;
  tone: Tone;
  realism: boolean;
  adult: boolean;
  adultConfirmed: boolean;
  customRules: string;
  currency: string;
};

export type LoreKind =
  | "world"
  | "story"
  | "location"
  | "npc"
  | "faction"
  | "rule"
  | "creature"
  | "quest_seed";

export const LORE_LABEL: Record<LoreKind, string> = {
  world: "Dünya",
  story: "Hikâye",
  location: "Mekan",
  npc: "Kişi",
  faction: "Grup",
  rule: "Kural",
  creature: "Yaratık",
  quest_seed: "Görev tohumu",
};

export type LoreEntry = {
  id: string;
  kind: LoreKind;
  title: string;
  content: string;
  tags: string[];
  visibility: "player_visible" | "ai_only";
  alwaysInclude: boolean;
};

export type NpcStatus = "alive" | "dead" | "missing";

export type Npc = {
  id: string;
  name: string;
  attitude: number;
  status: NpcStatus;
  location: string;
  notes: string;
  bond: number;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  status: "active" | "completed" | "failed";
  objectives: { text: string; done: boolean }[];
  reward: string;
};

export type JournalEntry = {
  id: string;
  content: string;
  createdAt: string;
};

export type DiceResolved = {
  natural: number;
  stat: StatKey | null;
  modifier: number;
  total: number;
  dc: number;
  reason?: string;
};

export type ChatMessage = {
  id: string;
  role: "player" | "ai" | "system";
  content: string;
  dice?: DiceResolved | null;
  effects?: string[];
  createdAt: string;
};

export type GameEvent = {
  id: string;
  source: "ai" | "manual" | "system";
  summary: string;
  createdAt: string;
};

export type Snapshot = {
  character: Character;
  inventory: Item[];
  quests: Quest[];
  npcs: Npc[];
  location: string;
  worldTime: number;
  journal: JournalEntry[];
  events: GameEvent[];
  summary: string;
  kingdom?: Kingdom | null;
  companions?: Companion[];
  weather?: string;
};

export type HistoryEntry = {
  label: string;
  messageCount: number;
  snap: Snapshot;
};

export type Game = {
  id: string;
  title: string;
  settings: GameSettings;
  summary: string;
  summarizedMessageCount: number;
  worldTime: number;
  location: string;
  character: Character;
  inventory: Item[];
  quests: Quest[];
  lore: LoreEntry[];
  npcs: Npc[];
  messages: ChatMessage[];
  events: GameEvent[];
  journal: JournalEntry[];
  history: HistoryEntry[];
  kingdom: Kingdom | null;
  companions: Companion[];
  weather: string;
  createdAt: string;
  updatedAt: string;
};

export type TabId = "character" | "inventory" | "quests" | "world" | "log" | "settings" | "profession" | "kingdom";
