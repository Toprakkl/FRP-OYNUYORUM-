import { localCheck } from "./checks";
import type { Command } from "./commands";
import { resolveDice, rollD20 } from "./dice";
import { raceByName, withSkillBonus } from "./veyra";
import type { DiceResolved, Game } from "./types";

function hash(seed: string): number {
  let value = 0;
  for (const char of seed) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value;
}

function pick(options: string[], seed: string): string {
  return options[hash(seed) % options.length] ?? options[0];
}

export function fallbackTurn(game: Game, message: string, dice: DiceResolved | null): { narrative: string; commands: Command[] } {
  const name = game.character.name;
  const lower = message.toLocaleLowerCase("tr");
  const commands: Command[] = [];
  const success = !dice || dice.natural === 20 || (dice.natural !== 1 && dice.total >= dice.dc);
  const place = game.location;
  let narrative: string;

  if (dice?.natural === 1) {
    commands.push({ type: "hp", delta: -2 });
    commands.push({ type: "condition_add", name: "sarsılmış" });
    narrative = `${name}, ${place} içinde iş bir anda tersine döner. ${message} derken zemin, kilit ya da muhatabın sana istediğin şeyi vermez; küçük bir bedel bırakır. Doğal 1, sahneyi senin aleyhine eğer.`;
  } else if (/dinlen|uyu|kamp|nefes/.test(lower)) {
    const missing = game.character.maxHp - game.character.hp;
    const heal = Math.max(1, Math.ceil(missing * 0.4));
    if (missing > 0) commands.push({ type: "hp", delta: Math.min(8, heal) });
    commands.push({ type: "time", delta_hours: 6 });
    commands.push({ type: "condition_remove", name: "yorgun" });
    narrative = `${name}, ${place} kenarında bir süre kapanırsın. Nefes düzene girer. Saat ilerler. Tam bir iyileşme değil, ama dizlerin seni tekrar taşır.`;
  } else if (/saldır|vur|kılıç|silah|ateş|bıçak|yumruk/.test(lower)) {
    if (success) {
      commands.push({ type: "xp", delta: 8 });
      narrative = pick(
        [
          `${name}, hamleni ${place} içinde bitirirsin. Karşı taraf dengesini kaybeder ve mesafe sende kalır. Bu bir zafer ilanı değil; bir sonraki nefes senin.`,
          `Darben yerine oturur. ${place} bir an susar. Karşındaki geriler. Kan, gürültü ya da sadece kırılan bir eşya: sonuç ortada, bedeli henüz değil.`,
        ],
        message,
      );
    } else {
      commands.push({ type: "hp", delta: -4 });
      commands.push({ type: "condition_add", name: "çizik" });
      narrative = `${name}, saldırın ${place} içinde karşılık bulur. Hamlen boşa gitmez ama boşluğu da kapatmaz. Sende bir çizik kalır, sahnede ise hâlâ bir tehdit.`;
    }
  } else if (/konuş|sor|selam|merhaba|de ki|anlat/.test(lower)) {
    const npc = game.npcs[0]?.name ?? "karşındaki";
    if (success) {
      commands.push({ type: "npc_touch", name: npc, delta: 5 });
      narrative = `${npc}, ${place} içinde seni dinler. ${message} cümlen havada asılı kalmaz. Sana tek bir doğru verir ve bir tanesini saklar. İstersen üstüne gidebilirsin.`;
    } else {
      narrative = `${npc} başını sallar ama ağzını açmaz. ${place} içinde bu sessizlik bir hakaret değil, bir kapı. Zorlamak gürültü çıkarır. Başka bir soru, başka bir kişi ya da bir eşya daha çok işe yarar.`;
    }
  } else if (/incele|bak|ara|oku|koku|dinle/.test(lower)) {
    if (success) {
      narrative = pick(
        [
          `${name}, ${place} içinde aradığın şeyi tam görmezsin ama izini görürsün. Taze bir iz, eksik bir eşya ya da birinin aceleyle bıraktığı bir düzen. Bu, bir sonraki adımı seçtirir.`,
          `Dikkatini ${message.toLocaleLowerCase("tr")} üstüne toplarsın. ${place} sana bir ayrıntı bırakır: bir koku, bir çizik, bir eksik. Henüz cevap değil, yön.`,
        ],
        message,
      );
    } else {
      narrative = `${place} sana istediğin açıklığı vermez. ${name}, baktığın yer ya karanlık ya da kasıtlı olarak boş. Daha yakından bakmak için bir zar, ya da başka bir açı gerekir.`;
    }
  } else if (/aç|kilit|gizlen|sokul|kaç|tırman|atla|sessiz|gir|çöz|takip|çalı/.test(lower)) {
    if (success) {
      commands.push({ type: "time", delta_hours: 1 });
      narrative = `${name}, ${place} içinde hamleni bitiriyorsun. ${message} Engel yerini belli etti ve sen geçtin. İz kalabilir.`;
    } else {
      commands.push({ type: "hp", delta: -2 });
      narrative = `${name}, ${place} içinde bunu deniyorsun ama tutmuyor. ${message} Gürültü, kilit ya da zemin seni ele veriyor.`;
    }
  } else if (dice && !success) {
    narrative = `${name}, ${place} içinde bunu denersin: ${message} Sonuç yarım kalır. Engel yıkılmaz, sadece yerini belli eder.`;
  } else {
    narrative = pick(
      [
        `${name}, ${place} içinde dediğin gibi hareket edersin. ${message} Sahne buna göre kıpırdar. Kimse senin yerine seçim yapmaz. Önünde hâlâ açık bir kapı var.`,
        `${place} seni duyuyor. ${message} Etraf buna küçük bir karşılık verir: bir bakış, bir ses, bir yer değiştiren eşya. Sonraki adım senin.`,
      ],
      `${message}:${place}`,
    );
    if (success && dice) commands.push({ type: "time", delta_hours: 1 });
  }

  if (dice && success && dice.natural === 20 && !commands.some((command) => command.type === "xp")) {
    commands.push({ type: "xp", delta: 5 });
  }

  return { narrative, commands };
}

export function playLocalTurn(game: Game, message: string, fixedNatural?: number): { narrative: string; commands: Command[]; dice: DiceResolved | null } {
  const scale = game.settings.genre === "veyra" ? "veyra" : "classic";
  const check = localCheck(message, game.settings.difficulty, scale);
  if (!check) {
    const quiet = fallbackTurn(game, message, null);
    return { ...quiet, dice: null };
  }
  let natural = fixedNatural ?? rollD20();
  if (game.settings.genre === "veyra" && fixedNatural === undefined && natural === 1 && raceByName(game.character.race)?.luck) natural = rollD20();
  const dice = withSkillBonus(resolveDice(natural, check.stat, game.character.stats, game.settings.difficulty, check.dc), game, check.skill);
  dice.reason = check.reason;
  const turn = fallbackTurn(game, message, dice);
  return { ...turn, dice };
}
