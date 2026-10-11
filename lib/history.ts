import { now } from "./ids";
import type { Game, HistoryEntry, Snapshot } from "./types";

export function takeSnap(game: Game): Snapshot {
  const character = structuredClone(game.character);
  delete character.portraitDataUrl;
  return {
    character,
    inventory: structuredClone(game.inventory),
    quests: structuredClone(game.quests),
    npcs: structuredClone(game.npcs),
    location: game.location,
    worldTime: game.worldTime,
    journal: structuredClone(game.journal),
    events: structuredClone(game.events),
    summary: game.summary,
  };
}

export function pushHistory(game: Game, label: string, messageCount: number): Game {
  const entry: HistoryEntry = { label, messageCount, snap: takeSnap(game) };
  return { ...game, history: [entry, ...game.history].slice(0, 25) };
}

export function undoGame(game: Game): Game | null {
  const [entry, ...rest] = game.history;
  if (!entry) return null;
  const portrait = game.character.portraitDataUrl;
  return {
    ...game,
    character: { ...structuredClone(entry.snap.character), portraitDataUrl: portrait },
    inventory: structuredClone(entry.snap.inventory),
    quests: structuredClone(entry.snap.quests),
    npcs: structuredClone(entry.snap.npcs),
    location: entry.snap.location,
    worldTime: entry.snap.worldTime,
    journal: structuredClone(entry.snap.journal),
    events: structuredClone(entry.snap.events),
    summary: entry.snap.summary,
    messages: game.messages.slice(0, entry.messageCount),
    history: rest,
    updatedAt: now(),
  };
}
