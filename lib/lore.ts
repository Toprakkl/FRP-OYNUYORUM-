import { tokens } from "./format";
import type { Game, LoreEntry } from "./types";

export type LoreSlice = {
  title: string;
  kind: LoreEntry["kind"];
  visibility: LoreEntry["visibility"];
  content: string;
};

function score(entry: LoreEntry, words: string[]): number {
  if (!words.length) return 0;
  const hay = tokens(`${entry.title} ${entry.tags.join(" ")} ${entry.content.slice(0, 400)}`);
  let total = 0;
  for (const word of words) if (hay.includes(word)) total += 1;
  return total;
}

export function selectLore(game: Game, message: string, limit = 6): LoreSlice[] {
  const always = game.lore.filter((entry) => entry.alwaysInclude);
  const words = tokens(
    `${message} ${game.location} ${game.quests
      .filter((quest) => quest.status === "active")
      .map((quest) => quest.title)
      .join(" ")}`,
  );
  const ranked = game.lore
    .filter((entry) => !entry.alwaysInclude)
    .map((entry) => ({ entry, score: score(entry, words) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.entry);
  return [...always, ...ranked].map((entry) => ({
    title: entry.title,
    kind: entry.kind,
    visibility: entry.visibility,
    content: entry.content.slice(0, 900),
  }));
}
