"use client";

import { useEffect, useRef, useState } from "react";
import { formatDice, modifier, rollD20 } from "@/lib/dice";
import { formatWorldTime, xpThreshold } from "@/lib/format";
import { STAT_KEYS, STAT_SHORT, type StatKey, type TabId } from "@/lib/types";
import { useGame } from "./GameApp";
import { Panel } from "./Panels";
import { playDiceSound } from "./sound";

const TABS: { id: TabId; label: string }[] = [
  { id: "character", label: "Karakter" },
  { id: "inventory", label: "Envanter" },
  { id: "quests", label: "Görevler" },
  { id: "world", label: "Dünya" },
  { id: "log", label: "Günlük" },
  { id: "settings", label: "Ayarlar" },
];

export function Table() {
  const { game, send, busy, error, clearError, setScreen, prefs, commands } = useGame();
  const [tab, setTab] = useState<TabId | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [draft, setDraft] = useState("");
  const [stat, setStat] = useState<StatKey | "">("");
  const [face, setFace] = useState<number | null>(null);
  const [spin, setSpin] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const committed = useRef<number | null>(null);
  const rollToken = useRef(0);
  const submitting = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 960px)");
    const apply = () => setDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (stick.current) feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [game?.messages.length, busy]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTab(null);
    };
    const onCompose = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text === "string") setDraft((prev) => (prev ? `${prev} ${text}` : text));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("frp-compose", onCompose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("frp-compose", onCompose);
    };
  }, []);

  if (!game) return null;
  const character = game.character;
  const hpPct = Math.round((character.hp / Math.max(1, character.maxHp)) * 100);
  const xpPct = Math.round((character.xp / xpThreshold(character.level)) * 100);
  const manaPct = character.maxMana ? Math.round((character.mana / character.maxMana) * 100) : 0;
  const shown = tab ?? (desktop ? "character" : null);
  const mod = stat ? modifier(character.stats[stat]) : 0;
  const shownFace = spin ?? face;

  function clearRoll() {
    rollToken.current += 1;
    committed.current = null;
    setFace(null);
    setSpin(null);
    setRolling(false);
  }

  async function roll() {
    if (rolling || busy) return;
    const token = ++rollToken.current;
    setRolling(true);
    committed.current = null;
    setFace(null);
    const final = rollD20();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      for (let i = 0; i < 8; i += 1) {
        if (rollToken.current !== token) return;
        setSpin(rollD20());
        await wait(45 + i * 18);
      }
    }
    if (rollToken.current !== token) return;
    setSpin(null);
    committed.current = final;
    setFace(final);
    setRolling(false);
    if (prefs.sound) playDiceSound(final);
    if (final === 1 || final === 20) navigator.vibrate?.(final === 20 ? [24, 40, 24] : 30);
  }

  async function submit() {
    const text = draft.trim();
    if (!text || busy || submitting.current) return;
    submitting.current = true;
    try {
      if (rolling) {
        const token = rollToken.current;
        while (rollToken.current === token && committed.current === null) await wait(40);
        if (rollToken.current !== token || committed.current === null) return;
      }
      const natural = committed.current;
      const dice = natural ? { natural, stat: stat || null } : null;
      const ok = await send(text, dice);
      if (ok) {
        setDraft("");
        clearRoll();
      }
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="table">
      <header className="hud">
        <div className="who">
          <div className="portrait">
            {character.portraitDataUrl ? <img src={character.portraitDataUrl} alt="" /> : initials(character.name)}
          </div>
          <div>
            <h2>{character.name}</h2>
            <div className="meta">{character.className} · Sv {character.level} · {game.location}</div>
          </div>
        </div>
        <div className="bars">
          <div className="bar" aria-label={`Can ${character.hp} / ${character.maxHp}`}>
            <span className="fill fill-hp" data-low={hpPct < 35} style={{ width: `${hpPct}%` }} />
          </div>
          <div className="bar" aria-label={`Deneyim ${character.xp}`}>
            <span className="fill fill-xp" style={{ width: `${Math.min(100, xpPct)}%` }} />
          </div>
          {game.settings.magic && character.maxMana > 0 ? (
            <div className="bar" aria-label={`Mana ${character.mana}`}>
              <span className="fill fill-mana" style={{ width: `${manaPct}%` }} />
            </div>
          ) : null}
        </div>
        <div className="hud-meta">
          <span>Can {character.hp}/{character.maxHp}{game.settings.magic && character.maxMana > 0 ? ` · Mana ${character.mana}/${character.maxMana}` : ""}</span>
          <span>{character.gold} {game.settings.currency}</span>
        </div>
        <div className="hud-meta">
          <span>XP {character.xp}/{xpThreshold(character.level)} · Zırh {character.ac}</span>
          <span>{formatWorldTime(game.worldTime)}</span>
        </div>
        <div className="meta">{STAT_KEYS.map((key) => `${STAT_SHORT[key]} ${character.stats[key]}`).join(" · ")}</div>
        {character.conditions.length ? (
          <div className="conds">
            {character.conditions.map((condition) => (
              <button key={condition} onClick={() => commands([{ type: "condition_remove", name: condition }], "Durum")}>{condition} ×</button>
            ))}
          </div>
        ) : null}
        <div className="tabs">
          {TABS.map((entry) => (
            <button key={entry.id} className={`tab ${shown === entry.id ? "on" : ""}`} onClick={() => setTab((current) => (!desktop && current === entry.id ? null : entry.id))}>
              {entry.label}
            </button>
          ))}
          <button className="tab" onClick={() => setScreen("home")}>Masalar</button>
        </div>
      </header>
      {error ? <div className="toast">{error} <button onClick={clearError}>Kapat</button></div> : null}
      {!character.isAlive ? (
        <div className="banner dead-banner">
          Öldün. Diriltirsen macera sürer.
          <button onClick={() => commands([{ type: "set_alive", value: true }, { type: "set_hp", value: Math.max(1, Math.ceil(character.maxHp * 0.3)) }], "Diriltme")}>Son nefesi geri ver</button>
        </div>
      ) : null}
      <div className="story">
        <div className="feed" ref={feedRef} data-testid="story">
          {game.messages.map((message) => (
            <article key={message.id} className={`bubble bubble-${message.role}`}>
              {message.role !== "system" ? <span className="kicker">{message.role === "ai" ? "Oyun yöneticisi" : character.name}</span> : null}
              {message.content}
              {message.dice ? <div className="dice-line">{formatDice(message.dice)}</div> : null}
              {message.effects?.length ? <div className="effects">{message.effects.map((effect) => <span key={effect}>{effect}</span>)}</div> : null}
            </article>
          ))}
          {busy ? <p className="thinking">Oyun yöneticisi yazıyor…</p> : null}
        </div>
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="composer-tools">
          <label className="field" style={{ width: "auto" }}>
            Zar statı
            <select value={stat} onChange={(event) => setStat(event.target.value as StatKey | "")} aria-label="Zar statı">
              <option value="">GM yorumlasın</option>
              {STAT_KEYS.map((key) => <option key={key} value={key}>{STAT_SHORT[key]} {modifier(character.stats[key]) >= 0 ? "+" : ""}{modifier(character.stats[key])}</option>)}
            </select>
          </label>
          {shownFace ? <span className="pending">d20 {shownFace}{!spin && stat ? ` ${mod >= 0 ? "+" : ""}${mod} = ${shownFace + mod}` : ""} <button type="button" onClick={clearRoll}>sil</button></span> : <span className="faint">Riskliyse zar at.</span>}
        </div>
        <button
          type="button"
          className={`dice ${rolling ? "dice-rolling" : ""} ${!spin && face === 20 ? "dice-crit" : ""} ${!spin && face === 1 ? "dice-fail" : ""}`}
          data-testid="dice"
          onClick={() => void roll()}
          disabled={busy}
          aria-label="d20 at"
        >
          {shownFace ?? "d20"}
        </button>
        <textarea
          data-testid="composer"
          value={draft}
          placeholder="Ne yapıyorsun?"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <button className="primary send" data-testid="send" disabled={busy || !draft.trim()}>Gönder</button>
      </form>
      <aside className={`panel ${shown ? "open" : ""}`}>
        {shown ? <Panel tab={shown} onClose={() => setTab(null)} desktop={desktop} /> : null}
      </aside>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("tr") ?? "").join("");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
