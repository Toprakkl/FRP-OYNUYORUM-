import { modifier } from "./dice";
import { clamp, sameName } from "./format";
import type { ClassPreset, GenrePack, ItemSeed, LoreSeed } from "./presets";
import { STAT_KEYS, type Character, type DiceResolved, type Game, type StatKey, type Stats } from "./types";

export type VeyraRace = {
  id: string;
  name: string;
  bonuses: Partial<Stats>;
  trait: string;
  age: number;
  essence: number;
  luck?: boolean;
  lastStand?: boolean;
  naturalArmor?: boolean;
};

export type VeyraPath = {
  id: string;
  name: string;
  blurb: string;
  die: number;
  average: number;
  essenceStat: StatKey | null;
  caster: boolean;
  trees: string[];
  skills: { name: string; level: number }[];
  gold: number;
  items: ItemSeed[];
};

export type VeyraOrigin = {
  id: string;
  name: string;
  pitch: string;
  location: string;
  worldTime: number;
  gold: number;
  guildRank: string;
  reputation: Record<string, number>;
  quest: GenrePack["quest"];
  npc: GenrePack["npc"];
  lore: string;
  opening: (who: { name: string; className: string }) => string;
};

export type TalentNode = { id: string; name: string; tier: 1 | 2 | 3 | 4 | 5; text: string; spell?: boolean };
export type TalentTree = { id: string; name: string; nodes: TalentNode[] };

const COST = [0, 1, 2, 3, 4, 5, 7, 9];

export function pointCost(score: number): number {
  const value = Math.round(score);
  if (value <= 8) return 0;
  if (value >= 15) return 9;
  return COST[value - 8] ?? 9;
}

export function pointSpent(stats: Stats): number {
  return STAT_KEYS.reduce((sum, key) => sum + pointCost(stats[key]), 0);
}

export function applyRace(base: Stats, race: VeyraRace | undefined, boosts: StatKey[]): Stats {
  const next = { ...base };
  if (race) {
    for (const key of STAT_KEYS) next[key] += race.bonuses[key] ?? 0;
  }
  if (race?.id === "insan") {
    for (const key of [...new Set(boosts)].slice(0, 2)) next[key] += 1;
  }
  for (const key of STAT_KEYS) next[key] = clamp(next[key], 1, 18);
  return next;
}

export const RACES: VeyraRace[] = [
  { id: "insan", name: "İnsan", bonuses: {}, trait: "İki özelliğe +1 ve fazladan bir beceri rütbesi.", age: 24, essence: 0 },
  { id: "yuksek-elf", name: "Yüksek Elf", bonuses: { int: 2, dex: 1 }, trait: "Öz havuzu +2. Uzun ömür, kadim alışkanlık.", age: 180, essence: 2 },
  { id: "orman-elf", name: "Orman Elfi", bonuses: { dex: 2, wis: 1 }, trait: "Ormanda gizlilik +2.", age: 90, essence: 0 },
  { id: "gece-elf", name: "Gece Elfi", bonuses: { dex: 2, cha: 1 }, trait: "Karanlıkta görür.", age: 110, essence: 0 },
  { id: "cuce", name: "Cüce", bonuses: { con: 2, str: 1 }, trait: "Zehir direnci.", age: 70, essence: 0 },
  { id: "kucuk", name: "Küçük Halk", bonuses: { dex: 2, cha: 1 }, trait: "Doğal 1 gelirse zar bir kez daha atılır.", age: 28, essence: 0, luck: true },
  { id: "ork", name: "Ork", bonuses: { str: 2, con: 1 }, trait: "Can sıfıra düşünce bir kez 1 canla kalır.", age: 22, essence: 0, lastStand: true },
  { id: "goblin", name: "Goblin", bonuses: { dex: 2, int: 1 }, trait: "Kaçış ve tuzakta +2.", age: 20, essence: 0 },
  { id: "kurtkanli", name: "Kurtkanlı", bonuses: { dex: 2, wis: 1 }, trait: "Koku ve iz sürme +2.", age: 24, essence: 0 },
  { id: "ejderkan", name: "Ejderkan", bonuses: { str: 2, cha: 1 }, trait: "Nefes saldırısı günde bir kez.", age: 30, essence: 0 },
  { id: "kul", name: "Kül Soylu", bonuses: { cha: 2, int: 1 }, trait: "Ateş direnci. Boynuz ve kızıl göz şüphe çeker.", age: 26, essence: 0 },
  { id: "gok", name: "Gökkanlı", bonuses: { wis: 2, cha: 1 }, trait: "Günde bir kez küçük bir şifa.", age: 28, essence: 0 },
  { id: "pullu", name: "Pullu", bonuses: { con: 2, wis: 1 }, trait: "Suda nefes alır. Doğal zırh +1.", age: 24, essence: 0, naturalArmor: true },
  { id: "dalga", name: "Dalgasoylu", bonuses: { con: 2, cha: 1 }, trait: "Suda hızın ikiye katlanır.", age: 26, essence: 0 },
  { id: "oz", name: "Öz-Varlık", bonuses: { int: 2, con: 1 }, trait: "Büyü hasarına direnç.", age: 20, essence: 0 },
  { id: "solgun", name: "Solgun", bonuses: {}, trait: "Ölümsüz beden yemez; güneş altında yorulur. Kitap tablosunda sayısal bonus yok.", age: 30, essence: 0 },
];

const sword: ItemSeed = { name: "Demir kılıç", type: "weapon", subtype: "kılıç", description: "Lonca tezgâhından çıkmış düz kılıç.", weight: 1.5, value: 15, slot: "main_hand", equipped: true, damage: "1d8", stat: "str" };
const dagger: ItemSeed = { name: "Hançer", type: "weapon", subtype: "hançer", description: "Kısa, sessiz, cep dostu.", weight: 0.4, value: 8, slot: "main_hand", equipped: true, damage: "1d4", stat: "dex" };
const bread: ItemSeed = { name: "Ekmek", type: "consumable", description: "Sert ama doyurucu.", weight: 0.3, value: 1, qty: 2, stackable: true, heal: 2 };

export const PATHS: VeyraPath[] = [
  {
    id: "savasci",
    name: "Savaşçı",
    blurb: "Can zarı d10. Kılıç, kalkan ve ağır silah. Öz'ü bedeninde taşır.",
    die: 10,
    average: 6,
    essenceStat: null,
    caster: false,
    trees: ["kilic", "kalkan", "agir"],
    skills: [
      { name: "Atletizm", level: 1 },
      { name: "Savuşturma", level: 1 },
    ],
    gold: 12,
    items: [sword, { name: "Eski kalkan", type: "shield", subtype: "kalkan", description: "Kenarı çentikli, hâlâ tutuyor.", weight: 3, value: 10, slot: "off_hand", equipped: true, ac: 2 }, bread],
  },
  {
    id: "avci",
    name: "Avcı",
    blurb: "Can zarı d8. Ok, iz ve ormanın dili.",
    die: 8,
    average: 5,
    essenceStat: "wis",
    caster: false,
    trees: ["ok", "doga"],
    skills: [
      { name: "Atıcılık", level: 1 },
      { name: "Hayatta Kalma", level: 1 },
      { name: "İz Sürme", level: 1 },
    ],
    gold: 10,
    items: [
      { name: "Kısa yay", type: "weapon", subtype: "yay", description: "Siniri yeni.", weight: 1, value: 20, slot: "ranged", equipped: true, damage: "1d6", stat: "dex" },
      dagger,
      { name: "Halat", type: "tool", description: "On adım.", weight: 1, value: 1 },
    ],
  },
  {
    id: "golge",
    name: "Gölge",
    blurb: "Can zarı d8. Kilit, cep ve Vael'in karanlığı.",
    die: 8,
    average: 5,
    essenceStat: "dex",
    caster: true,
    trees: ["giz", "golge"],
    skills: [
      { name: "Gizlilik", level: 1 },
      { name: "Kilit Açma", level: 1 },
    ],
    gold: 14,
    items: [dagger, { name: "Maymuncuk", type: "tool", subtype: "alet", description: "İki tel, bir kanca.", weight: 0.1, value: 12 }, { name: "Koyu pelerin", type: "armor", subtype: "pelerin", description: "Yağmurda bir leke.", weight: 1, value: 6, slot: "back", equipped: true, ac: 1 }],
  },
  {
    id: "buyucu",
    name: "Büyücü",
    blurb: "Can zarı d6. Kadim Öz ve rün. Öz havuzun derin, bedenin ince.",
    die: 6,
    average: 4,
    essenceStat: "int",
    caster: true,
    trees: ["kadim", "run"],
    skills: [
      { name: "Öz Bilgisi", level: 1 },
      { name: "Tarih", level: 1 },
    ],
    gold: 8,
    items: [
      { name: "Meşe asa", type: "weapon", subtype: "asa", description: "Ucu isli.", weight: 1.2, value: 5, slot: "main_hand", equipped: true, damage: "1d6", stat: "int", magical: true },
      { name: "Boş defter", type: "book", description: "Sayfaları mühürsüz.", weight: 0.4, value: 3 },
    ],
  },
  {
    id: "rahip",
    name: "Rahip",
    blurb: "Can zarı d8. Işık Özü. Aen'in adı dilinde, elinde şifa.",
    die: 8,
    average: 5,
    essenceStat: "wis",
    caster: true,
    trees: ["isik"],
    skills: [
      { name: "İlk Yardım", level: 1 },
      { name: "İkna", level: 1 },
    ],
    gold: 8,
    items: [
      { name: "Şafak asası", type: "weapon", subtype: "asa", description: "Aen güneşi kabzaya işli.", weight: 1.4, value: 8, slot: "main_hand", equipped: true, damage: "1d6", stat: "wis", magical: true },
      { name: "Aen sembolü", type: "accessory", subtype: "kolye", description: "Sıcak metal.", weight: 0.1, value: 5, slot: "neck", equipped: true },
      { name: "Şifa otu", type: "consumable", description: "Acı, temiz.", weight: 0.1, value: 4, heal: 4 },
    ],
  },
  {
    id: "druid",
    name: "Druid",
    blurb: "Can zarı d8. Doğa Özü. Iryn'in ormanı seni dinler.",
    die: 8,
    average: 5,
    essenceStat: "wis",
    caster: true,
    trees: ["doga"],
    skills: [
      { name: "Hayatta Kalma", level: 1 },
      { name: "Hayvan Terbiyesi", level: 1 },
    ],
    gold: 6,
    items: [
      { name: "Kök değnek", type: "weapon", subtype: "asa", description: "Hâlâ yeşil bir filiz var.", weight: 1, value: 4, slot: "main_hand", equipped: true, damage: "1d6", stat: "wis", magical: true },
      { name: "Ot çantası", type: "tool", description: "Kurutulmuş yaprak.", weight: 0.4, value: 2 },
    ],
  },
  {
    id: "olum",
    name: "Ölüm Çağırıcı",
    blurb: "Can zarı d6. Ölüm Özü. Nekrodur bunu yasaklar sayar, sen henüz onların değilsin.",
    die: 6,
    average: 4,
    essenceStat: "int",
    caster: true,
    trees: ["olum"],
    skills: [
      { name: "Öz Bilgisi", level: 1 },
      { name: "Gözdağı", level: 1 },
    ],
    gold: 8,
    items: [
      { name: "Kemik hançer", type: "weapon", subtype: "hançer", description: "Sapı sararmış.", weight: 0.4, value: 10, slot: "main_hand", equipped: true, damage: "1d4", stat: "int", magical: true },
      { name: "Siyah mum", type: "tool", description: "Alevi rüzgârda eğilmez.", weight: 0.2, value: 2 },
    ],
  },
  {
    id: "bard",
    name: "Bard",
    blurb: "Can zarı d8. Dil, pazarlık ve el işi. Sahneyi konuşarak çevirirsin.",
    die: 8,
    average: 5,
    essenceStat: "cha",
    caster: false,
    trees: ["diplomasi", "zanaat"],
    skills: [
      { name: "İkna", level: 1 },
      { name: "Yalan", level: 1 },
      { name: "Pazarlık", level: 1 },
    ],
    gold: 16,
    items: [dagger, { name: "Lavta", type: "tool", subtype: "çalgı", description: "Üç teli yeni.", weight: 1.2, value: 15, slot: "off_hand" }],
  },
];

export const SKILLS: { name: string; stat: string; use: string }[] = [
  { name: "Parkur", stat: "Çev", use: "Atlama, çatı" },
  { name: "Tırmanma", stat: "Güç", use: "Duvar, halat" },
  { name: "Gizlilik", stat: "Çev", use: "Fark edilmeden" },
  { name: "Kilit Açma", stat: "Çev", use: "Kilit ve tuzak" },
  { name: "Cep Hırsızlığı", stat: "Çev", use: "Eşya aşırma" },
  { name: "Atletizm", stat: "Güç", use: "İtme, yüzme" },
  { name: "Savuşturma", stat: "Çev", use: "Saldırıdan kaçış" },
  { name: "Atıcılık", stat: "Çev", use: "Yay ve fırlatma" },
  { name: "Gözlem", stat: "Sezgi", use: "Detay, yalan, tuzak" },
  { name: "Hayatta Kalma", stat: "Sezgi", use: "Yön, av, kamp" },
  { name: "İz Sürme", stat: "Sezgi", use: "Takip" },
  { name: "Hayvan Terbiyesi", stat: "Sezgi", use: "Binek" },
  { name: "İlk Yardım", stat: "Zeka", use: "Yara ve zehir" },
  { name: "Simya", stat: "Zeka", use: "İksir" },
  { name: "Zanaat", stat: "Güç / Zeka", use: "Tamir, demir" },
  { name: "Öz Bilgisi", stat: "Zeka", use: "Büyü ve rün" },
  { name: "Tarih", stat: "Zeka", use: "Kadim bilgi" },
  { name: "İkna", stat: "Karizma", use: "Yönlendirme" },
  { name: "Pazarlık", stat: "Karizma", use: "Fiyat" },
  { name: "Yalan", stat: "Karizma", use: "İnandırma" },
  { name: "Gözdağı", stat: "Güç / Kar", use: "Korkutma" },
];

function nodes(id: string, name: string, rows: [string, string, boolean?][]): TalentTree {
  return {
    id,
    name,
    nodes: rows.map(([nodeName, text, spell], index) => ({
      id: `${id}-${index + 1}`,
      name: nodeName,
      tier: (index + 1) as TalentNode["tier"],
      text,
      spell: Boolean(spell),
    })),
  };
}

export const TREES: TalentTree[] = [
  nodes("kilic", "Kılıç Yolu", [
    ["Keskin Duruş", "Kılıçla saldırı +1."],
    ["Karşı Hamle", "Turda bir tepki vuruşu."],
    ["Rüzgâr Kesen", "Tek hamlede iki hedef."],
    ["Yüz Adım", "Üç ardışık saldırı."],
    ["Tek Vuruş", "Kritik 19-20'de zırhı yok sayar."],
  ]),
  nodes("kalkan", "Kalkan Yolu", [
    ["Sağlam Duruş", "Kalkanla zırh sınıfı +1."],
    ["Kalkan Duvarı", "Yanındaki müttefiki korur."],
    ["Çelik Deri", "Alınan hasar −2."],
    ["Yıkılmaz", "Günde bir kez 1 canla kal."],
    ["Kale", "Bir tur hasar yarıya iner."],
  ]),
  nodes("agir", "Ağır Silah Yolu", [
    ["Güçlü Vuruş", "Hasar +2."],
    ["Zırh Kıran", "Hedefin zırhı −2."],
    ["Yer Sarsan", "Alan hasarı."],
    ["Savaş Öfkesi", "3 tur hasar +4, zırh −2."],
    ["Dağ Yıkan", "Günde bir kez üç kat hasar zarı."],
  ]),
  nodes("ok", "Okçuluk Yolu", [
    ["Sabit Nişan", "Menzilli saldırı +1."],
    ["Çift Ok", "İki hedefe bir atış."],
    ["Ok Yağmuru", "Alan saldırısı."],
    ["Hayalet Ok", "Gizlilikten kritik."],
    ["Yüzyılın Atışı", "Günde bir kez otomatik kritik."],
  ]),
  nodes("kadim", "Kadim Öz", [
    ["Öz Oku", "2 Öz. 1d8 hasar.", true],
    ["Öz Kalkanı", "4 Öz. Kısa süreli koruma.", true],
    ["Elemental Patlama", "8 Öz. Alan hasarı.", true],
    ["Mekân Bükme", "14 Öz. Kısa ışınlanma.", true],
    ["Kıyamet Dalgası", "25 Öz. Geniş ve ağır hasar.", true],
  ]),
  nodes("isik", "Işık Özü", [
    ["Şifa Dokunuşu", "2 Öz. Yakın şifa.", true],
    ["Kutsal Kalkan", "4 Öz.", true],
    ["Arındırma", "8 Öz. Zehir ve lanet temizler.", true],
    ["Diriliş", "14 Öz. Yeni ölmüş birini geri getirir.", true],
    ["Aen'in Gazabı", "25 Öz. Ölümsüz ve şeytana karşı ışık.", true],
  ]),
  nodes("golge", "Gölge Özü", [
    ["Gölgede Yürü", "2 Öz.", true],
    ["Yanılsama", "4 Öz. Bir kopya.", true],
    ["Ruh Kelepçesi", "8 Öz. Hedefi tutar.", true],
    ["Gece Mantosu", "14 Öz. Görünmezlik.", true],
    ["Sonsuz Gece", "25 Öz. Alanı karanlığa gömer.", true],
  ]),
  nodes("doga", "Doğa Özü", [
    ["Hayvan Dili", "2 Öz.", true],
    ["Diken Duvarı", "4 Öz.", true],
    ["Şekil Değiştirme", "8 Öz. Hayvan formu.", true],
    ["Fırtına Çağırma", "14 Öz.", true],
    ["Orman Ruhu", "25 Öz. Dev koruyucu çağırır.", true],
  ]),
  nodes("olum", "Ölüm Özü", [
    ["Kemik Hizmetkârı", "2 Öz.", true],
    ["Can Emme", "4 Öz.", true],
    ["Hortlak Çağırma", "8 Öz.", true],
    ["Ruh Bağı", "14 Öz. Hasarı bağlı varlığa aktarır.", true],
    ["Ölüm Ordusu", "25 Öz. On solgun çağırır.", true],
  ]),
  nodes("run", "Rün Özü", [
    ["Rün Kazı", "2 Öz. Eşyaya +1.", true],
    ["Koruyucu Rün", "4 Öz.", true],
    ["Patlayıcı Rün", "8 Öz. Tuzak.", true],
    ["Büyük Mühür", "14 Öz. Kapı ya da canavar mühürler.", true],
    ["Efsane Rün", "25 Öz. Eşyaya +3.", true],
  ]),
  nodes("giz", "Gizlilik Yolu", [
    ["Sessiz Adım", "Gizlilik +1."],
    ["Arkadan Vuruş", "+1d6 hasar."],
    ["Cep Ustası", "Cep hırsızlığı kolaylaşır."],
    ["Kaçış Ustası", "Tutulmaktan kurtulmak kolaylaşır."],
    ["Hayalet", "Bir tur görünmez ve dokunulmaz."],
  ]),
  nodes("diplomasi", "Diplomasi Yolu", [
    ["Tatlı Dil", "İkna +2."],
    ["İnsan Okuma", "Yalanı ve niyeti sezer."],
    ["Karizmatik Lider", "Müttefiklere +1."],
    ["Entrikacı", "İki taraftan da pay çıkarır."],
    ["Efsanevi Ses", "Tüm sahneyi etkileyen konuşma."],
  ]),
  nodes("zanaat", "Zanaat ve Simya", [
    ["Tamirci", "Kırık eşyayı toparlar."],
    ["Simyacı", "İksir üretir."],
    ["Usta Demirci", "Nadir eşya üretir."],
    ["Mühendis Dehası", "Tuzak ve mekanizma."],
    ["Efsane Eşya", "Efsanevi eşya üretir."],
  ]),
];

const TIER_LEVEL = [0, 1, 5, 12, 25, 40];
const TIER_COST = [0, 1, 2, 3, 5, 8];

export const OATHS = [
  { name: "Kılıç Yemini", text: "Kılıcı yalnız savunma ve adalet için çek. Haklı çatışmada saldırı +1. Bozarsan −10 Onur." },
  { name: "Şövalye Yemini", text: "Güçsüzü koru, düşmandan kaçma. Zırh +1, korkuya bağışık. Bozarsan −15 Onur." },
  { name: "Sessizlik Yemini", text: "Bir sırrı kimseye söyleme. O sırla ilgili Sezgi +2. Bozarsan −10 Onur." },
  { name: "Yoksulluk Yemini", text: "100 altından fazlasını biriktirme. Her seviyede +2 can. Bozarsan −10 Onur." },
  { name: "Sadakat Yemini", text: "Bir kişiye ya da loncaya bağlan. Yanındayken tüm zarlar +1. Bozarsan −20 Onur." },
];

export const GUILD = [
  { name: "Bakır", level: 1, lp: 0 },
  { name: "Demir", level: 5, lp: 100 },
  { name: "Gümüş", level: 12, lp: 500 },
  { name: "Altın", level: 25, lp: 2000 },
  { name: "Platin", level: 40, lp: 8000 },
  { name: "Elmas", level: 60, lp: 25000 },
  { name: "Efsane", level: 80, lp: 80000 },
];

export function nextGuildRank(rank: string, level: number, lp: number): string | null {
  const order = ["", ...GUILD.map((entry) => entry.name)];
  const index = order.indexOf(rank);
  if (index < 0 || index >= GUILD.length) return null;
  const next = GUILD[index];
  if (level >= next.level && lp >= next.lp) return next.name;
  return null;
}

export function honorTitle(honor: number): { name: string; note: string } {
  if (honor >= 76) return { name: "Yüce", note: "Soylular ve rahipler kapı açar" };
  if (honor >= 41) return { name: "Onurlu", note: "Adalet görevleri açılır" };
  if (honor >= 11) return { name: "Güvenilir", note: "Pazarlıkta +1" };
  if (honor >= -10) return { name: "Sıradan", note: "Sicilin sade" };
  if (honor >= -40) return { name: "Şüpheli", note: "Onurlu kişiler temkinli" };
  if (honor >= -75) return { name: "Alçak", note: "Onurlu loncalar kapanır" };
  return { name: "Lanetli", note: "Ödül avcıları peşinde" };
}

export function statCap(level: number): number {
  if (level >= 80) return 30;
  if (level >= 60) return 28;
  if (level >= 40) return 24;
  return 20;
}

export function rankCap(level: number): number {
  if (level >= 40) return 5;
  if (level >= 25) return 4;
  if (level >= 10) return 3;
  return 2;
}

export function levelCap(genre: string): number {
  return genre === "veyra" ? 100 : 20;
}

export function skillRankBonus(skills: { name: string; level: number }[], skill?: string): number {
  if (!skill) return 0;
  const found = skills.find((entry) => sameName(entry.name, skill));
  if (!found) return 0;
  return clamp(found.level, 0, 5) * 2;
}

export function withSkillBonus(dice: DiceResolved, game: Game, skill?: string): DiceResolved {
  if (game.settings.genre !== "veyra") return dice;
  const extra = skillRankBonus(game.character.skills, skill);
  const fatigue = clamp(game.character.fatigue || 0, 0, 5);
  const delta = extra - fatigue;
  if (!delta) return dice;
  return { ...dice, modifier: dice.modifier + delta, total: dice.total + delta };
}

export function raceByName(name: string): VeyraRace | undefined {
  const key = name.trim().toLocaleLowerCase("tr");
  return RACES.find((race) => race.name.toLocaleLowerCase("tr") === key);
}

export function pathById(id?: string): VeyraPath {
  return PATHS.find((path) => path.id === id) ?? PATHS[0];
}

export function pathByName(name: string): VeyraPath | undefined {
  const key = name.trim().toLocaleLowerCase("tr");
  return PATHS.find((path) => path.name.toLocaleLowerCase("tr") === key || path.id === key);
}

export function getOrigin(id?: string): VeyraOrigin {
  return ORIGINS.find((origin) => origin.id === id) ?? ORIGINS[0];
}

export function essenceMax(path: VeyraPath, level: number, stats: Stats, race?: VeyraRace): number {
  const mod = path.essenceStat ? modifier(stats[path.essenceStat] ?? 10) : 0;
  const base = path.caster ? 10 + 3 * level + Math.max(0, 2 * mod) : 5 + 2 * level;
  return Math.max(0, base + (race?.essence ?? 0));
}

export function findNode(id: string): { tree: TalentTree; node: TalentNode; previous?: TalentNode } | null {
  for (const tree of TREES) {
    const index = tree.nodes.findIndex((node) => node.id === id);
    if (index >= 0) return { tree, node: tree.nodes[index], previous: tree.nodes[index - 1] };
  }
  return null;
}

export function unlockPlan(character: Character, nodeId: string): { cost: number; usePeak: boolean } | { error: string } {
  const found = findNode(nodeId);
  if (!found) return { error: "Yetenek yok" };
  if (character.talents.includes(found.node.id)) return { error: "Zaten açık" };
  if (found.previous && !character.talents.includes(found.previous.id)) return { error: "Önceki kademe kapalı" };
  if (character.level < TIER_LEVEL[found.node.tier]) return { error: `Seviye ${TIER_LEVEL[found.node.tier]} gerek` };
  const path = pathByName(character.className);
  const onPath = Boolean(path?.trees.includes(found.tree.id));
  const cost = TIER_COST[found.node.tier] + (onPath ? 0 : 1);
  if (character.talentPoints >= cost) return { cost, usePeak: false };
  if (character.peakGifts > 0) return { cost: 0, usePeak: true };
  return { error: "Yetenek puanı yetmiyor" };
}

export function blankVeyraSheet(): Pick<Character, "honor" | "talentPoints" | "talents" | "peakGifts" | "guildPoints" | "guildRank" | "origin" | "oath" | "traits" | "lastStand" | "naturalArmor"> {
  return {
    honor: 0,
    talentPoints: 0,
    talents: [],
    peakGifts: 0,
    guildPoints: 0,
    guildRank: "",
    origin: "",
    oath: "",
    traits: "",
    lastStand: false,
    naturalArmor: false,
  };
}

const sky = "Gökyüzünde Kızıl Yıldız duruyor. Yıl YT 1247. Parçalanma'dan bu yana bin iki yüz kırk yedi yıl geçti ve kimse yıldızın ne istediğini bilmiyor.";

export const ORIGINS: VeyraOrigin[] = [
  {
    id: "lonca",
    name: "Serbest Kanat acemisi",
    pitch: "Lormarin'de Bakır rütbe. İlk görev tahtada.",
    location: "Lormarin, Serbest Kanat",
    worldTime: 9,
    gold: 8,
    guildRank: "Bakır",
    reputation: { "Serbest Kanat": 10 },
    quest: {
      title: "Bakır tahta",
      description: "Serbest Kanat'ın Lormarin şubesi sana ilk D rütbe işi verdi. Kuzey yolunda kurt izi ve kayıp bir kervan çanı var.",
      reward: "5 altın, 20 XP, 5 lonca puanı",
      objectives: ["Görevli Marta'dan işi al", "Kuzey yolundaki izi oku", "Çanı ya da haberini loncaya getir"],
    },
    npc: { name: "Marta", attitude: 10, location: "Lormarin, Serbest Kanat", notes: "Görev salonu kâtibi. Bakır rütbelilere sert, dürüst olana yumuşak. Valdrenia kültüründe söz ve hizmet onurdur." },
    lore: "Lormarin, Valdrenia'nın başkenti. Kral Aldric hasta, üç varis kavga ediyor, şehir henüz bunu sokakta bağırmıyor. Serbest Kanat savaşa taraf olmaz. Lonca kartın Bakır.",
    opening: ({ name, className }) =>
      `${sky}\n\nLormarin'in lonca salonunda tahta hâlâ ıslak mürekkep kokuyor. Marta sana bir Bakır kart ve kuzey yolunu işaret eden bir kâğıt uzatır. Kervan çanı üç gündür suskun.\n\nAdın ${name}. Yolun ${className}. İlk işin küçük. Dünya henüz değil.`,
  },
  {
    id: "valdrenia",
    name: "Valdrenia köylüsü",
    pitch: "Altın Ovalar'da küçük bir köy. Savaş yaklaşıyor.",
    location: "Külova, Altın Ovalar",
    worldTime: 19,
    gold: 4,
    guildRank: "",
    reputation: { Valdrenia: 8 },
    quest: {
      title: "Suskun çan",
      description: "Külova'nın çanı akşam çalmadı. Muhtar, kuzey tarlasında kaybolan kervanı soruyor.",
      reward: "Köyün ekmeği, 20 XP",
      objectives: ["Muhtar Sera ile konuş", "Kuzey tarlasındaki izi bul", "Köye bir haber getir"],
    },
    npc: { name: "Sera", attitude: 15, location: "Külova", notes: "Köy muhtarı. Sözünün eri. Krala bağlı, ork sınırından korkuyor." },
    lore: "Külova, Valdrenia'nın Altın Ovaları'nda bir köy. Kral Aldric hasta. Gorzakh sınırı geriliyor. Köy henüz bir ordu görmedi.",
    opening: ({ name, className }) =>
      `${sky}\n\nKülova'da akşam ezanı çalmaz. Tarla çamuru botuna yapışır, muhtar Sera han kapısında seni bekler. Kuzeye giden kervandan yalnız bir çan kayışı dönmüş.\n\nAdın ${name}. Yolun ${className}. Köy küçük. Gök değil.`,
  },
  {
    id: "vaelmoor",
    name: "Ay Kulesi öğrencisi",
    pitch: "Vaelmoor'da büyü, entrika ve eksik bir sayfa.",
    location: "Ay Kulesi, Vaelmoor",
    worldTime: 21,
    gold: 6,
    guildRank: "",
    reputation: { "Ay Kulesi": 8 },
    quest: {
      title: "Eksik sayfa",
      description: "Kalfa Iven, yasak rafa çıkmadan bir sayfanın kopyasını istiyor. Sayfa Parçalanma'dan söz ediyor ama yeri yazmıyor.",
      reward: "Kule izni, 25 XP",
      objectives: ["Iven'in verdiği raf numarasını bul", "Sayfayı oku ama çalma", "Ne anladığını Iven'e anlat"],
    },
    npc: { name: "Iven", attitude: 5, location: "Ay Kulesi", notes: "Kalfa. Meraklı, korkak, Arşi-Büyücü Meridian Ay'ın adını gereksiz yere anmaz." },
    lore: "Vaelmoor serbest şehirdir. Ay Kulesi kıtanın en büyük büyü okuludur. Dokuzlu Konsey yönetir. Yasak raf öğrenciyi içeri almaz; Iven bir kopya istiyor, çekirdeklerin yerini bilmiyor.",
    opening: ({ name, className }) =>
      `${sky}\n\nAy Kulesi'nin merdiveni mürekkep ve ozon kokar. Kalfa Iven sana bir raf numarası fısıldar ve kendi adının bu işte geçmemesini ister. Aşağıda Vaelmoor'un üç nehri lamba yakmış.\n\nAdın ${name}. Yolun ${className}. Çırağın. Arşi-Büyücü değilsin.`,
  },
  {
    id: "hrimgard",
    name: "Hrimgard klan savaşçısı",
    pitch: "Frostheim kapısı. Kış geliyor, akın vakti.",
    location: "Frostheim kapısı",
    worldTime: 7,
    gold: 10,
    guildRank: "",
    reputation: { Hrimgard: 10 },
    quest: {
      title: "Kayıp izci",
      description: "Brynn'in kardeşi fırtınadan önce dönmedi. Jarl henüz ordu kaldırmadı.",
      reward: "Klan ekmeği, 20 XP",
      objectives: ["Brynn'den izcinin yönünü al", "Kar izini oku", "Sağ ya da ölü haberini getir"],
    },
    npc: { name: "Brynn", attitude: 12, location: "Frostheim kapısı", notes: "Kalkan kardeşin. Hrimgard'da savaştan kaçmak en büyük lekedir. Cesur, aceleci." },
    lore: "Hrimgard on bir klan. Jarl-Kral Ulfgar Buzdiş Frostheim'da. Kış akınları başlamak üzere. Birlik kırılgan.",
    opening: ({ name, className }) =>
      `${sky}\n\nFrostheim'ın kapısı buz tutmuş. Brynn nefesini avucunda ısıtır ve kardeşinin adını bir kez söyler. Fırtına henüz inmemiş. Jarl hâlâ içerde.\n\nAdın ${name}. Yolun ${className}. Klan seni izliyor.`,
  },
  {
    id: "yesiloz",
    name: "Yeşilöz vatandaşı",
    pitch: "Kök Şehri. Canavarların yeni ulusu.",
    location: "Kök Şehri",
    worldTime: 11,
    gold: 3,
    guildRank: "",
    reputation: { Yeşilöz: 12 },
    quest: {
      title: "Sınır elçisi",
      description: "Eşitlik elçisi Pıtır, orman sınırında suskun. Ayrık bunu bir emir gibi söylemez. Ricadır.",
      reward: "Kök Şehri ekmeği, 25 XP",
      objectives: ["Pıtır'ı dinle", "Sınırdaki işareti bul", "Elçiden bir iz getir"],
    },
    npc: { name: "Pıtır", attitude: 20, location: "Kök Şehri", notes: "Küçük bir Öz-Varlık. Ayrık'ın kim olduğunu bilmez. Eşitlikten başka siyaset tanımaz." },
    lore: "Yeşilöz Federasyonu canavarların, goblinlerin ve ruhların ulusudur. Başkent Kök Şehri. Sessiz Hükümdar Ayrık'ın kimliği bilinmez. Bunu bu sahnede çözme.",
    opening: ({ name, className }) =>
      `${sky}\n\nKök Şehri'nin damarları yeşil ışık taşır. Pıtır, bir su birikintisinin içinden konuşur: sınırdaki elçi dönmemiş. Burada kimse kimsenin kölesi değil. Bu cümle hâlâ yeni.\n\nAdın ${name}. Yolun ${className}. Bu ulusun yurttaşısın.`,
  },
  {
    id: "nekrodur",
    name: "Nekrodur eşiği",
    pitch: "Mor-Sarkath kapısı. Hafızan eksik.",
    location: "Mor-Sarkath kapısı",
    worldTime: 2,
    gold: 0,
    guildRank: "",
    reputation: { Nekrodur: 0 },
    quest: {
      title: "Eksik ad",
      description: "Sadık Voren seni eşiğe bırakmış. Adını, ölümünü ve Azmoth'un neden sustuğunu bilmiyorsun. Sonuncusu bu oyunun sırrıdır.",
      reward: "Bir ad, 25 XP",
      objectives: ["Voren'den ne hatırladığını sor", "Eşikteki eşyayı tanı", "Kapıdan içeri ya da uzağa bir adım seç"],
    },
    npc: { name: "Voren", attitude: 0, location: "Mor-Sarkath kapısı", notes: "Yaşayan Sadık. Azmoth'a itaat eder ama bu gece emir almamıştır. Meraklı, temkinli." },
    lore: "Nekrodur'un başkenti Mor-Sarkath. Hükümdar Sonsuz Kral Azmoth, bir lich. Neden savaş istediği bilinmiyor. Bu başlangıçta onu görme ve amacını çözme.",
    opening: ({ name, className }) =>
      `${sky}\n\nMor-Sarkath'ın kapısı kapalı. Voren, yaşayan bir Sadık, seni eşiğin taşında bulmuş ve içeri almamış. Son nefesini hatırlamıyorsun. O da sormuyor.\n\nAdın ${name}. Yolun ${className}. Bu gece yalnız eşik senin.`,
  },
  {
    id: "thalassar",
    name: "Thalassar denizcisi",
    pitch: "Port Argent rıhtımı. Mühürlü bir sandık.",
    location: "Port Argent rıhtımı",
    worldTime: 16,
    gold: 15,
    guildRank: "",
    reputation: { Thalassar: 8 },
    quest: {
      title: "Mühürlü sandık",
      description: "Kamarot Neri, amiral mührü taşıyan bir sandığın yanlış iskeleye indiğini söylüyor. İçini açma.",
      reward: "12 altın, 20 XP",
      objectives: ["Neri'den iskele numarasını al", "Sandığı doğru gemiye taşı", "Mührü kırma"],
    },
    npc: { name: "Neri", attitude: 8, location: "Port Argent rıhtımı", notes: "Kamarot. Thalassar'da sözleşme onurdur. Amiraller birbirinden nefret eder; Neri taraf seçmemiştir." },
    lore: "Thalassar Birliği'nin başkenti Port Argent. Yedi Amiral Konseyi. Başlarında Sera Vantaggio. Para çok şeyi çözer, her şeyi değil.",
    opening: ({ name, className }) =>
      `${sky}\n\nPort Argent tuz ve katran kokar. Neri palamarın yanında durur ve bir sandığı işaret eder. Mühür amiralin. İçini bilmiyor. Bilmek de istemiyor.\n\nAdın ${name}. Yolun ${className}. Bu gece yükün sandık.`,
  },
  {
    id: "samirat",
    name: "Samirat tüccarı",
    pitch: "Safiran çarşısı. Baharatın içinde bir mühür.",
    location: "Safiran çarşısı",
    worldTime: 15,
    gold: 20,
    guildRank: "",
    reputation: { Samirat: 8 },
    quest: {
      title: "Baharat mühürü",
      description: "Leyla'nın çuvallarından birinde sultan sarayına ait olmayan bir mühür var. Çuvalı açmak bir skandal, saklamak bir borç.",
      reward: "Saray öncesi güven, 20 XP",
      objectives: ["Leyla ile çuvalı tart", "Mührü kimseye göstermeden incele", "Leyla'ya bir yol söyle"],
    },
    npc: { name: "Leyla", attitude: 12, location: "Safiran çarşısı", notes: "Tüccar. Samirat'ta misafirperverlik onurdur. Vezir Kamal'ın adını fısıldar, bağırmaz." },
    lore: "Samirat'ın başkenti Safiran, Bin Kubbe Şehri. Sultan Zahir el-Asaad, Vezir Kamal'ın gölgesinde. Çöl cinleri sultanla anlaşmalıdır.",
    opening: ({ name, className }) =>
      `${sky}\n\nSafiran'ın çarşısı baharat ve sıcak taş kokar. Leyla bir çuvalı geri çeker. Mühür ipeğin altında. Sarayın mührü değil.\n\nAdın ${name}. Yolun ${className}. Borç bu şehirde kılıçtan keskindir.`,
  },
  {
    id: "zul",
    name: "Zul'Karath sığlığı",
    pitch: "Yeraltına düştün. İlk kapı hâlâ karanlık.",
    location: "Zul'Karath sığ dehlizi",
    worldTime: 18,
    gold: 2,
    guildRank: "",
    reputation: {},
    quest: {
      title: "Yukarı çıkan kapı",
      description: "Syra seni düştüğün yerde buldu. Yüzeye çıkan ilk kapı üç dönemeç ötede. Matrona Syreth bu dehlizde değil.",
      reward: "Bir yol, 25 XP",
      objectives: ["Syra'nın şartını dinle", "Üç dönemeçteki işareti bul", "Kapıyı aç ya da geri dön"],
    },
    npc: { name: "Syra", attitude: -5, location: "Zul'Karath sığ dehlizi", notes: "Gece elfi rehber. Matrona Syreth'in adı geçince susar. İhaneti sevmez, yabancıyı da sevmez." },
    lore: "Zul'Karath kıtanın altındaki derinlik krallığıdır. Matrona Syreth yüzeye buradan bakmaz. Bu dehliz sığdır. Derin şehre inme, ta ki yol oraya çıkana kadar.",
    opening: ({ name, className }) =>
      `${sky}\n\nYukarıdaki yıldız burada yok. Zul'Karath'ın sığ dehlizinde su dizine vurur. Syra, karanlıkta senin gördüğünden fazlasını görür ve bunu söylemez.\n\nAdın ${name}. Yolun ${className}. İlk işin bir kapı.`,
  },
  {
    id: "akagane",
    name: "Akagane gezgini",
    pitch: "Doğudan gelen gemi. Kıtayı ilk kez görüyorsun.",
    location: "Port Argent, doğu iskelesi",
    worldTime: 10,
    gold: 12,
    guildRank: "",
    reputation: { Akagane: 10 },
    quest: {
      title: "Kapalı mektup",
      description: "Hana, İmparatoriçe Shirayuki'nin mührünü taşıyan bir mektup verdi. Alıcı bir isim değil, bir unvan: Port Argent'te sözü geçen biri. Mektubu açma.",
      reward: "Doğu güveni, 20 XP",
      objectives: ["Hana'dan unvanın tarifini al", "Doğru kişiyi bul", "Mührü bozmadan teslim et"],
    },
    npc: { name: "Hana", attitude: 10, location: "Port Argent, doğu iskelesi", notes: "Akagane çevirmeni. Kage değil. İmparatoriçenin mektubunu açmanı istemez. Kıtayı senden biraz daha iyi bilir." },
    lore: "Akagane, doğu denizinin ötesindeki ada imparatorluğudur. İmparatoriçe Shirayuki gençtir. Bu mektup bir Öz Çekirdeği değildir. İçini bu sahnede açma.",
    opening: ({ name, className }) =>
      `${sky}\n\nDoğu iskelesinde Kaldoran ilk kez ayaklarının altındadır. Hana sana mühürlü bir mektup verir. Gemi geri dönecek. Sen dönmeyeceksin, en azından bugün.\n\nAdın ${name}. Yolun ${className}. Kıta seni tanımıyor.`,
  },
];

const LORE: LoreSeed[] = [
  {
    kind: "world",
    title: "VEYRA: DOĞUŞ",
    tags: ["veyra", "kaldoran", "yıldız", "parçalanma"],
    visibility: "player_visible",
    alwaysInclude: true,
    content:
      "Yıl YT 1247. Kıta Kaldoran. 1247 yıl önce Ardenya'nın Kalp Taşı patladı; buna Parçalanma denir. Gökyüzünde Kızıl Yıldız duruyor ve kimse ne anlama geldiğini bilmiyor. On altı güç: Valdrenia, Hrimgard, Khaz-Brumal, Sylvanis, Gorzakh, Samirat, Thalassar, Solareth, Vaelmoor, Yeşilöz, Nekrodur, Mal'khazar, Drakenholm, Zul'Karath, Akagane, Kırık Dümen. Tanrılar Aen, Vael, Thorak, Iryn, Kaelis, Zhal ve Sethra. Düşmüş Azrakh Boşluk'ta. Büyünün adı Öz. Para: 1 altın = 10 gümüş = 100 bakır. Serbest Kanat görev dağıtır.",
  },
  {
    kind: "rule",
    title: "Veyra kuralları",
    tags: ["kural", "onur", "zar", "öz", "lonca"],
    visibility: "player_visible",
    alwaysInclude: true,
    content:
      "Riskli iş: d20 + özellik bonusu + beceri bonusu. Beceri bonusu rütbe × 2. Zorluk: 5, 8, 12, 15, 18, 22, 26. Doğal 1 fiyasko, doğal 20 kritik. Onur −100 ile +100, oyun 0'dan başlar ve grup itibarından ayrıdır. Öz uzun dinlenmede (8 saat) dolar, kısa dinlenme (1 saat) dörtte birini verir. Lonca rütbeleri: Bakır, Demir, Gümüş, Altın, Platin, Elmas, Efsane. Seviye sınırı 100. Her seviye 2 yetenek puanı, her 5 seviyede 1 özellik puanı.",
  },
  {
    kind: "rule",
    title: "Hakem kilidi",
    tags: ["sır", "çekirdek", "azmoth", "ayrık", "aldric"],
    visibility: "ai_only",
    alwaysInclude: true,
    content:
      "Keşfedilmeden söyleme. Yedi Öz Çekirdeği Kalp Taşı'nın parçalarıdır; yerleri belli değil. Hepsini toplayan Ardenya'yı kurabilir, Mal'khazar Mührü'nü onarabilir ya da Veyra'yı yok edebilir. Ayrık'ın kimliği, Azmoth'un savaş sebebi, Aldric'in hastalığı ve Nethral'de uyanan şey bilinmiyor. Bu oturumda bunları çözme. Mühür her yıl zayıflıyor. Vaelmoor ve Solareth gizlice bir Kapatma Büyüsü hazırlıyor. Aldric, Azmoth, Ignivar, Vor'Kalath ve Shirayuki hazırlıksız ölmez. Yeni tanrı, yeni kıta ve listede olmayan krallık uydurma.",
  },
  {
    kind: "creature",
    title: "Orman karşılaşması",
    tags: ["orman", "yolculuk", "kurt", "haydut"],
    visibility: "ai_only",
    alwaysInclude: false,
    content:
      "Yolculukta her 4 saatte d20: 1-10 sakin, 11-14 iz, 15-18 karşılaşma, 19-20 tehlikeli. Gece +10. Güvenli −15, tehlikeli +15, ölümcül +30. Orman d100: 01-22 Kurt Sürüsü D, 23-38 Haydut Çetesi D, 39-48 Yaban Domuzu D, 49-60 Zehirli Dev Örümcek C, 61-70 Diken Ruhu C, 71-79 Kök Bekçisi C, 80-87 Genç Wyvern C, 88-94 Gölge Panter B, 95-97 Troll Şefi B, 98-100 Orman Ruhu Muhafızı A. D sürü, C grup kadar, B ve üstü tek. Seviye rütbenin 10 altındaysa aşırı tehdit: kaçış ve pazarlık açık olsun. D tehdit 20 XP.",
  },
  {
    kind: "creature",
    title: "Dağ karşılaşması",
    tags: ["dağ", "mağara", "goblin", "ejderha"],
    visibility: "ai_only",
    alwaysInclude: false,
    content:
      "Dağ ve mağara d100: 01-18 Mağara Yarasaları D, 19-32 Goblin Sürüsü D, 33-42 Kobold Tuzakçısı D, 43-54 Ogre C, 55-64 Troll C, 65-72 Taş Golem C, 73-80 Genç Wyvern C, 81-88 Troll Şefi B, 89-94 Genç Ejderha B, 95-98 Kadim Golem A, 99-100 Yetişkin Ejder A. C ve üstünü düşük seviyeye öldürtme.",
  },
  {
    kind: "creature",
    title: "Harabe karşılaşması",
    tags: ["harabe", "zindan", "ardenya", "iskelet"],
    visibility: "ai_only",
    alwaysInclude: false,
    content:
      "Zindanda her odada d20: 1-8 boş, 9-12 tuzak, 13-17 karşılaşma, 18-19 hazine ve karşılaşma, 20 patron odası en fazla bir kez. Ardenya harabesi d100: 01-15 İskelet Asker D, 16-28 Zombi D, 29-38 Kobold Tuzakçısı D, 39-50 Taş Golem C, 51-62 Hortlak C, 63-72 Haydut Reisi C, 73-82 Kemik Şövalyesi B, 83-90 Hortlak Lord B, 91-95 Lich Öğrencisi A, 96-99 Kadim Golem A, 100 Kadim Ejderha S. S rütbesini bu başlangıçta uyandırma.",
  },
  {
    kind: "creature",
    title: "Mezar ve Nekrodur",
    tags: ["mezar", "nekrodur", "hortlak", "ölü"],
    visibility: "ai_only",
    alwaysInclude: false,
    content:
      "Mezarlık ve Nekrodur sınırı d100: 01-20 İskelet Asker D, 21-38 Zombi D, 39-55 Hortlak C, 56-70 Solgun Savaşçı C, 71-80 Kemik Şövalyesi B, 81-90 Hortlak Lord B, 91-97 Lich Öğrencisi A, 98-100 Sonsuz Kral'ın Elçisi SS. SS karşılaşması kaçıştır, dövüş değil. Azmoth'u sahneye çağırma.",
  },
];

function presetFrom(path: VeyraPath): ClassPreset {
  return {
    id: path.id,
    name: path.name,
    blurb: path.blurb,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    hp: path.die,
    mana: path.caster ? 13 : 7,
    gold: path.gold,
    skills: path.skills.map((skill) => ({ ...skill })),
    spells: [],
    items: path.items.map((item) => ({ ...item })),
  };
}

const lonca = ORIGINS[0];

export const veyraPack: GenrePack = {
  id: "veyra",
  title: "VEYRA: DOĞUŞ",
  pitch: "YT 1247. Kızıl Yıldız belirdi. Kırık krallıklarda ilk adımın.",
  currency: "altın",
  theme: "veyra",
  magicDefault: true,
  worldTime: lonca.worldTime,
  location: lonca.location,
  raceSuggestions: RACES.map((race) => race.name),
  classes: PATHS.map(presetFrom),
  opening: lonca.opening,
  lore: LORE,
  quest: lonca.quest,
  npc: lonca.npc,
};

export function veyraRules(dc: number): string {
  return [
    "Bu masa VEYRA: DOĞUŞ. Dünya sabit. Kıta Kaldoran, yıl YT 1247. On altı güç ve yedi Kadim artı Azrakh dışında tanrı ya da krallık ekleme. Açılış metni ve dünya notları kanondur. Onları geri alma.",
    "Kızıl Yıldız'ın anlamını, Yedi Öz Çekirdeği'nin yerini, Ayrık'ın kimliğini, Azmoth'un amacını, Aldric'in hastalığının sebebini ve Nethral'de ne uyandığını bu oturumda çözme. İpucu serbest, cevap değil.",
    `Zar: d20 + özellik bonusu + beceri bonusu. Beceri bonusunu sen ekleme. check_skill alanına karakterin bildiği beceri adını yaz; kod rütbe × 2 ekler. Olağan ZD ${dc}. Çok kolay 5, kolay 8, orta 12, zor 15, çok zor 18, efsanevi 22. 5 ile 26 arasında kal.`,
    "Onur sözün sicilidir, grup itibarından ayrıdır. {\"type\":\"honor\",\"delta\":2} gibi yaz. Sıradan bir sahnede −15 ile +15. Kitaptaki büyük leke (masuma zarar −20, ihanet −25) bir kez ve ancak sahne gerçekten olduysa. Yemin bozulunca Yemin Lekesi durumu ekle.",
    "XP: D tehdit ya da küçük görev 20, temiz bir hikâye vuruşu en fazla 50. C ve üstü tehdidi seviye yetmiyorsa öldürtme. Lonca puanı {\"type\":\"guild_lp\",\"delta\":5}, bir turda en fazla 20.",
    "Öz harcaması mana komutudur. Kademe maliyetleri 2, 4, 8, 14, 25. Öz bitince yorgunluk yaz ve sonraki büyü için dayanıklılık zarı iste. Hasar ayrı zar değildir. Irk özelliğini (karanlık görüş, zehir direnci, nefes, şans) yok sayma.",
    "Meslek haftası ve yönetim turu arayüzden yürür. Onları tekrar atma, geliri ve sezon olayını ikinci kez yazma. Senaryo hedefini tek oturumda bitirme. Yoldaş en fazla 3. Bağ 0–100 yalnız tanışılmış kişiye, {\"type\":\"bond\",\"name\":\"ad\",\"delta\":5}. Krallık komutu yalnız yerleşim varken. Mevsim ve hava durumdadır; her tur hava zarı atma. Kışın kuzey yolu yavaş, yazın çöl yorar. Fiyatlar: sıcak yemek 3 bakır, han 5 bakır, kılıç 15 altın, şifa iksiri 25 altın, at 75 altın. 1 altın = 10 gümüş = 100 bakır. Yorgunluk yalnız uzun yol, açlık veya meslek haftasında; her puan zara −1, kod ekler. Can sıfır masanın mevcut kuralıdır.",
  ].join("\n");
}
