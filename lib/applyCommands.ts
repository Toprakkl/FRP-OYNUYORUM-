import type { Command, Source } from "./commands";
import { defaultSlot } from "./commands";
import { modifier } from "./dice";
import { clamp, sameName, signed } from "./format";
import { now, uid } from "./ids";
import type { Character, Game, Item } from "./types";
import { SLOTS } from "./types";
import { essenceMax, findNode, levelCap, nextGuildRank, pathByName, raceByName, rankCap, statCap, unlockPlan } from "./veyra";
import { ADVISOR_ROLES, BUILDINGS, HOME_COST, SEASON_EVENTS, TIERS, blankKingdom, kingdomNet, seasonDelta, tierRequirement } from "./veyraLife";

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

function veyraOnly(game: Game): string | null {
  if (game.settings.genre !== "veyra") return "Bu masa Veyra değil";
  return null;
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
        npc = { id: uid(), name: command.name, attitude: 0, status: "alive", location: game.location, notes: "", bond: 0 };
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
    case "profession_set": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!command.name) {
        if (command.slot === "main") character.profession = null;
        else character.sideProfession = null;
        return { summaries: [command.slot === "main" ? "Ana meslek bırakıldı" : "Yan meslek bırakıldı"] };
      }
      if (command.slot === "side" && character.homeTier < 3) return { summaries: [], error: "Yan meslek için ev gerek" };
      const other = command.slot === "main" ? character.sideProfession : character.profession;
      if (other && sameName(other.name, command.name)) return { summaries: [], error: "Bu meslek diğer yuvada" };
      const current = command.slot === "main" ? character.profession : character.sideProfession;
      if (current && sameName(current.name, command.name)) return { summaries: [] };
      const next = { name: command.name, mp: 0 };
      if (command.slot === "main") character.profession = next;
      else character.sideProfession = next;
      return { summaries: [`Meslek: ${command.name}`] };
    }
    case "profession_mp": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      const job = command.slot === "main" ? character.profession : character.sideProfession;
      if (!job) return { summaries: [], error: "Meslek yok" };
      const before = job.mp;
      job.mp = clamp(before + command.delta, 0, 9999);
      if (job.mp === before) return { summaries: [] };
      return { summaries: [`${job.name} puanı ${signed(job.mp - before)}`] };
    }
    case "season_advance": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!game.kingdom) return { summaries: [], error: "Önce bir yerleşim kur" };
      if (game.kingdom.pendingEvent) return { summaries: [], error: "Önce kararı ver" };
      const net = kingdomNet(game.kingdom);
      game.kingdom.treasury = Math.max(0, game.kingdom.treasury + net.net);
      if (game.kingdom.treasury === 0 && net.net < 0) game.kingdom.stability = clamp(game.kingdom.stability - 5, 0, 100);
      game.kingdom.pendingEvent = command.event;
      game.worldTime += 2160;
      const event = SEASON_EVENTS.find((entry) => entry.roll === command.event);
      return { summaries: [`Sezon kapandı. Gelir ${net.income}, gider ${net.expense}.`, `Olay: ${event?.name ?? command.event}. Karar bekliyor.`] };
    }
    case "kingdom_choice": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!game.kingdom) return { summaries: [], error: "Yerleşim yok" };
      const event = SEASON_EVENTS.find((entry) => entry.roll === game.kingdom?.pendingEvent);
      const choice = event?.choices[command.index];
      if (!event || !choice) return { summaries: [], error: "Bekleyen karar yok" };
      const kingdom = game.kingdom;
      kingdom.people = clamp(seasonDelta(kingdom.people, choice.people, choice.note, "flat"), 0, 100);
      kingdom.stability = clamp(seasonDelta(kingdom.stability, choice.stability, choice.note, "flat"), 0, 100);
      kingdom.influence = clamp(seasonDelta(kingdom.influence, choice.influence, choice.note, "flat"), 0, 100);
      kingdom.legitimacy = clamp(seasonDelta(kingdom.legitimacy, choice.legitimacy, choice.note, "flat"), 0, 100);
      kingdom.treasury = Math.max(0, seasonDelta(kingdom.treasury, choice.treasury, choice.note, "treasury"));
      kingdom.army = Math.max(0, seasonDelta(kingdom.army, choice.army, choice.note, "flat"));
      kingdom.population = Math.max(1, seasonDelta(kingdom.population, choice.population, choice.note, "population"));
      if (choice.boon && !kingdom.boons.includes(choice.boon)) kingdom.boons.push(choice.boon);
      kingdom.pendingEvent = 0;
      return { summaries: [`Karar: ${choice.label}`] };
    }
    case "kingdom_found": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (game.kingdom) return { summaries: [], error: "Yerleşimin zaten var" };
      if (character.gold < 200) return { summaries: [], error: "200 altın gerek" };
      character.gold -= 200;
      game.kingdom = blankKingdom(command.name);
      return { summaries: [`Yerleşim: ${command.name}`] };
    }
    case "kingdom_upgrade": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!game.kingdom) return { summaries: [], error: "Yerleşim yok" };
      const gate = tierRequirement(game.kingdom, character.level);
      if (!gate) return { summaries: [], error: "Kademe dolu" };
      if (!gate.ok) return { summaries: [], error: gate.reason };
      game.kingdom.tier = gate.next;
      return { summaries: [`Kademe: ${TIERS[gate.next] ?? gate.next}`] };
    }
    case "kingdom_stat": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!game.kingdom) return { summaries: [], error: "Yerleşim yok" };
      const kingdom = game.kingdom;
      const before = kingdom[command.stat];
      if (command.stat === "treasury" || command.stat === "army") kingdom[command.stat] = Math.max(0, before + command.delta);
      else if (command.stat === "population") kingdom.population = Math.max(1, before + command.delta);
      else kingdom[command.stat] = clamp(before + command.delta, 0, 100);
      if (kingdom[command.stat] === before) return { summaries: [] };
      return { summaries: [`Yerleşim ${signed(kingdom[command.stat] - before)}`] };
    }
    case "building_add": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!game.kingdom) return { summaries: [], error: "Yerleşim yok" };
      if (game.kingdom.buildings.includes(command.name)) return { summaries: [], error: "Bu bina duruyor" };
      const def = BUILDINGS.find((building) => building.name === command.name);
      if (!def) return { summaries: [], error: "Bina yok" };
      if (game.kingdom.treasury < def.cost) return { summaries: [], error: "Hazine yetmiyor" };
      game.kingdom.treasury -= def.cost;
      game.kingdom.buildings.push(def.name);
      if (def.name === "Tapınak") {
        game.kingdom.people = clamp(game.kingdom.people + 5, 0, 100);
        game.kingdom.legitimacy = clamp(game.kingdom.legitimacy + 2, 0, 100);
      }
      if (def.name === "Hapishane") game.kingdom.stability = clamp(game.kingdom.stability + 5, 0, 100);
      return { summaries: [`Bina: ${def.name}`] };
    }
    case "advisor_set": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (!game.kingdom) return { summaries: [], error: "Yerleşim yok" };
      const known = ADVISOR_ROLES.some((advisor) => advisor.role === command.role);
      if (!known) return { summaries: [], error: "Rol yok" };
      const existing = game.kingdom.advisors.find((advisor) => advisor.role === command.role);
      if (existing) {
        existing.name = command.name;
        return { summaries: [`${command.role}: ${command.name}`] };
      }
      if (game.kingdom.advisors.length >= 7) return { summaries: [], error: "Danışman sırası dolu" };
      game.kingdom.advisors.push({ role: command.role, name: command.name, loyalty: 70 });
      return { summaries: [`Danışman: ${command.role}`] };
    }
    case "advisor_loyalty": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      const advisor = game.kingdom?.advisors.find((entry) => sameName(entry.role, command.who) || sameName(entry.name, command.who));
      if (!advisor) return { summaries: [], error: "Danışman yok" };
      const before = advisor.loyalty;
      advisor.loyalty = clamp(before + command.delta, 0, 100);
      if (advisor.loyalty === before) return { summaries: [] };
      return { summaries: [`${advisor.role} ${signed(advisor.loyalty - before)}`] };
    }
    case "companion_touch": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      let companion = game.companions.find((entry) => sameName(entry.name, command.name));
      if (!companion) {
        if (game.companions.length >= 3) return { summaries: [], error: "Yoldaş sırası dolu" };
        companion = { id: uid(), name: command.name, loyalty: clamp(50 + command.delta, 0, 100), note: command.note ?? "" };
        game.companions.push(companion);
        return { summaries: [`Yoldaş: ${companion.name}`] };
      }
      const before = companion.loyalty;
      companion.loyalty = clamp(before + command.delta, 0, 100);
      if (command.note) companion.note = command.note;
      if (companion.loyalty === before) return { summaries: command.note ? [`${companion.name}`] : [] };
      return { summaries: [`${companion.name} ${signed(companion.loyalty - before)}`] };
    }
    case "bond": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      const npc = game.npcs.find((entry) => sameName(entry.name, command.name));
      if (!npc) return { summaries: [], error: "Bu kişi henüz yok" };
      const before = npc.bond ?? 0;
      npc.bond = clamp(before + command.delta, 0, 100);
      if (npc.bond === before) return { summaries: [] };
      return { summaries: [`Bağ ${npc.name} ${signed(npc.bond - before)}`] };
    }
    case "weather_set": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (game.weather === command.name) return { summaries: [] };
      game.weather = command.name;
      return { summaries: [`Hava: ${command.name}`] };
    }
    case "fatigue": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      const before = character.fatigue;
      character.fatigue = clamp(before + command.delta, 0, 5);
      if (character.fatigue === before) return { summaries: [] };
      return { summaries: [`Yorgunluk ${signed(character.fatigue - before)}`] };
    }
    case "home_set": {
      const blocked = veyraOnly(game);
      if (blocked) return { summaries: [], error: blocked };
      if (command.tier !== character.homeTier + 1) return { summaries: [], error: "Konut bir kademe yükselir" };
      const cost = HOME_COST[command.tier] ?? 0;
      if (character.gold < cost) return { summaries: [], error: `${cost} altın gerek` };
      character.gold -= cost;
      character.homeTier = command.tier;
      return { summaries: [`Konut yükseldi`] };
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
