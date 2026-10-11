"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyCommands, computeAc } from "@/lib/applyCommands";
import { getPack } from "@/lib/campaigns";
import { sanitizeCommand, type Command } from "@/lib/commands";
import { createGame, type NewGameInput } from "@/lib/createGame";
import { takeSnap, undoGame } from "@/lib/history";
import { now, uid } from "@/lib/ids";
import { slug } from "@/lib/format";
import { DEFAULT_PREFS, PREFS_KEY, SAVE_KEY, coerceGame, stripForApi, type Prefs } from "@/lib/storage";
import type { Character, ChatMessage, DiceResolved, Game, GameSettings, LoreEntry, StatKey } from "@/lib/types";
import { HomeScreen } from "./HomeScreen";
import { Table } from "./Table";
import { Wizard } from "./Wizard";

type Screen = "home" | "new" | "play";
type SaveFile = { version: 1; games: Game[]; activeId: string | null };
type TurnPayload = {
  narrative: string;
  commands?: unknown[];
  rejected?: string[];
  dice?: DiceResolved | null;
  warning?: string;
};

type Api = {
  screen: Screen;
  games: Game[];
  game: Game | null;
  prefs: Prefs;
  busy: boolean;
  error: string | null;
  storageError: string | null;
  serverKey: boolean;
  setScreen: (screen: Screen) => void;
  setPreviewTheme: (theme: Game["settings"]["theme"]) => void;
  create: (input: NewGameInput) => void;
  open: (id: string) => void;
  remove: (id: string) => void;
  branch: (id: string) => void;
  exportGame: (id: string) => void;
  importGame: (file: File) => Promise<void>;
  setPrefs: (partial: Partial<Prefs>) => void;
  send: (message: string, dice: { natural: number; stat: StatKey | null } | null) => Promise<boolean>;
  commands: (list: Command[], label: string) => void;
  patchMeta: (partial: Partial<Character>) => void;
  setSettings: (partial: Partial<GameSettings>) => void;
  setTitle: (title: string) => void;
  undo: () => void;
  addLore: (entry: Omit<LoreEntry, "id">) => void;
  updateLore: (id: string, partial: Partial<LoreEntry>) => void;
  deleteLore: (id: string) => void;
  deleteQuest: (id: string) => void;
  setObjective: (questId: string, index: number, done: boolean) => void;
  clearError: () => void;
};

const GameContext = createContext<Api | null>(null);

export function useGame(): Api {
  const value = useContext(GameContext);
  if (!value) throw new Error("Masa hazır değil");
  return value;
}

const emptySave = (): SaveFile => ({ version: 1, games: [], activeId: null });

export function GameApp() {
  const [booted, setBooted] = useState(false);
  const [save, setSave] = useState<SaveFile>(emptySave);
  const [screen, setScreen] = useState<Screen>("home");
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [serverKey, setServerKey] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<Game["settings"]["theme"]>("orta_cag");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { games?: unknown[]; activeId?: string | null };
        const games = (parsed.games ?? []).map(coerceGame).filter((game): game is Game => Boolean(game));
        const activeId = games.some((game) => game.id === parsed.activeId) ? parsed.activeId ?? null : null;
        setSave({ version: 1, games, activeId });
        if (activeId) setScreen("play");
      }
      const prefRaw = localStorage.getItem(PREFS_KEY);
      if (prefRaw) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(prefRaw) });
    } catch {
      setStorageError("Eski kayıt okunamadı. Yeni bir macera açabilirsin.");
    }
    setBooted(true);
    void fetch("/api/ping", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then((response) => response.json())
      .then((data: { hasEnvKey?: boolean }) => setServerKey(Boolean(data.hasEnvKey)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!booted) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      setStorageError(null);
    } catch {
      setStorageError("Kayıt sığmadı. Portreyi kaldır veya eski bir macerayı sil.");
    }
  }, [save, booted]);

  useEffect(() => {
    if (!booted) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs, booted]);

  const game = save.games.find((entry) => entry.id === save.activeId) ?? null;
  const theme = screen === "play" && game ? game.settings.theme : previewTheme;

  function updateActive(fn: (current: Game) => Game) {
    setSave((prev) => {
      if (!prev.activeId) return prev;
      return { ...prev, games: prev.games.map((entry) => (entry.id === prev.activeId ? fn(entry) : entry)) };
    });
  }

  const api = useMemo<Api>(() => {
    const setPrefs = (partial: Partial<Prefs>) => setPrefsState((prev) => ({ ...prev, ...partial }));

    return {
      screen,
      games: save.games,
      game,
      prefs,
      busy,
      error,
      storageError,
      serverKey,
      setScreen,
      setPreviewTheme,
      clearError: () => setError(null),
      create: (input) => {
        const created = createGame(input);
        setSave((prev) => ({ version: 1, activeId: created.id, games: [created, ...prev.games] }));
        setScreen("play");
      },
      open: (id) => {
        setSave((prev) => ({ ...prev, activeId: id }));
        setScreen("play");
      },
      remove: (id) => {
        if (!window.confirm("Bu macera silinsin mi? Yedeğin yoksa geri gelmez.")) return;
        setSave((prev) => ({
          ...prev,
          games: prev.games.filter((entry) => entry.id !== id),
          activeId: prev.activeId === id ? null : prev.activeId,
        }));
        if (save.activeId === id) setScreen("home");
      },
      branch: (id) => {
        const found = save.games.find((entry) => entry.id === id);
        if (!found) return;
        const copy = structuredClone(found);
        copy.id = uid();
        copy.title = `${found.title} (dal)`;
        copy.history = [];
        copy.updatedAt = now();
        setSave((prev) => ({ ...prev, activeId: copy.id, games: [copy, ...prev.games] }));
        setScreen("play");
      },
      exportGame: (id) => {
        const found = save.games.find((entry) => entry.id === id);
        if (!found) return;
        const copy = structuredClone(found);
        copy.history = [];
        const blob = new Blob([JSON.stringify({ version: 1, game: copy }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slug(found.title)}.frp.json`;
        link.click();
        URL.revokeObjectURL(url);
      },
        importGame: async (file) => {
        try {
          const parsed = JSON.parse(await file.text()) as { game?: unknown };
          const coerced = coerceGame(parsed.game ?? parsed);
          if (!coerced) throw new Error("Bu dosya bir FRP kaydı değil");
          coerced.id = uid();
          coerced.updatedAt = now();
          setSave((prev) => ({ version: 1, activeId: coerced.id, games: [coerced, ...prev.games] }));
          setScreen("play");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Dosya okunamadı");
        }
      },
      setPrefs,
      send: async (message, dice) => {
        const text = message.trim();
        const current = save.games.find((entry) => entry.id === save.activeId);
        if (!text || !current || busy) return false;
        if (!current.character.isAlive) {
          setError("Karakter ölü. Karakter sayfasından diriltmeden devam edemez.");
          return false;
        }
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/turn", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              game: stripForApi(current),
              message: text,
              dice,
              apiKey: prefs.apiKey,
              model: prefs.model,
              narrator: prefs.narrator,
            }),
          });
          const data = (await response.json()) as TurnPayload & { error?: string };
          if (!response.ok) throw new Error(data.error || "Tur başarısız");
          const id = current.id;
          setSave((prev) => ({
            ...prev,
            games: prev.games.map((entry) => (entry.id === id ? commitTurn(entry, text, data) : entry)),
          }));
          const playerCount = current.messages.filter((entry) => entry.role === "player").length + 1;
          if (prefs.narrator === "gemini" && (prefs.apiKey || serverKey) && playerCount - current.summarizedMessageCount >= 8) {
            const recent = [...current.messages.slice(-12).map((entry) => `${entry.role}: ${entry.content}`), `player: ${text}`].join("\n");
            void fetch("/api/summarize", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ summary: current.summary, recent, apiKey: prefs.apiKey, model: prefs.model }),
            })
              .then((response) => (response.ok ? response.json() : null))
              .then((payload: { summary?: string } | null) => {
                if (!payload?.summary) return;
                setSave((prev) => ({
                  ...prev,
                  games: prev.games.map((entry) =>
                    entry.id === id
                      ? { ...entry, summary: payload.summary ?? entry.summary, summarizedMessageCount: entry.messages.filter((message) => message.role === "player").length }
                      : entry,
                  ),
                }));
              })
              .catch(() => undefined);
          }
          return true;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Tur başarısız");
          return false;
        } finally {
          setBusy(false);
        }
      },
      commands: (list, label) => {
        updateActive((current) => {
          const accepted: Command[] = [];
          const rejected: string[] = [];
          for (const command of list) {
            const result = sanitizeCommand(command, "manual", current.settings);
            if (result.ok) accepted.push(result.command);
            else rejected.push(result.reason);
          }
          const snap = takeSnap(current);
          const applied = applyCommands(current, accepted, "manual");
          const next = applied.game;
          if (applied.summaries.length) {
            next.history = [{ label, messageCount: current.messages.length, snap }, ...current.history].slice(0, 25);
          }
          if (rejected.length) {
            next.messages = [...next.messages, systemMessage(rejected.join(" · "))];
          }
          return next;
        });
      },
      patchMeta: (partial) => updateActive((current) => ({ ...current, character: { ...current.character, ...partial }, updatedAt: now() })),
      setSettings: (partial) => {
        updateActive((current) => {
          const settings = { ...current.settings, ...partial };
          if (partial.genre && partial.genre !== current.settings.genre) {
            const pack = getPack(partial.genre);
            if (partial.theme === undefined) settings.theme = pack.theme;
            if (partial.currency === undefined) settings.currency = pack.currency;
          }
          const inventory = settings.magic ? current.inventory : current.inventory.map((item) => (item.magical ? { ...item, equippedSlot: null } : item));
          const character = { ...current.character, ac: computeAc({ ...current.character }, inventory) };
          return { ...current, settings, inventory, character, updatedAt: now() };
        });
      },
      setTitle: (title) => updateActive((current) => ({ ...current, title: title.slice(0, 80), updatedAt: now() })),
      undo: () => updateActive((current) => undoGame(current) ?? current),
      addLore: (entry) => updateActive((current) => ({ ...current, lore: [{ ...entry, id: uid() }, ...current.lore], updatedAt: now() })),
      updateLore: (id, partial) => updateActive((current) => ({
        ...current,
        lore: current.lore.map((entry) => (entry.id === id ? { ...entry, ...partial } : entry)),
        updatedAt: now(),
      })),
      deleteLore: (id) => updateActive((current) => ({ ...current, lore: current.lore.filter((entry) => entry.id !== id), updatedAt: now() })),
      deleteQuest: (id) => updateActive((current) => ({ ...current, quests: current.quests.filter((entry) => entry.id !== id), updatedAt: now() })),
      setObjective: (questId, index, done) => updateActive((current) => ({
        ...current,
        quests: current.quests.map((quest) => {
          if (quest.id !== questId) return quest;
          const objectives = quest.objectives.map((objective, i) => (i === index ? { ...objective, done } : objective));
          let status = quest.status;
          if (objectives.length && objectives.every((objective) => objective.done)) status = "completed";
          else if (quest.status === "completed" && !done) status = "active";
          return { ...quest, objectives, status };
        }),
        updatedAt: now(),
      })),
    };
  }, [screen, save, game, prefs, busy, error, storageError, serverKey]);

  if (!booted) {
    return (
      <div className="frame" data-theme="orta_cag">
        <div className="boot">
          <Crest />
          <h1>FRP Masası</h1>
        </div>
      </div>
    );
  }

  return (
    <GameContext.Provider value={api}>
      <div className="frame" data-theme={theme}>
        {storageError ? <div className="toast">{storageError}</div> : null}
        {screen === "new" ? <Wizard /> : screen === "play" && game ? <Table /> : <HomeScreen />}
      </div>
    </GameContext.Provider>
  );
}

function commitTurn(current: Game, text: string, data: TurnPayload): Game {
  const accepted: Command[] = [];
  const rejected = [...(data.rejected ?? [])];
  for (const command of data.commands ?? []) {
    const result = sanitizeCommand(command, "ai", current.settings);
    if (result.ok) accepted.push(result.command);
    else rejected.push(result.reason);
  }
  const snap = takeSnap(current);
  const applied = applyCommands(current, accepted, "ai");
  const stamped = now();
  const messages: ChatMessage[] = [
    ...current.messages,
    { id: uid(), role: "player", content: text, dice: data.dice, createdAt: stamped },
    { id: uid(), role: "ai", content: data.narrative, effects: applied.summaries, createdAt: stamped },
  ];
  if (data.warning) messages.push({ id: uid(), role: "system", content: data.warning, createdAt: stamped });
  if (rejected.length) messages.push({ id: uid(), role: "system", content: `Uygulanmadı: ${rejected.join(" · ")}`, createdAt: stamped });
  const next = applied.game;
  next.messages = messages.slice(-400);
  next.history = [{ label: "Tur", messageCount: current.messages.length, snap }, ...current.history].slice(0, 25);
  next.updatedAt = stamped;
  return next;
}

function systemMessage(content: string): ChatMessage {
  return { id: uid(), role: "system", content, createdAt: now() };
}

export function Crest() {
  return (
    <svg className="crest" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 4 56 18v24L32 56 8 42V18L32 4Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M32 4v52M8 18l24 14 24-14M8 42l24-10 24 10" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
