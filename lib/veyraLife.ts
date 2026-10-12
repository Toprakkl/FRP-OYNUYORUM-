import type { GenrePack } from "./presets";
import type { Kingdom, Profession } from "./types";

export const SEASONS = ["Bahar", "Yaz", "Sonbahar", "Kış"] as const;
export const TIERS = ["", "Karakol", "Köy", "Kasaba", "Şehir", "Baronluk", "Krallık", "İmparatorluk"];
export const WEATHERS = ["Açık", "Bulutlu", "Yağmur", "Fırtına", "Sis", "Aşırı hava"] as const;
export const HOMES = ["", "Han odası", "Kulübe", "Ev", "Malikâne", "Kale"];
export const HOME_COST = [0, 0, 40, 200, 2000, 10000];

export type ProfessionDef = { name: string; group: string; skill: string; silver: number; note: string };

export const PROFESSIONS: ProfessionDef[] = [
  { name: "Paralı Asker", group: "Savaş", skill: "Atletizm", silver: 30, note: "Ustalık: savaş ödülü artar." },
  { name: "Muhafız", group: "Savaş", skill: "Gözlem", silver: 25, note: "Ustalık: şehirde sözün geçer." },
  { name: "Maceracı", group: "Savaş", skill: "Hayatta Kalma", silver: 20, note: "Ustalık: lonca ödülü artar." },
  { name: "Avcı", group: "Savaş", skill: "İz Sürme", silver: 20, note: "Ustalık: ganimet payı artar." },
  { name: "Gladyatör", group: "Savaş", skill: "Atletizm", silver: 35, note: "Ustalık: arena ödülü katlanır." },
  { name: "Şövalye", group: "Savaş", skill: "İkna", silver: 40, note: "Ustalık: toprak hakkı konuşulur." },
  { name: "Korsan", group: "Savaş", skill: "Atıcılık", silver: 30, note: "Ustalık: yağma payı artar." },
  { name: "Demirci", group: "Zanaat", skill: "Zanaat", silver: 30, note: "Ustalık: nadir silah dövebilirsin." },
  { name: "Zırhçı", group: "Zanaat", skill: "Zanaat", silver: 30, note: "Ustalık: zırh bir sınıf güçlenir." },
  { name: "Marangoz", group: "Zanaat", skill: "Zanaat", silver: 20, note: "Ustalık: bina ucuzlar." },
  { name: "Kuyumcu", group: "Zanaat", skill: "Zanaat", silver: 40, note: "Ustalık: tılsım işlersin." },
  { name: "Terzi", group: "Zanaat", skill: "Zanaat", silver: 20, note: "Ustalık: kıyafet ve kılık." },
  { name: "Simyacı", group: "Zanaat", skill: "Simya", silver: 35, note: "Ustalık: güçlü iksir." },
  { name: "Mühendis", group: "Zanaat", skill: "Zanaat", silver: 35, note: "Ustalık: tuzak ve mekanizma." },
  { name: "Aşçı", group: "Zanaat", skill: "Zanaat", silver: 15, note: "Ustalık: sıcak yemek yorgunluğu indirir." },
  { name: "Tüccar", group: "Ticaret", skill: "Pazarlık", silver: 40, note: "Ustalık: fiyat sana eğilir." },
  { name: "Hancı", group: "Ticaret", skill: "Pazarlık", silver: 25, note: "Ustalık: her handa bir haber." },
  { name: "Kervan Başı", group: "Ticaret", skill: "Hayatta Kalma", silver: 35, note: "Ustalık: yol daha güvenli." },
  { name: "Bankacı", group: "Ticaret", skill: "Pazarlık", silver: 50, note: "Ustalık: faizle borç." },
  { name: "Antikacı", group: "Ticaret", skill: "Tarih", silver: 30, note: "Ustalık: nadir eşya bulursun." },
  { name: "Büyücü", group: "Bilgi", skill: "Öz Bilgisi", silver: 50, note: "Ustalık: yeni büyü öğretirsin." },
  { name: "Âlim", group: "Bilgi", skill: "Tarih", silver: 30, note: "Ustalık: kadim iz sürersin." },
  { name: "Kâtip", group: "Bilgi", skill: "Tarih", silver: 20, note: "Ustalık: mühür ve belge." },
  { name: "Çevirmen", group: "Bilgi", skill: "Tarih", silver: 25, note: "Ustalık: yabancı dil çözülür." },
  { name: "Kâhin", group: "Bilgi", skill: "Gözlem", silver: 30, note: "Ustalık: olay zarında bir tekrar." },
  { name: "Şifacı", group: "Şifa", skill: "İlk Yardım", silver: 30, note: "Ustalık: zehir ve hastalık." },
  { name: "Rahip", group: "Şifa", skill: "İkna", silver: 25, note: "Ustalık: kutsama ve tören." },
  { name: "Cerrah", group: "Şifa", skill: "İlk Yardım", silver: 45, note: "Ustalık: ağır yara kapanır." },
  { name: "Çiftçi", group: "Doğa", skill: "Hayatta Kalma", silver: 10, note: "Ustalık: yiyecek ucuzlar." },
  { name: "Balıkçı", group: "Doğa", skill: "Hayatta Kalma", silver: 12, note: "Ustalık: kıyı ve deniz." },
  { name: "Orman Bekçisi", group: "Doğa", skill: "İz Sürme", silver: 20, note: "Ustalık: orman seni saklar." },
  { name: "Terbiyeci", group: "Doğa", skill: "Hayvan Terbiyesi", silver: 30, note: "Ustalık: sadık bir binek." },
  { name: "Madenci", group: "Doğa", skill: "Atletizm", silver: 25, note: "Ustalık: damar sezersin." },
  { name: "Hırsız", group: "Gölge", skill: "Cep Hırsızlığı", silver: 35, note: "Ustalık: kilit ve tuzak." },
  { name: "Casus", group: "Gölge", skill: "Gözlem", silver: 45, note: "Ustalık: sahte kimlik." },
  { name: "Suikastçı", group: "Gölge", skill: "Gizlilik", silver: 60, note: "Bu iş onurdan yer. Tek vuruş konuşulur." },
  { name: "Kaçakçı", group: "Gölge", skill: "Yalan", silver: 40, note: "Ustalık: yasak mal yolu." },
  { name: "Diplomat", group: "Yönetim", skill: "İkna", silver: 50, note: "Ustalık: antlaşma kolaylaşır." },
  { name: "Vergi Memuru", group: "Yönetim", skill: "Pazarlık", silver: 25, note: "Ustalık: yerleşim geliri artar." },
  { name: "Yargıç", group: "Yönetim", skill: "İkna", silver: 40, note: "Ustalık: dava ve kefaret." },
  { name: "Bard", group: "Yönetim", skill: "İkna", silver: 25, note: "Ustalık: halk ve ruh hali." },
  { name: "Haberci", group: "Yönetim", skill: "Parkur", silver: 15, note: "Ustalık: yol kısalır." },
  { name: "Rehber", group: "Yönetim", skill: "Hayatta Kalma", silver: 20, note: "Ustalık: seyahat kısalır." },
];

export const BUILDINGS: { name: string; cost: number; effect: string }[] = [
  { name: "Pazar", cost: 500, effect: "Gelir +%10" },
  { name: "Tapınak", cost: 800, effect: "Halk +5, meşruiyet +2" },
  { name: "Kışla", cost: 1500, effect: "Ordu sınırı genişler" },
  { name: "Surlar", cost: 3000, effect: "Savunma +4" },
  { name: "Kütüphane", cost: 1200, effect: "Nüfuz +3" },
  { name: "Demirhane", cost: 1000, effect: "Silah ve nadir iş" },
  { name: "Şifahane", cost: 900, effect: "Salgın hafifler" },
  { name: "Liman", cost: 4000, effect: "Gelir +%20" },
  { name: "Casus Ağı", cost: 2500, effect: "Düşman planı sızar" },
  { name: "Akademi", cost: 6000, effect: "Usta ve büyücü yetişir" },
  { name: "Hapishane", cost: 700, effect: "İstikrar +5" },
  { name: "Su Kanalı", cost: 1500, effect: "Nüfus daha hızlı artar" },
];

export const ADVISOR_ROLES = [
  { role: "Mareşal", effect: "Savaş zarı +2" },
  { role: "Haznedar", effect: "Gelir +%10" },
  { role: "Elçi", effect: "Diplomasi +2" },
  { role: "Başrahip", effect: "Halk +5" },
  { role: "Kâhin", effect: "Olay zarında bir tekrar" },
  { role: "Casusbaşı", effect: "Suikast uyarısı" },
  { role: "Yargıç", effect: "İstikrar +5" },
];

export type SeasonChoice = { label: string; note: string; people?: number; stability?: number; influence?: number; legitimacy?: number; treasury?: number; army?: number; population?: number; boon?: string };
export type SeasonEvent = { roll: number; name: string; text: string; choices: [SeasonChoice, SeasonChoice] };

export const SEASON_EVENTS: SeasonEvent[] = [
  { roll: 1, name: "Kıtlık", text: "Ambarlar eridi. Halk ekmek soruyor.", choices: [
    { label: "Ambarı aç", note: "Halk +8, hazine −%15", people: 8, treasury: -15 },
    { label: "Payı kıs", note: "Halk −15", people: -15 },
  ]},
  { roll: 2, name: "Salgın", text: "Öksürük kapıdan kapıya geçiyor.", choices: [
    { label: "Şifahane kur uğraşı", note: "Hazine −200, halk −4", treasury: -200, people: -4 },
    { label: "Kapıları kapat", note: "Nüfus −%5, halk −10", population: -5, people: -10 },
  ]},
  { roll: 3, name: "İsyan", text: "Bir mahalle taş topladı.", choices: [
    { label: "Konuş", note: "İstikrar −5, meşruiyet +4", stability: -5, legitimacy: 4 },
    { label: "Birlik gönder", note: "İstikrar −15, ordu −20", stability: -15, army: -20 },
  ]},
  { roll: 4, name: "Suikast girişimi", text: "Bir danışmanın kapısı gece çizildi.", choices: [
    { label: "Casusbaşına güven", note: "Nüfuz −2", influence: -2 },
    { label: "Muhafızı sıkılaştır", note: "Hazine −100, istikrar +2", treasury: -100, stability: 2 },
  ]},
  { roll: 5, name: "İstila", text: "Sınırda yabancı sancak var.", choices: [
    { label: "Surda karşıla", note: "Ordu −30, istikrar −5", army: -30, stability: -5 },
    { label: "Haraç teklif et", note: "Hazine −300, meşruiyet −6", treasury: -300, legitimacy: -6 },
  ]},
  { roll: 6, name: "Haydut baskını", text: "Yol kesildi, bir köy duman verdi.", choices: [
    { label: "Peşine düş", note: "Ordu −10, halk +4", army: -10, people: 4 },
    { label: "Surun ardına çekil", note: "Halk −8, hazine −50", people: -8, treasury: -50 },
  ]},
  { roll: 7, name: "Zengin kervan", text: "Yüklü bir kervan pazara indi.", choices: [
    { label: "Vergiyi dürüst al", note: "Hazine +300", treasury: 300 },
    { label: "Payı indir", note: "Hazine +120, halk +6", treasury: 120, people: 6 },
  ]},
  { roll: 8, name: "Doğal afet", text: "Bir bina çatladı.", choices: [
    { label: "Onar", note: "Hazine −150", treasury: -150 },
    { label: "Bırak", note: "İstikrar −8", stability: -8 },
  ]},
  { roll: 9, name: "Soylu entrikası", text: "Bir soylu senin adını kendi masasında kullanıyor.", choices: [
    { label: "Yüzüne söyle", note: "Meşruiyet −4, nüfuz +3", legitimacy: -4, influence: 3 },
    { label: "Kayır", note: "Meşruiyet −10, hazine +100", legitimacy: -10, treasury: 100 },
  ]},
  { roll: 10, name: "Sakin sezon", text: "Tarla, pazar ve nöbet yerli yerinde.", choices: [
    { label: "Olduğu gibi bırak", note: "Değişim yok", people: 0 },
    { label: "Küçük bir şenlik", note: "Halk +4, hazine −40", people: 4, treasury: -40 },
  ]},
  { roll: 11, name: "Festival", text: "Halk bir bayram istiyor.", choices: [
    { label: "Bayramı aç", note: "Halk +10, hazine −200", people: 10, treasury: -200 },
    { label: "Ertele", note: "Halk −4", people: -4 },
  ]},
  { roll: 12, name: "Keşif", text: "Bir izci maden, kalıntı ya da yeni bir teknik getirdi.", choices: [
    { label: "Kazıya yatır", note: "Hazine −100, nüfuz +4", treasury: -100, influence: 4 },
    { label: "Sırrı sakla", note: "Nüfuz +1", influence: 1 },
  ]},
  { roll: 13, name: "Elçi", text: "Komşu bir güç antlaşma konuşmak istiyor.", choices: [
    { label: "Ticaret aç", note: "Nüfuz +6, gelir bu tur +100", influence: 6, treasury: 100 },
    { label: "Kapıyı tut", note: "İstikrar +2, nüfuz −3", stability: 2, influence: -3 },
  ]},
  { roll: 14, name: "Lonca talebi", text: "Serbest Kanat vergi indirimi ya da bir görev istiyor.", choices: [
    { label: "İndirim ver", note: "Hazine −80, nüfuz +5", treasury: -80, influence: 5 },
    { label: "Görev iste", note: "Nüfuz +2", influence: 2 },
  ]},
  { roll: 15, name: "Canavar", text: "Sınırda bir tehdit dolaşıyor. Bu bir dövüş emri değil, bir görev.", choices: [
    { label: "Av partisi", note: "Ordu −15, halk +5", army: -15, people: 5 },
    { label: "Lonca'ya yaz", note: "Hazine −60, istikrar +2", treasury: -60, stability: 2 },
  ]},
  { roll: 16, name: "Altın damarı", text: "Toprak altın verdi.", choices: [
    { label: "Damarı işlet", note: "Gelir kalıcı artar", boon: "altin-damari", treasury: -80 },
    { label: "Tek sefer sat", note: "Hazine +400", treasury: 400 },
  ]},
  { roll: 17, name: "Evlilik teklifi", text: "Siyasi bir evlilik masaya kondu. Karar sizin, zorlama yok.", choices: [
    { label: "Görüşmeyi aç", note: "Nüfuz +5, meşruiyet +3", influence: 5, legitimacy: 3 },
    { label: "Reddet", note: "Nüfuz −2", influence: -2 },
  ]},
  { roll: 18, name: "Kızıl Yıldız", text: "Gökteki yıldız bu sezon daha parlak. Anlamı hâlâ kapalı.", choices: [
    { label: "Kâhine sor", note: "Hazine −30, nüfuz +2", treasury: -30, influence: 2 },
    { label: "Halka sakin ol de", note: "Halk +2", people: 2 },
  ]},
  { roll: 19, name: "Müttefik yardım ister", text: "Bir komşu asker ya da altın istiyor.", choices: [
    { label: "Yardım et", note: "Ordu −25, nüfuz +8", army: -25, influence: 8 },
    { label: "Reddet", note: "Nüfuz −6, istikrar +2", influence: -6, stability: 2 },
  ]},
  { roll: 20, name: "Altın Çağ", text: "Bir sezon boyunca işler yolunda.", choices: [
    { label: "Bayram ve imar", note: "Halk +15, istikrar +10, hazine +1000", people: 15, stability: 10, treasury: 1000 },
    { label: "Fazlayı kasaya koy", note: "Hazine +1000, halk +4", treasury: 1000, people: 4 },
  ]},
];

export function seasonOf(hours: number): { year: number; season: string; day: number } {
  const day = Math.floor(Math.max(0, hours) / 24) + 1;
  const season = SEASONS[Math.floor((day - 1) / 90) % 4];
  const year = 1247 + Math.floor((day - 1) / 360);
  return { year, season, day };
}

export function professionRank(level: number, mp: number): { name: string; mult: number; next: string; need: number } {
  if (level >= 30 && mp >= 120) return { name: "Büyük Usta", mult: 30, next: "", need: 120 };
  if (level >= 15 && mp >= 40) return { name: "Usta", mult: 10, next: "Büyük Usta", need: 120 };
  if (level >= 5 && mp >= 12) return { name: "Kalfa", mult: 3, next: "Usta", need: 40 };
  return { name: "Çırak", mult: 1, next: "Kalfa", need: 12 };
}

export function professionWeek(natural: number, skillBonus: number, silver: number, mult: number): { total: number; gold: number; mp: number; problem: string } {
  const total = natural + skillBonus;
  if (total >= 12) return { total, gold: Math.max(0, Math.round((silver * mult) / 10)), mp: 1, problem: "" };
  if (total >= 8) return { total, gold: Math.max(0, Math.round((silver * mult) / 20)), mp: 0, problem: "" };
  return { total, gold: 0, mp: 0, problem: "Hafta boşa gitti. Bir müşteri, bir yaralanma ya da bir dedikodu kapıda." };
}

export function seasonDelta(current: number, delta: number | undefined, note: string, key: "treasury" | "population" | "flat"): number {
  if (delta === undefined) return current;
  if (key !== "flat" && note.includes("%") && Math.abs(delta) <= 15) return current + Math.round((current * delta) / 100);
  return current + delta;
}

export function tierRequirement(kingdom: Kingdom, level: number): { next: number; ok: boolean; reason: string } | null {
  const next = kingdom.tier + 1;
  if (next > 7) return null;
  const has = (name: string) => kingdom.buildings.includes(name);
  if (next === 2) {
    const ok = kingdom.buildings.length >= 5 && kingdom.people >= 40 && kingdom.population >= 100;
    return { next, ok, reason: "Köy: 5 yapı, halk 40, nüfus 100" };
  }
  if (next === 3) {
    const ok = has("Tapınak") && kingdom.treasury >= 5000 && kingdom.population >= 1000;
    return { next, ok, reason: "Kasaba: Tapınak, hazine 5000, nüfus 1000" };
  }
  if (next === 4) {
    const ok = has("Surlar") && kingdom.treasury >= 50000 && kingdom.population >= 10000;
    return { next, ok, reason: "Şehir: Surlar, hazine 50000, nüfus 10000" };
  }
  if (next === 5) {
    const ok = kingdom.population >= 50000 && kingdom.legitimacy >= 40 && kingdom.treasury >= 10000;
    return { next, ok, reason: "Baronluk: nüfus 50000, meşruiyet 40, hazine 10000" };
  }
  if (next === 6) {
    const ok = level >= 15 && kingdom.population >= 100000 && kingdom.treasury >= 100000 && kingdom.legitimacy >= 50;
    return { next, ok, reason: "Krallık: seviye 15, nüfus 100000, hazine 100000, meşruiyet 50" };
  }
  const ok = level >= 25 && kingdom.population >= 300000 && kingdom.legitimacy >= 60 && kingdom.advisors.length >= 3;
  return { next, ok, reason: "İmparatorluk: seviye 25, nüfus 300000, meşruiyet 60, 3 danışman" };
}

export function kingdomNet(kingdom: Kingdom): { income: number; expense: number; net: number } {
  let income = Math.round((kingdom.population / 5) * (kingdom.people / 50));
  if (kingdom.buildings.includes("Pazar")) income = Math.round(income * 1.1);
  if (kingdom.buildings.includes("Liman")) income = Math.round(income * 1.2);
  if (kingdom.boons.includes("altin-damari")) income = Math.round(income * 1.2);
  if (kingdom.advisors.some((advisor) => advisor.role === "Haznedar")) income = Math.round(income * 1.1);
  const expense = kingdom.army + kingdom.advisors.length * 50 + kingdom.buildings.length * 10;
  return { income, expense, net: income - expense };
}

export function blankKingdom(name: string, tier = 1, population = 40): Kingdom {
  return {
    name,
    tier,
    population,
    treasury: 0,
    army: 0,
    people: 50,
    stability: 50,
    influence: 30,
    legitimacy: 40,
    buildings: [],
    advisors: [],
    boons: [],
    pendingEvent: 0,
  };
}

export function bondLabel(bond: number): string {
  if (bond >= 81) return "Bağlı";
  if (bond >= 61) return "Yoldaş";
  if (bond >= 41) return "Yakın";
  if (bond >= 21) return "Dost";
  return "Tanıdık";
}

export type Scenario = GenrePack["quest"] extends infer _Q
  ? {
      id: string;
      name: string;
      pitch: string;
      location: string;
      worldTime: number;
      gold: number;
      guildRank: string;
      reputation: Record<string, number>;
      quest: GenrePack["quest"];
      npc: GenrePack["npc"] & { bond?: number };
      lore: string;
      opening: (who: { name: string; className: string }) => string;
      profession?: string;
      homeTier?: number;
      kingdom?: Kingdom;
    }
  : never;

const sky = "Gökyüzünde Kızıl Yıldız duruyor. Yıl YT 1247. Anlamı kapalı.";

export const SCENARIOS: Scenario[] = [
  {
    id: "taht-gecesi",
    name: "Taht Gecesi",
    pitch: "Lormarin. Aldric ölüm döşeğinde. Üç varis destek istiyor.",
    location: "Lormarin saray avlusu",
    worldTime: 21,
    gold: 15,
    guildRank: "",
    reputation: { Valdrenia: 5 },
    quest: {
      title: "Üç kapı",
      description: "Kral Aldric hasta. Edric, Lyra ve Corwin senden bir söz istiyor. Tacı bu oturumda kimse takmaz.",
      reward: "Bir kapı, 25 XP",
      objectives: ["Üç varisin adını doğru duy", "Birine söz ver ya da hiçbirine verme", "Avludan bir haberle çık"],
    },
    npc: { name: "Kâtip Elowen", attitude: 5, bond: 10, location: "Lormarin saray avlusu", notes: "Saray kâtibi. Varislerin yaşını ve hastalığın sebebini bilmez. Corwin'e çocuk muamelesi yapma; o bir siyasi isim." },
    lore: "Taht Gecesi Lormarin'de başlar. Aldric yaşıyor. Üç varis: Edric, Lyra, Corwin. Tacı bu başlangıçta kimse almaz. Hastalığın sebebi bilinmiyor.",
    opening: ({ name, className }) =>
      `${sky}\n\nLormarin'in avlusunda mumlar rüzgârda eğiliyor. Kâtip Elowen üç adı fısıldar: Edric, Lyra, Corwin. Kral içeride, kapı kapalı. Senden bir sancak değil, bir söz isteniyor.\n\nAdın ${name}. Yolun ${className}. Taç bu gece senin değil.`,
  },
  {
    id: "sinir-koyu",
    name: "Sınırdaki Köy",
    pitch: "Miras bir toprak, yirmi hane. Köyden krallığa giden yol.",
    location: "Eşikköy",
    worldTime: 10,
    gold: 30,
    guildRank: "",
    reputation: { Valdrenia: 4 },
    profession: "Çiftçi",
    homeTier: 2,
    kingdom: { ...blankKingdom("Eşikköy", 2, 120), treasury: 40, army: 8 },
    quest: {
      title: "İlk kışa kadar",
      description: "Eşikköy senin mirasın. Yirmi hane, bir kuyu, yarım sur. Hrimgard yolu yakın. Krallık kademesi bu sezonun işi değil.",
      reward: "Köyün ilk sezonu, 20 XP",
      objectives: ["Hane reisi Dara ile konuş", "Kuyunun durumunu gör", "Bir yönetim turu oynat"],
    },
    npc: { name: "Dara", attitude: 12, bond: 15, location: "Eşikköy", notes: "Hane reisi. Sözünün eri. Hrimgard akınlarından korkar, Valdrenia'dan da fazla umut beklemez." },
    lore: "Eşikköy, Valdrenia ile Hrimgard arasındaki sınırda küçük bir köydür. Yönetim turu krallık panosundan yürür. Komşu krallıklar bu toprağı henüz ciddiye almaz.",
    opening: ({ name, className }) =>
      `${sky}\n\nEşikköy'de yirmi hanenin dumanı aynı yöne eğiliyor. Dara sana paslı bir anahtar ve yarım bir sınır haritası verir. Burası bir krallık değil. Henüz bir köy.\n\nAdın ${name}. Yolun ${className}. İlk işin kışa kadar ayakta kalmak.`,
  },
  {
    id: "kayip-tac",
    name: "Kayıp Taç",
    pitch: "Ardenya harabeleri. Çalınmış bir taç, lonca sözleşmesi.",
    location: "Ardenya harabe kapısı",
    worldTime: 8,
    gold: 20,
    guildRank: "Bakır",
    reputation: { "Serbest Kanat": 8 },
    quest: {
      title: "Raegor'un tacı",
      description: "Lonca, Kemik Kral Raegor'un çalınmış tacını arıyor. Tacı bulunca geri vermek, satmak ya da takmak senin kararın. Bu kapıda taç yok.",
      reward: "Sözleşme ücreti, 25 XP",
      objectives: ["Kılavuz Bren'in haritasını al", "İlk odayı sağ çık", "Tacın bu kapıda olmadığını doğrula"],
    },
    npc: { name: "Bren", attitude: 6, bond: 8, location: "Ardenya harabe kapısı", notes: "Lonca kılavuzu. Raegor'un tacını görmemiştir. Harita eksik. Rakip avcılardan söz eder." },
    lore: "Ardenya harabesi Parçalanma'dan kalmadır. Kemik Kral Raegor bir zindan patronudur, kadim bir tanrı değil. Tacı bu sahnede envantere koyma.",
    opening: ({ name, className }) =>
      `${sky}\n\nHarabe kapısı diş gibi duruyor. Bren sana yarım bir harita uzatır. Sözleşme tacın peşinde. Tacın kendisi içeride, belki de değil.\n\nAdın ${name}. Yolun ${className}. İlk oda henüz boş görünüyor.`,
  },
  {
    id: "kizil-yolcular",
    name: "Kızıl Yıldız Yolcuları",
    pitch: "Kıta çapında bir söylenti. Çekirdeklerin yeri yazılmamış.",
    location: "Üç Nehir Kavşağı",
    worldTime: 18,
    gold: 12,
    guildRank: "",
    reputation: {},
    quest: {
      title: "İsimsiz söylenti",
      description: "Kızıl Yıldız belirdi. Yedi Öz Çekirdeği'nden söz ediliyor. Yerleri, sahipleri ve sonucu bu başlangıçta belli değil.",
      reward: "Bir ipucu, 20 XP",
      objectives: ["Kavşakta söylentiyi dinle", "Bir isim duy, bir yer duymadan", "Yola bir yön seç"],
    },
    npc: { name: "Sarn", attitude: 0, bond: 5, location: "Üç Nehir Kavşağı", notes: "Gezgin anlatıcı. Çekirdeklerin yerini bilmez. Bir kılıçtan ve bir haritadan masal gibi söz eder, sahiplerini göstermez." },
    lore: "Kızıl Yıldız Yolcuları çekirdek avıdır. Yerler gizli kalır. Gölge Evi, Solareth ve Vaelmoor da ilgilenir. Sonuç bu oturumda verilmez.",
    opening: ({ name, className }) =>
      `${sky}\n\nÜç nehrin kavşağında Sarn bir kılıç masalı anlatır ve susar. Harita yok. İsim var, yer yok. Yıldız herkesin göğünde aynı.\n\nAdın ${name}. Yolun ${className}. Av henüz başlamadı.`,
  },
  {
    id: "ejder-pazarligi",
    name: "Ejder Pazarlığı",
    pitch: "Drakenholm. Ignivar'ın hazinesinden bir parça eksik.",
    location: "Skarthol etekleri",
    worldTime: 11,
    gold: 18,
    guildRank: "",
    reputation: { Drakenholm: 0 },
    quest: {
      title: "Eksik parça",
      description: "Haznedar Kaliss, Ignivar'ın hazinesinden bir parçanın kaybolduğunu fısıldar. Ejder lordu bunu henüz duymamıştır. Parçayı bu sahnede bulma.",
      reward: "Kaliss'in güveni, 25 XP",
      objectives: ["Kaliss'in şartını dinle", "Parçanın adını öğren", "Skarthol'a nasıl yaklaşacağını seç"],
    },
    npc: { name: "Kaliss", attitude: 4, bond: 6, location: "Skarthol etekleri", notes: "Ejderkan haznedar. Ignivar'dan korkar. Kayıp parçanın şeklini tarif eder, yerini etmez." },
    lore: "Drakenholm'un efendisi Ejder Lord Ignivar'dır. Bu senaryo onun hazinesinin bir parçası hakkındadır. Ignivar'ı uyandırma ve parçayı envantere yazma.",
    opening: ({ name, className }) =>
      `${sky}\n\nSkarthol'un eteğinde hava kükürt kokar. Kaliss kapının gölgesinde durur ve bir eksikten söz eder. Dağın sahibi uyuyor. Onu uyandırmak senin işin değil.\n\nAdın ${name}. Yolun ${className}. İlk adım bir fısıltı.`,
  },
  {
    id: "oluler",
    name: "Ölüler Arasında",
    pitch: "Nekrodur. Hafızasız bir uyanış. Azmoth'un amacı kapalı.",
    location: "Mor-Sarkath alt mezarı",
    worldTime: 3,
    gold: 0,
    guildRank: "",
    reputation: { Nekrodur: 0 },
    quest: {
      title: "Eksik yüz",
      description: "Bir mezarda uyandın. Voren seni dışarı çıkarmadı. Kim olduğun ve neden döndüğün bilinmiyor. Azmoth'un amacı da.",
      reward: "Bir ad parçası, 25 XP",
      objectives: ["Voren'e üç soru sor", "Mezardaki tek eşyayı tanı", "Kapıya mı yoksa derine mi bakacağını seç"],
    },
    npc: { name: "Voren", attitude: 0, bond: 4, location: "Mor-Sarkath alt mezarı", notes: "Yaşayan Sadık. Azmoth'un emrini bu gece almamıştır. Nerys adında birini anar ve sonra susar." },
    lore: "Ölüler Arasında Mor-Sarkath'ta başlar. Azmoth neden savaş istediğini söylemez. Yaşama dönmek, ölümsüz kalmak ya da hizmet, sonraki seçimlerdir. Bu sahnede hiçbiri bitmez.",
    opening: ({ name, className }) =>
      `${sky}\n\nMezar kapağı aralık. Voren meşale tutar ve içeri inmez. Son nefesini hatırlamıyorsun. O da sormuyor. Derinden bir isim geliyor, Nerys, ve kesiliyor.\n\nAdın ${name}. Yolun ${className}. Bu gece yalnız eşik senin.`,
  },
  {
    id: "yeni-ulus",
    name: "Yeni Ulus",
    pitch: "Yeşilöz. Kök Şehri'nin ilk büyük sınavı.",
    location: "Kök Şehri",
    worldTime: 12,
    gold: 6,
    guildRank: "",
    reputation: { Yeşilöz: 12 },
    quest: {
      title: "İlk sınav",
      description: "Ayrık, federasyonun sınırında bir baskı seziyor. Kim olduğu bilinmiyor. Sınav bir savaş ilanı değil.",
      reward: "Kök Şehri ekmeği, 25 XP",
      objectives: ["Pıtır'dan sınavın adını öğren", "Sınır işaretine bak", "Ayrık'a bir haber götür"],
    },
    npc: { name: "Pıtır", attitude: 18, bond: 20, location: "Kök Şehri", notes: "Küçük bir Öz-Varlık. Ayrık'ın kimliğini bilmez. Mimi adında meraklı bir yurttaştan söz eder." },
    lore: "Yeni Ulus, Yeşilöz'ün ilk büyük sınavıdır. Ayrık'ın kimliği gizli kalır. Federasyon dağılmaz ve dünyayı bu sahnede değiştirmez.",
    opening: ({ name, className }) =>
      `${sky}\n\nKök Şehri'nin damarları yeşil yanıyor. Pıtır bir su birikintisinden konuşur: sınırda bir sınav var, adını henüz kimse koymamış.\n\nAdın ${name}. Yolun ${className}. Burada kimse kimsenin kölesi değil.`,
  },
  {
    id: "tuz-altin",
    name: "Tuz ve Altın",
    pitch: "Port Argent. Küçük bir gemi, büyük bir borç.",
    location: "Port Argent rıhtımı",
    worldTime: 15,
    gold: 25,
    guildRank: "",
    reputation: { Thalassar: 6 },
    profession: "Tüccar",
    quest: {
      title: "İlk ambar",
      description: "Kamarot Neri sana küçük bir tekne ve daha büyük bir borç gösterir. Amiral Konseyi bu tekneyi tanımaz.",
      reward: "Bir rota, 20 XP",
      objectives: ["Neri ile borcu say", "Teknenin adını kazı", "İlk yük için bir iskele seç"],
    },
    npc: { name: "Neri", attitude: 8, bond: 10, location: "Port Argent rıhtımı", notes: "Kamarot. Sözleşme onurdur. Amiraller birbirinden nefret eder. Kraken bu rıhtımda değildir." },
    lore: "Tuz ve Altın bir ticaret hikâyesidir. Amiral olmak, kaçakçı kral olmak ya da batmak sonraki denizlerdedir. Gemi küçüktür.",
    opening: ({ name, className }) =>
      `${sky}\n\nPort Argent tuz kokar. Neri bir halatı ayağına dolar ve küçük bir tekneyi işaret eder. Borç, tekneden büyüktür. Konseyin kapısı uzak.\n\nAdın ${name}. Yolun ${className}. İlk yük henüz yok.`,
  },
  {
    id: "ay-kulesi",
    name: "Ay Kulesi Sırları",
    pitch: "Vaelmoor. Yasak bir kitap, eksik bir sayfa.",
    location: "Ay Kulesi, Vaelmoor",
    worldTime: 22,
    gold: 8,
    guildRank: "",
    reputation: { "Ay Kulesi": 8 },
    profession: "Âlim",
    quest: {
      title: "Kapanmamış kitap",
      description: "Kalfa Iven, yasak raftan düşmüş bir kitabı sana gösterir ve kendi adının geçmemesini ister. Kitabın sırrı bu gecede çözülmez.",
      reward: "Kule izni, 25 XP",
      objectives: ["Kitabı açmadan kapağını oku", "Iven'e ne anladığını söyle", "Rafı yerine bırak"],
    },
    npc: { name: "Iven", attitude: 5, bond: 8, location: "Ay Kulesi", notes: "Kalfa. Meridian Ay'dan korkar. Kitap bir harita vaat eder, yer çizmez." },
    lore: "Ay Kulesi Sırları bir çırak hikâyesidir. Arşi-Büyücü olmak ya da kuleyi yıkmak bu gecenin sonucu değildir. Lira'nın haritası henüz bir söylentidir.",
    opening: ({ name, className }) =>
      `${sky}\n\nAy Kulesi mürekkep ve ozon kokar. Iven kucağında kapalı bir kitap tutar. Raf numarası silinmiş. Aşağıda Vaelmoor'un üç nehri lamba yakmış.\n\nAdın ${name}. Yolun ${className}. Çırağın. Arşi-Büyücü değilsin.`,
  },
  {
    id: "korsan",
    name: "Korsan Seferi",
    pitch: "Kırık Dümen. Ele geçirdiğin küçük bir güverte.",
    location: "Kırık Dümen iskelesi",
    worldTime: 19,
    gold: 14,
    guildRank: "",
    reputation: { "Kırık Dümen": 6 },
    profession: "Korsan",
    quest: {
      title: "Yeni bayrak",
      description: "İsyan bitti, güverte senin, harita değil. Kızıl Kaptan Merrow bu adada değil.",
      reward: "Mürettebatın ilk sözü, 20 XP",
      objectives: ["Lostromo Kess ile konuş", "Bayrağı seç", "İskeleden ayrıl ya da kal"],
    },
    npc: { name: "Kess", attitude: 3, bond: 12, location: "Kırık Dümen iskelesi", notes: "Lostromo. Sadakati düşük başlar. Merrow'un hazinesini görmemiştir. İdam, kral olmak ya da bayrak değiştirmek sonra gelir." },
    lore: "Korsan Seferi Kırık Dümen'de başlar. Kızıl Kaptan Merrow uzaktadır. Hazine haritası bu sahnede bulunmaz.",
    opening: ({ name, className }) =>
      `${sky}\n\nİskele zift kokar. Kess eski bayrağı ayağının altına iter. Güverte senin, rota değil. Merrow'un gemisi ufukta yok.\n\nAdın ${name}. Yolun ${className}. Mürettebat seni henüz kaptan saymıyor.`,
  },
  {
    id: "karanlik-alt",
    name: "Karanlığın Altında",
    pitch: "Zul'Karath sığlığı. Işık, su, yukarı çıkan kapı.",
    location: "Zul'Karath sığ dehlizi",
    worldTime: 17,
    gold: 2,
    guildRank: "",
    reputation: {},
    quest: {
      title: "Üç dönemeç",
      description: "Syra seni düştüğün yerde buldu. Yüzey üç dönemeç ötede. Matrona bu dehlizde değil.",
      reward: "Bir yol, 25 XP",
      objectives: ["Syra'nın şartını dinle", "Işığı ve suyu say", "İlk dönemeçteki işareti oku"],
    },
    npc: { name: "Syra", attitude: -4, bond: 5, location: "Zul'Karath sığ dehlizi", notes: "Gece elfi rehber. Thessaly ve Selene adlarını duyunca susar. Matrona Syreth'e bu dehlizden gidilmez." },
    lore: "Karanlığın Altında sığ dehlizde başlar. Yüzeye çıkmak, Matrona'ya katılmak ya da yeraltı muhalefeti sonraki kapılardadır.",
    opening: ({ name, className }) =>
      `${sky}\n\nYıldız burada yok. Su dizine vuruyor. Syra karanlıkta senden fazlasını görür ve bunu bir fiyat gibi söyler.\n\nAdın ${name}. Yolun ${className}. İlk işin ışığı korumak.`,
  },
  {
    id: "muhur",
    name: "Mühür Çatlıyor",
    pitch: "Kızıl Yarık'ın uzağı. Mühür zayıflıyor. Ritüel yazılmamış.",
    location: "Solareth sınır karakolu",
    worldTime: 6,
    gold: 10,
    guildRank: "",
    reputation: { Solareth: 4 },
    quest: {
      title: "Çatlak haberi",
      description: "Bir karakol, Mal'khazar Mührü'nün zayıfladığını duymuş. Kapatma Büyüsü'nün adımları burada yok. Seraphine bir isim, bir anahtar değil.",
      reward: "Bir yön, 20 XP",
      objectives: ["Nöbetçi Rahibe Sela'yı dinle", "Seraphine adını bir defa sor", "Yarık'a mı Vaelmoor'a mı bakacağını seç"],
    },
    npc: { name: "Sela", attitude: 6, bond: 6, location: "Solareth sınır karakolu", notes: "Şafak rahibesi. Mührün çatladığını duymuş, nasıl onarılacağını bilmiyor. Seraphine'i görmemiş." },
    lore: "Mühür Çatlıyor final kampanyasının eşiğidir. Vor'Kalath sahneye gelmez. Çekirdekler ve Kapatma Büyüsü bu karakolda tamamlanmaz. Üç sonuçtan hiçbiri bu sahnede seçilmez.",
    opening: ({ name, className }) =>
      `${sky}\n\nSolareth karakolunda Sela doğuya bakıyor. Yarık görünmüyor, haberi gelmiş. Mühür çatlıyormuş. Nasıl kapandığı bu masada yazmıyor.\n\nAdın ${name}. Yolun ${className}. Sen bir ordu değilsin.`,
  },
  {
    id: "sakin",
    name: "Sakin Bir Hayat",
    pitch: "Küçük bir kasaba. Meslek, ev, komşu. Kıyamet yok.",
    location: "Balım kasabası",
    worldTime: 9,
    gold: 20,
    guildRank: "",
    reputation: {},
    profession: "Hancı",
    homeTier: 3,
    quest: {
      title: "Bugünün ekmeği",
      description: "Balım'da bir evin ve bir işin var. Hedef kıyamet değil. Komşu bir kavga, bir festival, bir borç.",
      reward: "Sakin bir hafta, 10 XP",
      objectives: ["Komşu İris'e günaydın de", "İşe bir hafta ayır", "Kasabanın bir derdini duy"],
    },
    npc: { name: "İris", attitude: 14, bond: 25, location: "Balım kasabası", notes: "Komşu. Dedikoduyu sever, kıyameti sevmez. Sıcak yemek ikram eder." },
    lore: "Sakin Bir Hayat kasaba ölçeğindedir. Kızıl Yıldız gökte durur ama bu senaryo onu kovalamaz. Krallık kurmak şart değildir.",
    opening: ({ name, className }) =>
      `${sky}\n\nBalım'ın sokağı ekmek kokar. İris kapının önünü süpürür ve seni kendi adınla çağırır. Bugün bir taht, bir mühür, bir ejder yok. Bir iş var.\n\nAdın ${name}. Yolun ${className}. Hafta senin.`,
  },
];

export function getScenario(id?: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

export function emptyProfession(name: string): Profession {
  return { name, mp: 0 };
}
