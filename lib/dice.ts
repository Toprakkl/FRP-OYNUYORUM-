import type { Difficulty, DiceResolved, StatKey, Stats } from "./types";

export function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function suggestedDc(difficulty: Difficulty): number {
  if (difficulty === "kolay") return 11;
  if (difficulty === "sert") return 17;
  return 14;
}

export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % sides) + 1;
}

export function rollD20(): number {
  return rollDie(20);
}

export function roll4d6DropLowest(): number {
  const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

export function resolveDice(
  natural: number,
  stat: StatKey | null,
  stats: Stats,
  difficulty: Difficulty,
): DiceResolved {
  const safe = Math.min(20, Math.max(1, Math.round(natural)));
  const mod = stat ? modifier(stats[stat] ?? 10) : 0;
  return {
    natural: safe,
    stat,
    modifier: mod,
    total: safe + mod,
    dc: suggestedDc(difficulty),
  };
}

export function formatDice(dice: DiceResolved): string {
  const stat = dice.stat ? dice.stat.toUpperCase() : "zarsız stat";
  const bonus = dice.modifier >= 0 ? `+${dice.modifier}` : `${dice.modifier}`;
  const mark = dice.natural === 20 ? "kritik" : dice.natural === 1 ? "fiyasko" : dice.total >= dice.dc ? "başarır" : "yetmez";
  return `d20 ${dice.natural} ${bonus} = ${dice.total} · ${stat} · DC ${dice.dc} · ${mark}`;
}
