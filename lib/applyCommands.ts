import type { Command, Source } from "./commands";
import { defaultSlot } from "./commands";
import { modifier } from "./dice";
import { clamp, sameName, signed } from "./format";
import { now, uid } from "./ids";
import type { Character, Game, Item } from "./types";
import { SLOTS } from "./types";
import { essenceMax, findNode, levelCap, nextGuildRank, pathByName, raceByName, rankCap, statCap, unlockPlan } from "./veyra";

export type ApplyResult = {
  game: Game;
  summaries: string[];
  rejected: string[];
};

const NO_EQUIP = new Set(["consumable", "material", "quest", "key", "book"]);

function hasCondition(character: Character, name: string): boolean {
  return character.conditions.some((condition) => sameName(condition, name));
}

function pushCondition(character: Character, name: string): boolean {
  if (hasCondition(character, name)) return false;
  if (character.conditions.length >= 12) return false;
  character.conditions.push(name);
  return true;
}

function dropCondition(character: Character, name: string): boolean {
  const before = character.conditions.length;
  character.conditions = character.conditions.filter((condition) => !sameName(condition, name));
  return character.conditions.length !== before;
}

export function carriedWeight(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.weight * item.qty, 0);
}

export function carryCapacity(strength: number): number {
  return Math.max(5, strength * 5);
}

export function computeAc(character: Character, items: Item[]): number {
  const bonus = items.reduce((sum, item) => sum + (item.equippedSlot ? item.props.ac ?? 0 : 0), 0);
  return 10 + modifier(character.stats.dex) + bonus + (character.naturalArmor ? 1 : 0);
}

function findItem(items: Item[], name: string, id?: string): Item | undefined {
  if (id) return items.find((item) => item.id === id);
  return items.find((item) => sameName(item.name, name) && !item.equippedSlot) ?? items.find((item) => sameName(item.name, name));
}

function itemFromDraft(draft: Command & { type: "item_add" }): Item {
  const item = draft.item;
  return {
    id: uid(),
    name: item.name,
    type: item.itemType,
    subtype: item.subtype,
    description: item.description,
    lore: item.lore,
    rarity: item.rarity,
    weight: item.weight,
    value: item.value,
    qty: item.qty,
    stackable: item.stackable,
    slot: item.slot,
    equippedSlot: null,
    magical: item.magical,
    props: {
      ...(item.damage ? { damage: item.damage } : {}),
      ...(item.ac ? { ac: item.ac } : {}),
      ...(item.heal ? { heal: item.heal } : {}),
      ...(item.healMana ? { healMana: item.healMana } : {}),
      ...(item.stat ? { stat: item.stat } : {}),
      ...(item.hands === 2 ? { hands: 2 } : {}),
    },
  };
}

function writeHp(game: Game, target: number, source: Source, mode: "delta" | "set"): string[] {
  const character = game.character;
  if (!character.isAlive && source === "ai" && target > 0) {
    return ["__reject__:Ölü karakteri yalnız sen diriltebilirsin"];
  }
  const before = character.hp;
  let value = clamp(Math.round(target), 0, character.maxHp);
  const summaries: string[] = [];
  const lethal = value <= 0;
  if (lethal && character.lastStand) {
    value = 1;
    character.lastStand = false;
    summaries.push("Son nefes");
  } else if (lethal && (mode === "delta" || source === "ai" || source === "system")) {
    if (game.settings.difficulty === "kolay") {
      value = Math.min(1, character.maxHp);
      if (pushCondition(character, "sendeleyen")) summaries.push("Sendeledin");
    } else if (game.settings.difficulty === "normal") {
      value = 0;
      if (pushCondition(character, "baygın")) summaries.push("Bayıldın");
    } else {
      value = 0;
      character.isAlive = false;
      if (pushCondition(character, "ölü")) summaries.push("Öldün");
    }
  } else if (lethal && mode === "set") {
    value = 0;
    character.isAlive = false;
    if (pushCondition(character, "ölü")) summaries.push("Öldün");
  }
  if (value > 0) {
    character.isAlive = true;
    character.conditions = character.conditions.filter((condition) => !sameName(condition, "ölü") && !sameName(condition, "baygın"));
  }
  character.hp = value;
  if (character.hp !== before) summaries.unshift(`Can ${signed(character.hp - before)}`);
  return summaries;
}

function syncEssence(game: Game): number {
  if (game.settings.genre !== "veyra" || !game.settings.magic) return 0;
  const path = pathByName(game.character.className);
  if (!path) return 0;
  const next = essenceMax(path, game.character.level, game.character.stats, raceByName(game.character.race));
  const delta = next - game.character.maxMana;
  game.character.maxMana = next;
  game.character.mana = clamp(game.character.mana + Math.max(0, delta), 0, next);
  return delta;
}

function grantLevel(game: Game): string {
  const character = game.character;
  if (game.settings.genre === "veyra") {
    const path = pathByName(character.className);
    const gain = Math.max(1, (path?.average ?? 5) + modifier(character.stats.con));
    character.level += 1;
    character.maxHp += gain;
    character.hp = Math.min(character.maxHp, character.hp + gain);
    character.talentPoints += 2;
    if (character.level % 5 === 0) character.statPoints += 1;
    if (character.level % 10 === 0) character.peakGifts += 1;
    syncEssence(game);
    return `Seviye ${character.level}`;
  }
  character.level += 1;
  character.maxHp += 4;
  character.hp = Math.min(character.maxHp, character.hp + 4);
  if (game.settings.magic) {
    character.maxMana += 2;
    character.mana = Math.min(character.maxMana, character.mana + 2);
  }
  character.statPoints += 1;
  return `Seviye ${character.level}`;
}

function drainLevels(game: Game): string[] {
  const summaries: string[] = [];
  let guard = 0;
  const cap = levelCap(game.settings.genre);
  while (game.character.xp >= game.character.level * 100 && game.character.level < cap && guard < 12) {
    game.character.xp -= game.character.level * 100;
    summaries.push(grantLevel(game));
    guard += 1;
  }
  return summaries;
}

function applyOne(game: Game, command: Command, source: Source): { summaries: string[]; error?: string } {
  if (!game.character.isAlive && source === "ai" && command.type !== "journal_add") {
    return { summaries: [], error: "Karakter ölü" };
  }
  const character = game.character;

  switch (command.type) {
    case "hp":
    case "set_hp": {
      const target = command.type === "hp" ? character.hp + command.delta : command.value;
      const summaries = writeHp(game, target, source, command.type === "hp" ? "delta" : "set");
      const rejected = summaries.find((line) => line.startsWith("__reject__:"));
      if (rejected) return { summaries: [], error: rejected.replace("__reject__:", "") };
      return { summaries };
    }
    case "max_hp":
    case "set_max_hp": {
      const before = character.maxHp;
      const next = command.type === "max_hp" ? character.maxHp + command.delta : command.value;
      character.maxHp = clamp(next, 1, game.settings.genre === "veyra" ? 9999 : 999);
      if (character.hp > character.maxHp) character.hp = character.maxHp;
      if (character.maxHp === before) return { summaries: [] };
      return { summaries: [`Azami can ${signed(character.maxHp - before)}`] };
    }
    case "mana":
    case "set_mana": {
      if (!game.settings.magic) return { summaries: [], error: "Büyü kapalı" };
      const before = character.mana;
      const next = command.type === "mana" ? character.mana + command.delta : command.value;
      character.mana = clamp(next, 0, character.maxMana);
      if (character.mana === before) return { summaries: [] };
      return { summaries: [`${game.settings.genre === "veyra" ? "Öz" : "Mana"} ${signed(character.mana - before)}`] };
    }
    case "set_max_mana": {
      if (!game.settings.magic && source === "ai") return { summaries: [], error: "Büyü kapalı" };
      const before = character.maxMana;
      character.maxMana = clamp(command.value, 0, game.settings.genre === "veyra" ? 9999 : 999);
      character.mana = Math.min(character.mana, character.maxMana);
      if (character.maxMana === before) return { summaries: [] };
      return { summaries: [`Azami ${game.settings.genre === "veyra" ? "Öz" : "mana"} ${signed(character.maxMana - before)}`] };
    }
    case "gold":
    case "set_gold": {
      const before = character.gold;
      const next = command.type === "gold" ? character.gold + command.delta : command.value;
      character.gold = clamp(next, 0, 999999);
      if (character.gold === before) return { summaries: [] };
      return { summaries: [`${game.settings.currency} ${signed(character.gold - before)}`] };
    }
    case "xp":
    case "set_xp": {
      const before = character.xp;
      const next = command.type === "xp" ? character.xp + command.delta : command.value;
      character.xp = clamp(next, 0, 99999);
      const summaries: string[] = [];
      if (character.xp !== before) summaries.push(`XP ${signed(character.xp - before)}`);
      summaries.push(...drainLevels(game));
      return { summaries };
    }
    case "level_up": {
      if (character.level >= 20) return { summaries: [], error: "Seviye tavanı" };
      return { summaries: [grantLevel(game)] };
    }
    case "set_level": {
      const before = character.level;
      const value = clamp(command.value, 1, levelCap(game.settings.genre));
      if (value === before) return { summaries: [] };
      if (value > before && game.settings.genre !== "veyra") character.statPoints += value - before;
      character.level = value;
      if (game.settings.genre === "veyra") syncEssence(game);
      return { summaries: [`Seviye ${value}`] };
    }
    case "stat": {
      const before = character.stats[command.stat];
      const ceiling = game.settings.genre === "veyra" ? statCap(character.level) : source === "ai" ? 20 : 24;
      const value = clamp(before + command.delta, 1, ceiling);
      if (value === before) return { summaries: [] };
      if (source !== "ai" && value > before && character.statPoints > 0) {
        character.statPoints = Math.max(0, character.statPoints - (value - before));
      }
      character.stats[command.stat] = value;
      if (game.settings.genre === "veyra") syncEssence(game);
      return { summaries: [`${command.stat.toUpperCase()} ${signed(value - before)}`] };
    }
    case "set_stat": {
      const before = character.stats[command.stat];
      const ceiling = game.settings.genre === "veyra" ? statCap(character.level) : 30;
      character.stats[command.stat] = clamp(command.value, 1, ceiling);
      if (character.stats[command.stat] === before) return { summaries: [] };
      if (game.settings.genre === "veyra") syncEssence(game);
      return { summaries: [`${command.stat.toUpperCase()} ${character.stats[command.stat]}`] };
    }
    case "time":
    case "set_time": {
      const before = game.worldTime;
      game.worldTime = Math.max(0, command.type === "time" ? game.worldTime + command.delta_hours : command.hours);
      if (game.worldTime === before) return { summaries: [] };
      return { summaries: [`Saat ${signed(game.worldTime - before)}`] };
    }
    case "condition_add": {
      if (!pushCondition(character, command.name)) return { summaries: [] };
      return { summaries: [`Durum: ${command.name}`] };
    }
    case "condition_remove": {
      if (!dropCondition(character, command.name)) return { summaries: [] };
      return { summaries: [`Kalktı: ${command.name}`] };
    }
    case "item_add": {
      if (game.inventory.length >= 80 && !command.item.stackable) return { summaries: [], error: "Envanter dolu" };
      const existing = game.inventory.find((item) => sameName(item.name, command.item.name) && item.stackable && command.item.stackable && !item.equippedSlot);
      if (existing) {
        existing.qty += command.item.qty;
        return { summaries: [`${existing.name} ×${command.item.qty}`] };
      }
      const created = itemFromDraft(command);
      game.inventory.push(created);
      return { summaries: [`Eşya: ${created.name}`] };
    }
    case "item_remove": {
      let left = command.qty;
      const matches = game.inventory.filter((item) => (command.id ? item.id === command.id : sameName(item.name, command.name)));
      if (!matches.length) return { summaries: [], error: `Envanterde yok: ${command.name}` };
      const ordered = [...matches.filter((item) => !item.equippedSlot), ...matches.filter((item) => item.equippedSlot)];
      for (const item of ordered) {
        if (left <= 0) break;
        const take = Math.min(item.qty, left);
        item.qty -= take;
        left -= take;
        if (item.qty <= 0) {
          item.equippedSlot = null;
          game.inventory = game.inventory.filter((candidate) => candidate.id !== item.id);
        }
      }
      const removed = command.qty - left;
      if (!removed) return { summaries: [], error: `Envanterde yok: ${command.name}` };
      return { summaries: [`Çıktı: ${command.name} ×${removed}`] };
    }
    case "item_equip": {
      const item = findItem(game.inventory, command.name, command.id);
      if (!item) return { summaries: [], error: `Envanterde yok: ${command.name}` };
      if (NO_EQUIP.has(item.type)) return { summaries: [], error: "Bu eşya kuşanılmaz" };
      if (item.magical && !game.settings.magic) return { summaries: [], error: "Büyü kapalı" };
      const slot = command.slot ?? item.slot ?? defaultSlot(item.type, item.subtype);
      if (!slot || !SLOTS.includes(slot)) return { summaries: [], error: "Yuva yok" };
      for (const other of game.inventory) {
        if (other.id !== item.id && other.equippedSlot === slot) other.equippedSlot = null;
      }
      if (slot === "main_hand" && item.props.hands === 2) {
        for (const other of game.inventory) if (other.equippedSlot === "off_hand") other.equippedSlot = null;
      }
      if (slot === "off_hand") {
        const twoHand = game.inventory.find((other) => other.equippedSlot === "main_hand" && other.props.hands === 2);
        if (twoHand) twoHand.equippedSlot = null;
      }
      item.equippedSlot = slot;
      return { summaries: [`Kuşanıldı: ${item.name}`] };
    }
    case "item_unequip": {
      const item = game.inventory.find((candidate) => candidate.equippedSlot === command.slot);
      if (!item) return { summaries: [] };
      item.equippedSlot = null;
      return { summaries: [`Çıkarıldı: ${item.name}`] };
    }
    case "skill_add": {
      const existing = character.skills.find((skill) => sameName(skill.name, command.name));
      const next = game.settings.genre === "veyra" ? Math.min(command.level, rankCap(character.level)) : command.level;
      if (game.settings.genre === "veyra" && source !== "ai") {
        const prev = existing?.level ?? 0;
        if (next !== prev + 1) return { summaries: [], error: "Rütbe birer birer artar" };
        if (character.talentPoints < next) return { summaries: [], error: "Yetenek puanı yetmiyor" };
        character.talentPoints -= next;
      }
      if (existing) {
        if (existing.level >= next) return { summaries: [] };
        existing.level = next;
      } else {
        if (character.skills.length >= 24) return { summaries: [], error: "Beceri listesi dolu" };
        character.skills.push({ name: command.name, level: next });
      }
      return { summaries: [`Beceri: ${command.name}`] };
    }
    case "spell_learn": {
      if (!game.settings.magic) return { summaries: [], error: "Büyü kapalı" };
      if (character.spells.some((spell) => sameName(spell, command.name))) return { summaries: [] };
      if (character.spells.length >= 32) return { summaries: [], error: "Büyü listesi dolu" };
      character.spells.push(command.name);
      return { summaries: [`Büyü: ${command.name}`] };
    }
    case "location_set": {
      if (sameName(game.location, command.name)) return { summaries: [] };
      game.location = command.name;
      return { summaries: [`Konum: ${command.name}`] };
    }
    case "quest_add": {
      if (game.quests.some((quest) => sameName(quest.title, command.title))) return { summaries: [], error: "Bu görev zaten var" };
      if (game.quests.length >= 30) return { summaries: [], error: "Görev listesi dolu" };
      game.quests.unshift({
        id: uid(),
        title: command.title,
        description: command.description,
        status: "active",
        objectives: command.objectives.map((text) => ({ text, done: false })),
        reward: command.reward,
      });
      return { summaries: [`Görev: ${command.title}`] };
    }
    case "quest_update": {
      const quest = game.quests.find((candidate) => sameName(candidate.title, command.title))
        ?? game.quests.find((candidate) => candidate.title.toLocaleLowerCase("tr").includes(command.title.toLocaleLowerCase("tr")));
      if (!quest) return { summaries: [], error: `Görev yok: ${command.title}` };
      const summaries: string[] = [];
      if (command.objective_done) {
        const needle = command.objective_done.toLocaleLowerCase("tr");
        const objective = quest.objectives.find((entry) => entry.text.toLocaleLowerCase("tr").includes(needle) || needle.includes(entry.text.toLocaleLowerCase("tr")));
        if (objective && !objective.done) {
          objective.done = true;
          summaries.push(`Hedef: ${objective.text}`);
        }
      }
      if (command.status && quest.status !== command.status) {
        quest.status = command.status;
        summaries.push(`Görev ${quest.status === "completed" ? "bitti" : quest.status === "failed" ? "bozuldu" : "açık"}: ${quest.title}`);
      }
      if (quest.objectives.length > 0 && quest.objectives.every((entry) => entry.done) && quest.status === "active") {
        quest.status = "completed";
        summaries.push(`Görev bitti: ${quest.title}`);
      }
      return { summaries };
    }
    case "npc_touch": {
      let npc = game.npcs.find((candidate) => sameName(candidate.name, command.name));
      const created = !npc;
      if (!npc) {
        if (game.npcs.length >= 40) return { summaries: [], error: "Kişi listesi dolu" };
        npc = { id: uid(), name: command.name, attitude: 0, status: "alive", location: game.location, notes: "" };
        game.npcs.push(npc);
      }
      const summaries: string[] = [];
      if (command.delta) {
        const before = npc.attitude;
        npc.attitude = clamp(npc.attitude + command.delta, -100, 100);
        if (npc.attitude !== before) summaries.push(`${npc.name} ${signed(npc.attitude - before)}`);
      }
      if (command.status && npc.status !== command.status) {
        npc.status = command.status;
        summaries.push(`${npc.name}: ${npc.status === "alive" ? "sağ" : npc.status === "dead" ? "ölü" : "kayıp"}`);
      }
      if (command.location) npc.location = command.location;
      if (command.notes) npc.notes = command.notes;
      if (created) summaries.unshift(`Kişi: ${npc.name}`);
      return { summaries };
    }
    case "reputation": {
      const before = character.reputation[command.faction] ?? 0;
      const next = clamp(before + command.delta, -100, 100);
      if (next === before) return { summaries: [] };
      character.reputation[command.faction] = next;
      return { summaries: [`İtibar ${command.faction} ${signed(next - before)}`] };
    }
    case "honor": {
      if (game.settings.genre !== "veyra") return { summaries: [], error: "Onur yalnız Veyra'da" };
      const before = character.honor;
      character.honor = clamp(before + command.delta, -100, 100);
      if (character.honor === before) return { summaries: [] };
      return { summaries: [`Onur ${signed(character.honor - before)}`] };
    }
    case "guild_lp": {
      if (game.settings.genre !== "veyra") return { summaries: [], error: "Lonca yalnız Veyra'da" };
      const before = character.guildPoints;
      character.guildPoints = clamp(before + command.delta, 0, 999999);
      if (character.guildPoints === before) return { summaries: [] };
      return { summaries: [`Lonca puanı ${signed(character.guildPoints - before)}`] };
    }
    case "guild_promote": {
      const next = nextGuildRank(character.guildRank, character.level, character.guildPoints);
      if (!next) return { summaries: [], error: "Terfi şartı yok" };
      character.guildRank = next;
      return { summaries: [`Lonca: ${next}`] };
    }
    case "talent_unlock": {
      const plan = unlockPlan(character, command.id);
      if ("error" in plan) return { summaries: [], error: plan.error };
      const found = findNode(command.id);
      if (!found) return { summaries: [], error: "Yetenek yok" };
      if (plan.usePeak) character.peakGifts -= 1;
      else character.talentPoints -= plan.cost;
      character.talents.push(found.node.id);
      if (found.node.spell && !character.spells.some((spell) => sameName(spell, found.node.name))) character.spells.push(found.node.name);
      return { summaries: [`Yetenek: ${found.node.name}`] };
    }
    case "oath_set": {
      if (character.oath) return { summaries: [], error: "Yemin bir kez edilir" };
      character.oath = command.name;
      return { summaries: [`Yemin: ${command.name}`] };
    }
    case "journal_add": {
      game.journal.unshift({ id: uid(), content: command.text, createdAt: now() });
      if (game.journal.length > 100) game.journal.length = 100;
      return { summaries: ["Günlüğe geçti"] };
    }
    case "set_alive": {
      if (command.value) {
        character.isAlive = true;
        if (character.hp <= 0) character.hp = 1;
        dropCondition(character, "ölü");
        return { summaries: ["Hayata döndün"] };
      }
      character.isAlive = false;
      character.hp = 0;
      pushCondition(character, "ölü");
      return { summaries: ["Öldün"] };
    }
    default:
      return { summaries: [], error: "Komut uygulanamadı" };
  }
}

export function applyCommands(game: Game, commands: Command[], source: Source): ApplyResult {
  const next = structuredClone(game);
  const wasOver = next.character.conditions.some((condition) => sameName(condition, "aşırı yüklü"));
  const summaries: string[] = [];
  const rejected: string[] = [];
  const cap = source === "ai" ? 6 : 20;
  for (const command of commands.slice(0, cap)) {
    const result = applyOne(next, command, source);
    if (result.error) rejected.push(result.error);
    else summaries.push(...result.summaries);
  }
  const over = carriedWeight(next.inventory) > carryCapacity(next.character.stats.str);
  const hasOver = next.character.conditions.some((condition) => sameName(condition, "aşırı yüklü"));
  if (over && !hasOver) {
    next.character.conditions.push("aşırı yüklü");
    summaries.push("Aşırı yüklü");
  } else if (!over && hasOver) {
    next.character.conditions = next.character.conditions.filter((condition) => !sameName(condition, "aşırı yüklü"));
    if (wasOver) summaries.push("Yük hafifledi");
  }
  next.character.ac = computeAc(next.character, next.inventory);
  const stamped = now();
  for (const summary of summaries) {
    next.events.push({ id: uid(), source, summary, createdAt: stamped });
  }
  if (next.events.length > 300) next.events.splice(0, next.events.length - 300);
  next.updatedAt = stamped;
  return { game: next, summaries, rejected };
}
