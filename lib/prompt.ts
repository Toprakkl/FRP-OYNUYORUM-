import { formatDice, suggestedDc } from "./dice";
import { clip, formatWorldTime } from "./format";
import { selectLore } from "./lore";
import { GENRE_LABEL, SLOT_LABEL, STAT_LABEL, type DiceResolved, type Game } from "./types";
import { honorTitle, veyraRules } from "./veyra";
import { HOMES, TIERS, seasonOf } from "./veyraLife";

function adultAllowed(game: Game): boolean {
  if (!game.settings.adult || !game.settings.adultConfirmed) return false;
  if (game.character.age > 0 && game.character.age < 18) return false;
  return true;
}

export function buildSystemPrompt(game: Game): string {
  const settings = game.settings;
  const genre = settings.genre === "ozel" && settings.customGenre.trim() ? settings.customGenre.trim() : GENRE_LABEL[settings.genre];
  const tone =
    settings.tone === "kisa"
      ? "İki ya da üç kısa cümle yaz. Betimlemeyi kes."
      : settings.tone === "detayli"
        ? "İki ya da üç kısa paragraf yaz. Duyu kur, nutuk atma."
        : "Bir ya da iki kısa paragraf yaz.";
  const difficulty =
    settings.difficulty === "kolay"
      ? "Başarısızlık can yakmasın. Ölüm yazma. Kısmi başarıyı tercih et."
      : settings.difficulty === "sert"
        ? "Adil ama merhametsiz ol. Kalıcı yara ve ölüm mümkün. Yine de her turda öldürme."
        : "Adil ol. Bayılma olabilir. Kalıcı ölüm yazma.";
  const adult = adultAllowed(game)
    ? "Yetişkin içerik açık. Karanlık tema, sert şiddet, küfür ve yetişkinler arası duygusal ya da cinsel içerik serbest. Rıza dışı cinsel şiddeti erotikleştirme; o noktada sahneyi kes."
    : "Yetişkin içerik kapalı. Şiddeti kısa kes. İşkence, cinsel içerik ve küfür yazma.";
  const minor = game.character.age > 0 && game.character.age < 18 ? "Oyuncu karakteri reşit değil." : "";
  const veyra = settings.genre === "veyra";
  const dcHint = veyra
    ? `Veyra zorluk derecesi bu masada olağan olarak ${suggestedDc(settings.difficulty, "veyra")}. Ayrıntı aşağıda.`
    : `Önerilen DC ${suggestedDc(settings.difficulty)}.`;

  return [
    "Sen tek oyunculu bir FRP masasının oyun yöneticisisin. Anlatım Türkçe.",
    "Oyuncu tek karakteri oynar. Onun yerine karar verme, onun ağzından uzun konuşma yazma, görmediği bilgiyi ona söyletme.",
    "Anlatım ikinci tekil şahıs olsun. Düz yazı yaz. Madde işareti, yıldız ve başlık kullanma.",
    `Tür: ${genre}. Para birimi: ${settings.currency}.`,
    settings.magic
      ? veyra
        ? "Öz vardır. Mana alanı Öz havuzudur. Büyü ve büyülü eşya kullanılabilir."
        : "Büyü var. Mana, büyü ve büyülü eşya kullanılabilir."
      : "Büyü yok. Mana, büyü, büyülü eşya, kehanet ve doğaüstü güç yazma.",
    `Zorluk: ${settings.difficulty}. ${dcHint} ${difficulty}`,
    `Ton: ${tone}`,
    settings.realism
      ? "Gerçekçilik açık: yorgunluk, açlık, yük ve zaman ara sıra hissedilsin. Her turda hatırlatma."
      : "Gerçekçilik kapalı: açlık ve yük takibi yapma.",
    adult,
    minor,
    "Yaş sınırı her zaman geçerlidir: 18 yaşından küçük hiç kimse için cinsel ya da romantik içerik üretme.",
    settings.customRules.trim() ? `Ev kuralları: ${settings.customRules.trim()}` : "",
    "Zarı sen atmazsın ve oyuncudan zar istemezsin. Zar gerekiyorsa check_stat, check_dc ve check_reason doldur; narrative boş string, commands boş dizi olsun. Kod zarı atıp sana sonucu geri verir.",
    "check_stat yalnızca şunlardan biri: str, dex, con, int, wis, cha. Saldırı str, gizlenme kilit ve kaçış dex, dayanma con, inceleme ve bilgi int, fark etme wis, ikna ve konuşma cha.",
    veyra
      ? "check_skill, karakterin ilgili becerisinin adıdır. Yoksa boş string. Bonusu sen yazma. check_reason kısa Türkçe olsun."
      : "check_skill boş string kalsın.",
    veyra
      ? ""
      : "check_dc: kolay iş 11, normal 14, sert 17. Çok zor bir işe +3, önemsiz bir işe -3. 8 ile 25 arasında kal. check_reason kısa Türkçe olsun.",
    "Yürümek, eşya almak, dinlenmek, oturmak ve zaten belli olan bir cümle zar istemez. O zaman check_stat boş string olsun ve sahneyi narrative ile çöz.",
    "Sana ZAR satırı verildiyse zar atılmıştır. check_stat boş kalsın. Toplam DC'den küçükse başarısızlık ya da kısmi başarı yaz. Doğal 1 belirgin bir komplikasyondur. Doğal 20 belirgin bir avantajdır. Toplamı değiştirme.",
    "Hasar ayrı zar değildir. Yarayı HP komutuyla işle: çizik -1 ile -3, yara -4 ile -8, ağır yara -9 ile -16, neredeyse öldürücü -17 ile -30. İyileşme de bu ölçüde olsun.",
    "Durum yalnızca commands ile değişir. Anlatıda olan ama komutu olmayan hiçbir şey karakter kağıdına işlenmez.",
    veyra
      ? "Bir turda 0 ile 4 komut yeter. Haksız eşya ve para yağdırma. XP sınırını Veyra kuralından al."
      : "Bir turda 0 ile 4 komut yeter. Haksız eşya, para ve XP yağdırma. XP çoğu turda 0, gerçek bir risk çözülünce 5 ile 20.",
    "Yeni eşya item_add, kayıp eşya item_remove, kuşanma item_equip. Görev, kişi, konum ve saat için ayrı komut kullan.",
    "Görünürlüğü ai_only olan notlar sırdır. Kurgu içinde keşfedilmeden açıkça söyleme.",
    veyra ? veyraRules(suggestedDc(settings.difficulty, "veyra")) : "",
    'Yalnızca JSON döndür: {"narrative":"...","commands":[],"check_stat":"","check_dc":0,"check_reason":"","check_skill":""}. Zar isteyeceksen narrative boş kalsın.',
    "Komut örnekleri: {\"type\":\"hp\",\"delta\":-4} {\"type\":\"condition_add\",\"name\":\"yaralı kol\"} {\"type\":\"time\",\"delta_hours\":1} {\"type\":\"gold\",\"delta\":8} {\"type\":\"xp\",\"delta\":10} {\"type\":\"item_add\",\"name\":\"Paslı anahtar\",\"itemType\":\"key\",\"description\":\"Soğuk\"} {\"type\":\"location_set\",\"name\":\"Kiler\"} {\"type\":\"quest_update\",\"title\":\"Açılmamış mektup\",\"objective_done\":\"Mektubun kime ait olduğunu öğren\"} {\"type\":\"npc_touch\",\"name\":\"Maren\",\"delta\":5} {\"type\":\"journal_add\",\"text\":\"Mühür kırıldı.\"}",
    "set_hp, set_level ve level_up gönderme. Seviye XP ile yükselir. Ölü bir karakteri diriltme.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUserPrompt(game: Game, message: string, dice: DiceResolved | null): string {
  const character = game.character;
  const state = {
    zaman: formatWorldTime(game.worldTime),
    konum: game.location,
    hayatta: character.isAlive,
    karakter: {
      ad: character.name,
      sinif: character.className,
      tur: character.race,
      yas: character.age,
      seviye: character.level,
      xp: `${character.xp}/${character.level * 100}`,
      can: `${character.hp}/${character.maxHp}`,
      mana: game.settings.magic ? `${character.mana}/${character.maxMana}` : "yok",
      ...(game.settings.genre === "veyra"
        ? {
            onur: `${character.honor} ${honorTitle(character.honor).name}`,
            yemin: character.oath || "yok",
            ozellik: character.traits,
            yetenekPuani: character.talentPoints,
            zirve: character.peakGifts,
            yetenekler: character.talents,
            lonca: character.guildRank || "üye değil",
            loncaPuani: character.guildPoints,
            meslek: character.profession ? `${character.profession.name} MP ${character.profession.mp}` : "yok",
            yanMeslek: character.sideProfession ? `${character.sideProfession.name} MP ${character.sideProfession.mp}` : "yok",
            yorgunluk: character.fatigue,
            konut: HOMES[character.homeTier] || "yok",
          }
        : {}),
      para: `${character.gold} ${game.settings.currency}`,
      zirh: character.ac,
      stat: character.stats,
      durum: character.conditions,
      beceriler: character.skills,
      buyuler: game.settings.magic ? character.spells : [],
      gorunum: clip(character.appearance, 300),
      kisilik: clip(character.personality, 240),
      gecmis: clip(character.backstory, 500),
      itibar: character.reputation,
    },
    ...(game.settings.genre === "veyra"
      ? {
          mevsim: seasonOf(game.worldTime),
          hava: game.weather || "Açık",
          krallik: game.kingdom
            ? {
                ad: game.kingdom.name,
                kademe: TIERS[game.kingdom.tier] ?? String(game.kingdom.tier),
                nufus: game.kingdom.population,
                hazine: game.kingdom.treasury,
                ordu: game.kingdom.army,
                halk: game.kingdom.people,
                istikrar: game.kingdom.stability,
                nufuz: game.kingdom.influence,
                mesruiyet: game.kingdom.legitimacy,
                binalar: game.kingdom.buildings,
                danisman: game.kingdom.advisors.map((advisor) => `${advisor.role} ${advisor.name} ${advisor.loyalty}`),
                bekleyen: game.kingdom.pendingEvent,
              }
            : "yok",
          yoldaslar: game.companions.map((companion) => `${companion.name} ${companion.loyalty}`),
        }
      : {}),
    kusanim: game.inventory
      .filter((item) => item.equippedSlot)
      .map((item) => `${item.name} (${item.equippedSlot ? SLOT_LABEL[item.equippedSlot] : ""}${item.props.damage ? `, ${item.props.damage}` : ""}${item.props.ac ? `, AC +${item.props.ac}` : ""})`),
    envanter: game.inventory.map((item) => `${item.name} ×${item.qty}${item.magical ? " [büyülü]" : ""}`),
    gorevler: game.quests.filter((quest) => quest.status === "active"),
    kisiler: game.npcs.map((npc) => ({
      ad: npc.name,
      tutum: npc.attitude,
      durum: npc.status,
      yer: npc.location,
      not: clip(npc.notes, 180),
      ...(game.settings.genre === "veyra" ? { bag: npc.bond ?? 0 } : {}),
    })),
    ozet: game.summary || "(henüz yok)",
    dunya: selectLore(game, message),
    son: game.messages
      .filter((entry) => entry.role !== "system")
      .slice(-14)
      .map((entry) => ({
        kim: entry.role === "player" ? "oyuncu" : "hakem",
        zar: entry.dice ? formatDice(entry.dice) : undefined,
        metin: clip(entry.content, 900),
      })),
  };
  const diceLine = dice
    ? `ZAR ATILDI: doğal ${dice.natural}, stat ${dice.stat ? STAT_LABEL[dice.stat] : "seçilmedi"}, bonus ${dice.modifier}, toplam ${dice.total}, DC ${dice.dc}${dice.reason ? `, gerekçe ${dice.reason}` : ""}. Bu sonuç kesin. check_stat boş bırak ve sahneyi buna göre anlat.`
    : "ZAR YOK. Riskliyse check_stat doldur ve narrative boş bırak. Risksizse check_stat boş bırak ve narrative yaz.";
  return ["GÜNCEL DURUM", JSON.stringify(state), "", diceLine, "", `OYUNCU: ${message}`].join("\n");
}
