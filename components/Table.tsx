"use client";

import { useEffect, useRef, useState } from "react";
import { formatDice, modifier, rollD20 } from "@/lib/dice";
import { formatWorldTime, xpThreshold } from "@/lib/format";
import { seasonOf } from "@/lib/veyraLife";
import { STAT_KEYS, STAT_LABEL, STAT_SHORT, type DiceResolved, type TabId } from "@/lib/types";
import { useGame } from "./GameApp";
import { Panel } from "./Panels";
import { playDiceSound } from "./sound";

const TABS: { id: TabId; label: string; mark: string }[] = [
  { id: "character", label: "Karakter", mark: "◆" },
  { id: "inventory", label: "Envanter", mark: "▣" },
  { id: "quests", label: "Görevler", mark: "⚑" },
  { id: "world", label: "Dünya", mark: "◎" },
];

export function Table() {
  const { game, send, busy, error, clearError, setScreen, prefs, commands } = useGame();
  const [tab, setTab] = useState<TabId | null>(null);
  const [more, setMore] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState<DiceResolved | null>(null);
  const [face, setFace] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
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

  async function submit() {
    const text = draft.trim();
    if (!text || busy || reveal || submitting.current) return;
    submitting.current = true;
    setDraft("");
    try {
      const result = await send(text);
      if (!result.ok) {
        setDraft(text);
        return;
      }
      if (result.dice) await play(result.dice);
    } finally {
      submitting.current = false;
    }
  }

  async function play(dice: DiceResolved) {
    setReveal(dice);
    setLanded(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      for (let i = 0; i < 10; i += 1) {
        setFace(rollD20());
        await wait(55 + i * 12);
      }
    }
    setFace(dice.natural);
    setLanded(true);
    if (prefs.sound) playDiceSound(dice.natural);
    if (dice.natural === 1 || dice.natural === 20) navigator.vibrate?.(dice.natural === 20 ? [24, 40, 24] : 30);
    await wait(reduce ? 500 : 1400);
    setReveal(null);
    setFace(null);
    setLanded(false);
  }

  const shownFace = face ?? reveal?.natural ?? null;
  const mark = reveal ? rollMark(reveal) : "";

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
          <div className="hp-orb" aria-label={`Can ${character.hp} / ${character.maxHp}`}>
            <strong>{character.hp}</strong>
            <small>/{character.maxHp}</small>
          </div>
        </div>
        <div className="bars">
          <div className="bar" aria-hidden="true">
            <span className="fill fill-hp" data-low={hpPct < 35} style={{ width: `${hpPct}%` }} />
          </div>
          <div className="bar" aria-label={`Deneyim ${character.xp}`}>
            <span className="fill fill-xp" style={{ width: `${Math.min(100, xpPct)}%` }} />
          </div>
          {game.settings.magic && character.maxMana > 0 ? (
            <div className="bar" aria-label={`${game.settings.genre === "veyra" ? "Öz" : "Mana"} ${character.mana}`}>
              <span className="fill fill-mana" style={{ width: `${manaPct}%` }} />
            </div>
          ) : null}
        </div>
        <div className="hud-meta">
          <span>Can {character.hp}/{character.maxHp}{game.settings.magic && character.maxMana > 0 ? ` · ${game.settings.genre === "veyra" ? "Öz" : "Mana"} ${character.mana}/${character.maxMana}` : ""} · Zırh {character.ac}</span>
          <span>{character.gold} {game.settings.currency}{game.settings.genre === "veyra" ? ` · Onur ${character.honor}` : ""}</span>
        </div>
        <div className="hud-meta">
          <span>XP {character.xp}/{xpThreshold(character.level)}</span>
          <span>{game.settings.genre === "veyra" ? `YT ${seasonOf(game.worldTime).year} · ${seasonOf(game.worldTime).season} · ${formatWorldTime(game.worldTime)}` : formatWorldTime(game.worldTime)}</span>
        </div>
        <div className="ability-row">
          {STAT_KEYS.map((key) => {
            const mod = modifier(character.stats[key]);
            return (
              <div key={key} className="ability-mini" title={`${STAT_LABEL[key]} ${character.stats[key]}`}>
                <b>{mod >= 0 ? `+${mod}` : mod}</b>
                <small>{STAT_SHORT[key]}</small>
              </div>
            );
          })}
        </div>
        {character.conditions.length ? (
          <div className="conds">
            {character.conditions.map((condition) => (
              <button key={condition} onClick={() => commands([{ type: "condition_remove", name: condition }], "Durum")}>{condition} ×</button>
            ))}
          </div>
        ) : null}
        <div className="tabs">
          {TABS.map((entry) => (
            <button key={entry.id} className={`tab menu-tab ${shown === entry.id ? "on" : ""}`} onClick={() => { setMore(false); setTab((current) => (!desktop && current === entry.id ? null : entry.id)); }}>
              <span aria-hidden="true">{entry.mark}</span>
              {entry.label}
            </button>
          ))}
          <button className={`tab menu-tab ${more ? "on" : ""}`} onClick={() => setMore((value) => !value)} aria-label="Diğer">⋯</button>
        </div>
        {more ? (
          <div className="more-menu">
            {game.settings.genre === "veyra" ? <button className="tab" onClick={() => { setMore(false); setTab("profession"); }}>Meslek</button> : null}
            {game.settings.genre === "veyra" ? <button className="tab" onClick={() => { setMore(false); setTab("kingdom"); }}>Krallık</button> : null}
            <button className="tab" onClick={() => { setMore(false); setTab("log"); }}>Günlük</button>
            <button className="tab" onClick={() => { setMore(false); setTab("settings"); }}>Ayarlar</button>
            <button className="tab" onClick={() => { setMore(false); setScreen("home"); }}>Masalar</button>
          </div>
        ) : null}
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
              {message.role !== "system" ? <span className="kicker">{message.role === "ai" ? (message.narrator === "yerel" ? "Yerel anlatıcı" : "Oyun yöneticisi") : character.name}</span> : null}
              {message.content}
              {message.dice ? <div className="dice-line">{formatDice(message.dice)}</div> : null}
              {message.effects?.length ? <div className="effects">{message.effects.map((effect) => <span key={effect}>{effect}</span>)}</div> : null}
            </article>
          ))}
          {busy ? <p className="thinking">Masa düşünüyor…</p> : null}
        </div>
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="composer-hint">Ne yaptığını yaz. Zar gerekiyorsa masa kendi atar.</p>
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
        <button className="primary send" data-testid="send" disabled={busy || Boolean(reveal) || !draft.trim()}>Gönder</button>
      </form>
      <aside className={`panel ${shown ? "open" : ""}`}>
        {shown ? <Panel tab={shown} onClose={() => setTab(null)} desktop={desktop} onJump={(next) => setTab(next)} /> : null}
      </aside>
      {reveal ? (
        <div className="theater" data-testid="theater">
          <div className={`die ${landed ? (mark === "Başarısız" || mark === "Fiyasko" ? "die-fail" : "die-success") : "die-spin"}`} data-testid="dice">
            {shownFace}
          </div>
          {landed ? (
            <>
              <p className="theater-mark">{mark}</p>
              <p className="theater-detail">{reveal.stat ? STAT_LABEL[reveal.stat] : "Zar"}{reveal.reason ? ` · ${reveal.reason}` : ""}</p>
              <p className="theater-detail">{`d20 ${reveal.natural} ${reveal.modifier >= 0 ? `+${reveal.modifier}` : reveal.modifier} = ${reveal.total} · DC ${reveal.dc}`}</p>
            </>
          ) : (
            <p className="theater-detail">Zar dönüyor</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function rollMark(dice: DiceResolved): string {
  if (dice.natural === 20) return "Kritik";
  if (dice.natural === 1) return "Fiyasko";
  return dice.total >= dice.dc ? "Başarılı" : "Başarısız";
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("tr") ?? "").join("");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
