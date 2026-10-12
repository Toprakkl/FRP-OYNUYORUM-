import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCommands } from "./applyCommands";
import { acceptCommands, sanitizeCommand } from "./commands";
import { createGame } from "./createGame";
import { resolveDice } from "./dice";
import { playLocalTurn } from "./fallback";
import { takeSnap, undoGame } from "./history";
import { selectLore } from "./lore";
import { readAiPayload } from "./modelJson";
import type { Game } from "./types";
import { pointCost, pointSpent, withSkillBonus } from "./veyra";
import { getScenario, kingdomNet, professionWeek } from "./veyraLife";

function game(): Game {
  return createGame({
    genre: "orta_cag",
    customGenre: "",
    theme: "orta_cag",
    classId: "savasci",
    name: "Aria",
    race: "İnsan",
    age: 30,
    concept: "Eski bir muhafız.",
    difficulty: "normal",
    magic: true,
    tone: "normal",
    stats: { str: 16, dex: 13, con: 15, int: 8, wis: 10, cha: 10 },
  });
}

describe("zar ve masa", () => {
  it("doğal zara stat bonusunu sunucu ekler", () => {
    const dice = resolveDice(14, "str", { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, "normal");
    assert.equal(dice.modifier, 3);
    assert.equal(dice.total, 17);
    assert.equal(dice.dc, 14);
  });

  it("yeni macera açılış, eşya ve görevle gelir", () => {
    const created = game();
    assert.equal(created.character.name, "Aria");
    assert.equal(created.messages[0]?.content.includes("oluşun"), false);
    assert.equal(created.messages[0]?.role, "ai");
    assert.ok(created.inventory.some((item) => item.name === "Demir kılıç" && item.equippedSlot === "main_hand"));
    assert.equal(created.quests[0]?.status, "active");
    assert.ok(created.character.ac > 10);
  });
});

describe("komutlar", () => {
  it("yapay zeka canı otuzdan fazla düşüremez", () => {
    const result = sanitizeCommand({ type: "hp", delta: -500 }, "ai", game().settings);
    assert.equal(result.ok, false);
  });

  it("elle seviye serbest, yapay zeka set_hp kullanamaz", () => {
    const manual = sanitizeCommand({ type: "set_level", value: 4 }, "manual", game().settings);
    const ai = sanitizeCommand({ type: "set_hp", value: 99 }, "ai", game().settings);
    assert.equal(manual.ok, true);
    assert.equal(ai.ok, false);
  });

  it("büyü kapalıyken büyü öğrenilmez", () => {
    const table = game();
    table.settings.magic = false;
    const result = sanitizeCommand({ type: "spell_learn", name: "Ateş" }, "ai", table.settings);
    assert.equal(result.ok, false);
  });

  it("can tavana yapışır, xp seviye verir, kolay mod öldürmez", () => {
    const table = game();
    const healed = applyCommands(table, [{ type: "hp", delta: 10 }], "ai");
    assert.equal(healed.game.character.hp, table.character.maxHp);
    assert.equal(healed.summaries.length, 0);

    const xp = applyCommands(table, [{ type: "xp", delta: 50 }], "manual");
    assert.equal(xp.game.character.level, 1);
    const leveled = applyCommands(xp.game, [{ type: "xp", delta: 60 }], "manual");
    assert.equal(leveled.game.character.level, 2);
    assert.ok(leveled.game.character.statPoints >= 1);

    const soft = structuredClone(table);
    soft.settings.difficulty = "kolay";
    const hit = applyCommands(soft, [{ type: "hp", delta: -30 }], "ai");
    assert.equal(hit.game.character.hp, 1);
    assert.equal(hit.game.character.isAlive, true);
    assert.ok(hit.game.character.conditions.includes("sendeleyen"));
  });

  it("sert modda sıfır can ölür ve yapay zeka diriltemez", () => {
    const table = game();
    table.settings.difficulty = "sert";
    table.character.hp = 8;
    const dead = applyCommands(table, [{ type: "hp", delta: -20 }], "ai");
    assert.equal(dead.game.character.isAlive, false);
    const heal = applyCommands(dead.game, [{ type: "hp", delta: 10 }], "ai");
    assert.equal(heal.game.character.isAlive, false);
    assert.ok(heal.rejected.length > 0);
  });

  it("kuşanma yuvayı değiştirir, olmayan eşya çıkmaz, ekmek yığılır", () => {
    const table = game();
    const swapped = applyCommands(table, [{ type: "item_equip", name: "Meşale", slot: "off_hand" }], "manual");
    assert.equal(swapped.rejected.length, 0);
    assert.ok(swapped.game.inventory.some((item) => item.name === "Meşale" && item.equippedSlot === "off_hand"));

    const missing = applyCommands(table, [{ type: "item_remove", name: "Ejderha", qty: 1 }], "ai");
    assert.ok(missing.rejected[0]?.includes("Ejderha"));

    const bread = acceptCommands(
      [
        { type: "item_add", name: "Ekmek", itemType: "consumable", qty: 2, stackable: true },
      ],
      "manual",
      table.settings,
      4,
    );
    const stacked = applyCommands(table, bread.commands, "manual");
    const loaf = stacked.game.inventory.find((item) => item.name === "Ekmek");
    assert.ok(loaf && loaf.qty >= 3);
  });

  it("aşırı yük durumunu takar ve geri alma canı eski haline getirir", () => {
    const table = game();
    const loaded = applyCommands(
      table,
      [
        {
          type: "item_add",
          item: {
            name: "Sandık",
            qty: 1,
            itemType: "misc",
            subtype: "",
            description: "Ağır",
            lore: "",
            rarity: "common",
            weight: 90,
            value: 1,
            slot: null,
            magical: false,
            stackable: false,
          },
        },
      ],
      "manual",
    );
    assert.ok(loaded.game.character.conditions.includes("aşırı yüklü"));

    const hurt = applyCommands(table, [{ type: "hp", delta: -5 }], "manual");
    const withHistory = {
      ...hurt.game,
      history: [
        {
          label: "test",
          messageCount: table.messages.length,
          snap: {
            character: structuredClone(table.character),
            inventory: structuredClone(table.inventory),
            quests: structuredClone(table.quests),
            npcs: structuredClone(table.npcs),
            location: table.location,
            worldTime: table.worldTime,
            journal: [],
            events: structuredClone(table.events),
            summary: "",
          },
        },
      ],
    };
    const undone = undoGame(withHistory);
    assert.equal(undone?.character.hp, table.character.hp);
    assert.equal(undone?.messages.length, table.messages.length);
  });
});

describe("Veyra", () => {
  it("puan maliyeti ve doğuş masası kanonu taşır", () => {
    assert.equal(pointCost(8), 0);
    assert.equal(pointCost(15), 9);
    assert.equal(pointSpent({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }), 0);
    const born = createGame({
      genre: "veyra",
      customGenre: "",
      theme: "veyra",
      classId: "savasci",
      name: "Aria",
      race: "İnsan",
      age: 24,
      concept: "Lonca kapısından girdi.",
      difficulty: "normal",
      magic: false,
      tone: "normal",
      stats: { str: 15, dex: 14, con: 13, int: 10, wis: 10, cha: 10 },
      originId: "lonca",
      bonusSkill: "İkna",
    });
    assert.equal(born.settings.magic, true);
    assert.equal(born.settings.theme, "veyra");
    assert.match(born.title, /VEYRA: DOĞUŞ/);
    assert.match(born.location, /Lormarin/);
    assert.match(born.messages[0]?.content ?? "", /YT 1247/);
    assert.doesNotMatch(born.messages[0]?.content ?? "", /Çekirdek/);
    assert.equal(born.character.honor, 0);
    assert.equal(born.character.talentPoints, 2);
    assert.equal(born.character.guildRank, "Bakır");
    assert.ok(born.character.skills.some((skill) => skill.name === "İkna"));
    assert.ok(born.lore.some((entry) => entry.title === "Hakem kilidi" && entry.visibility === "ai_only" && entry.alwaysInclude));
    const leveled = applyCommands(born, [{ type: "xp", delta: 100 }], "manual");
    assert.equal(leveled.game.character.level, 2);
    assert.equal(leveled.game.character.statPoints, 0);
    assert.equal(leveled.game.character.talentPoints, 4);
  });

  it("onur sınırlıdır, beceri bonusu zara eklenir, ork bir kez ayakta kalır", () => {
    const born = createGame({
      genre: "veyra",
      customGenre: "",
      theme: "veyra",
      classId: "savasci",
      name: "Borg",
      race: "Ork",
      age: 22,
      concept: "",
      difficulty: "sert",
      magic: true,
      tone: "normal",
      stats: { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 8 },
      originId: "hrimgard",
    });
    assert.equal(sanitizeCommand({ type: "honor", delta: 30 }, "ai", born.settings).ok, false);
    const honored = applyCommands(born, [{ type: "honor", delta: 5 }], "ai");
    assert.equal(honored.game.character.honor, 5);
    born.character.skills.push({ name: "Gizlilik", level: 1 });
    const dice = withSkillBonus(
      { natural: 10, stat: "dex", modifier: 0, total: 10, dc: 12, reason: "Gizlenme" },
      born,
      "Gizlilik",
    );
    assert.equal(dice.modifier, 2);
    assert.equal(dice.total, 12);
    born.character.hp = 4;
    const stood = applyCommands(born, [{ type: "hp", delta: -10 }], "ai");
    assert.equal(stood.game.character.hp, 1);
    assert.equal(stood.game.character.isAlive, true);
    assert.equal(stood.game.character.lastStand, false);
    const dead = applyCommands(stood.game, [{ type: "hp", delta: -10 }], "ai");
    assert.equal(dead.game.character.isAlive, false);
    born.character.fatigue = 1;
    const tired = withSkillBonus(
      { natural: 10, stat: "dex", modifier: 0, total: 10, dc: 12, reason: "Gizlenme" },
      born,
      "Gizlilik",
    );
    assert.equal(tired.modifier, 1);
    assert.equal(tired.total, 11);
  });

  it("meslek haftası, yerleşim ve senaryo masaya oturur", () => {
    const week = professionWeek(14, 2, 30, 1);
    assert.equal(week.gold, 3);
    assert.equal(week.mp, 1);
    const sample = {
      name: "Örnek",
      tier: 4,
      population: 10000,
      treasury: 0,
      army: 300,
      people: 50,
      stability: 50,
      influence: 30,
      legitimacy: 40,
      buildings: ["Tapınak", "Kışla", "Surlar", "Kütüphane", "Demirhane", "Şifahane"],
      advisors: [
        { role: "Mareşal", name: "A", loyalty: 70 },
        { role: "Elçi", name: "B", loyalty: 70 },
        { role: "Başrahip", name: "C", loyalty: 70 },
        { role: "Yargıç", name: "D", loyalty: 70 },
      ],
      boons: [],
      pendingEvent: 0,
    };
    const net = kingdomNet(sample);
    assert.equal(net.income, 2000);
    assert.equal(net.expense, 560);
    assert.equal(net.net, 1440);
    assert.equal(getScenario("lonca"), undefined);

    const born = createGame({
      genre: "veyra",
      customGenre: "",
      theme: "veyra",
      classId: "savasci",
      name: "Dara",
      race: "İnsan",
      age: 24,
      concept: "",
      difficulty: "normal",
      magic: true,
      tone: "normal",
      originId: "sinir-koyu",
    });
    assert.equal(born.character.profession?.name, "Çiftçi");
    assert.equal(born.kingdom?.tier, 2);
    assert.equal(born.kingdom?.name, "Eşikköy");
    assert.equal(born.npcs[0]?.bond, 15);
    assert.equal(sanitizeCommand({ type: "season_advance", event: 1 }, "ai", born.settings).ok, false);
    const people = born.kingdom?.people ?? 0;
    const season = applyCommands(born, [{ type: "season_advance", event: 1 }], "manual");
    assert.equal(season.game.kingdom?.pendingEvent, 1);
    assert.equal(season.game.kingdom?.people, people);
    assert.equal(season.game.worldTime, born.worldTime + 2160);
    const choice = applyCommands(season.game, [{ type: "kingdom_choice", index: 0 }], "manual");
    assert.equal(choice.game.kingdom?.pendingEvent, 0);
    assert.equal(choice.game.kingdom?.people, people + 8);
    const quiet = applyCommands(choice.game, [{ type: "season_advance", event: 10 }, { type: "kingdom_choice", index: 0 }], "manual");
    assert.equal(quiet.game.kingdom?.pendingEvent, 0);

    const lonca = createGame({
      genre: "veyra",
      customGenre: "",
      theme: "veyra",
      classId: "savasci",
      name: "Aria",
      race: "İnsan",
      age: 24,
      concept: "",
      difficulty: "normal",
      magic: true,
      tone: "normal",
      originId: "lonca",
    });
    const denied = applyCommands(lonca, [{ type: "season_advance", event: 4 }], "manual");
    assert.equal(denied.game.kingdom, null);
    assert.ok(denied.rejected.length > 0);
    const rich = applyCommands(lonca, [{ type: "set_gold", value: 250 }], "manual");
    const founded = applyCommands(rich.game, [{ type: "kingdom_found", name: "Eşik" }], "manual");
    assert.equal(founded.game.kingdom?.tier, 1);
    assert.equal(founded.game.character.gold, 50);
    const undone = undoGame({ ...founded.game, history: [{ label: "kur", messageCount: 1, snap: takeSnap(rich.game) }] });
    assert.equal(undone?.kingdom, null);
    assert.equal(undone?.character.gold, 250);
  });
});

describe("hakem metni", () => {
  it("çitlenmiş JSON'u okur", () => {
    const payload = readAiPayload('```json\n{"narrative":"Kapı açılır.","commands":[{"type":"time","delta_hours":1}]}\n```');
    assert.equal(payload.narrative, "Kapı açılır.");
    assert.equal(payload.commands.length, 1);
  });

  it("dünya notundan anahtar kelimeyi seçer", () => {
    const table = game();
    const slices = selectLore(table, "Maren ile mektubu konuşuyorum");
    assert.ok(slices.some((entry) => entry.title === "Maren"));
    assert.ok(slices.some((entry) => entry.title === "Külkapı"));
  });

  it("yerel anlatıcı riskli işte kendi zarını atar", () => {
    const turn = playLocalTurn(game(), "Kapıyı sessizce açıyorum", 18);
    assert.equal(turn.dice?.natural, 18);
    assert.equal(turn.dice?.stat, "dex");
    assert.equal(turn.dice?.reason, "Gizlenme");
    assert.ok(turn.dice && turn.dice.total >= turn.dice.dc);
    assert.doesNotMatch(turn.narrative, /Zar atmadan/);
  });

  it("dinlenmek zar istemez, zar isteği anlatısız okunur", () => {
    const quiet = playLocalTurn(game(), "Bir süre dinleniyorum", 20);
    assert.equal(quiet.dice, null);
    assert.match(quiet.narrative, /Nefes/);
    const check = readAiPayload('{"narrative":"","commands":[],"check_stat":"dex","check_dc":15,"check_reason":"Kilit"}');
    assert.equal(check.checkStat, "dex");
    assert.equal(check.checkDc, 15);
    assert.equal(check.narrative, "");
  });
});
