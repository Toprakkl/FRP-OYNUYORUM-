"use client";

import { useMemo, useState } from "react";
import { getPack, PACKS } from "@/lib/campaigns";
import { modifier, roll4d6DropLowest } from "@/lib/dice";
import { STAT_KEYS, STAT_SHORT, type GenreId, type Stats } from "@/lib/types";
import { useGame } from "./GameApp";

export function Wizard() {
  const { create, setScreen, setPreviewTheme } = useGame();
  const [step, setStep] = useState(0);
  const [genre, setGenre] = useState<GenreId>("orta_cag");
  const pack = getPack(genre);
  const [classId, setClassId] = useState(pack.classes[0].id);
  const preset = pack.classes.find((entry) => entry.id === classId) ?? pack.classes[0];
  const [name, setName] = useState("");
  const [race, setRace] = useState(pack.raceSuggestions[0] ?? "");
  const [age, setAge] = useState(30);
  const [concept, setConcept] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [stats, setStats] = useState<Stats>({ ...preset.stats });
  const [difficulty, setDifficulty] = useState<"kolay" | "normal" | "sert">("normal");
  const [magic, setMagic] = useState(pack.magicDefault);
  const [tone, setTone] = useState<"kisa" | "normal" | "detayli">("normal");

  const hp = useMemo(() => Math.max(8, preset.hp + modifier(stats.con) - modifier(preset.stats.con)), [preset, stats.con]);
  const mana = magic ? Math.max(0, preset.mana) : 0;

  function chooseGenre(next: GenreId) {
    const chosen = getPack(next);
    setGenre(next);
    setClassId(chosen.classes[0].id);
    setStats({ ...chosen.classes[0].stats });
    setMagic(chosen.magicDefault);
    setRace(chosen.raceSuggestions[0] ?? "");
    setPreviewTheme(chosen.theme);
  }

  function chooseClass(id: string) {
    const chosen = pack.classes.find((entry) => entry.id === id) ?? pack.classes[0];
    setClassId(chosen.id);
    setStats({ ...chosen.stats });
  }

  return (
    <div className="wizard">
      <p className="steps">Adım {step + 1} / 3</p>
      <h1>{step === 0 ? "Dünya" : step === 1 ? "Kimlik" : "Masa"}</h1>
      {step === 0 ? (
        <div className="genre-grid">
          {PACKS.map((entry) => (
            <button key={entry.id} className={`genre ${genre === entry.id ? "on" : ""}`} onClick={() => chooseGenre(entry.id)}>
              <strong>{entry.title}</strong>
              <span className="meta"> {entry.pitch}</span>
            </button>
          ))}
        </div>
      ) : null}
      {step === 1 ? (
        <div className="stack">
          {genre === "ozel" ? (
            <label className="field">
              Dünya
              <input value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} placeholder="1920'ler İstanbul'unda okült dedektiflik" />
            </label>
          ) : null}
          <label className="field">
            Ad
            <input data-testid="hero-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aria" autoFocus />
          </label>
          <div className="chips">
            {pack.classes.map((entry) => (
              <button key={entry.id} className={`chip ${classId === entry.id ? "on" : ""}`} onClick={() => chooseClass(entry.id)}>
                {entry.name}
              </button>
            ))}
          </div>
          <p className="meta">{preset.blurb}</p>
          <label className="field">
            Köken
            <input value={race} onChange={(event) => setRace(event.target.value)} list="races" />
            <datalist id="races">
              {pack.raceSuggestions.map((entry) => <option key={entry} value={entry} />)}
            </datalist>
          </label>
          <label className="field">
            Yaş
            <input type="number" min={1} max={120} value={age} onChange={(event) => setAge(Number(event.target.value))} />
          </label>
          <label className="field">
            Tek cümlelik geçmiş
            <textarea value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="Eski bir muhafız. Şehri terk etmişti, mektup onu geri çağırdı." />
          </label>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="stack">
          <div className="row">
            <button className="ghost" onClick={() => {
              const rolled = {} as Stats;
              for (const key of STAT_KEYS) rolled[key] = roll4d6DropLowest();
              setStats(rolled);
            }}>4d6 at</button>
            <span className="meta">Can {hp}{magic && mana ? ` · Mana ${mana}` : ""} · {preset.gold} {pack.currency}</span>
          </div>
          <div className="abilities">
            {STAT_KEYS.map((key) => {
              const score = stats[key];
              const mod = modifier(score);
              return (
                <label key={key} className="ability">
                  <span className="ability-mod">{mod >= 0 ? `+${mod}` : mod}</span>
                  <input
                    className="ability-score"
                    type="number"
                    min={3}
                    max={18}
                    aria-label={STAT_SHORT[key]}
                    value={score}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) setStats((prev) => ({ ...prev, [key]: next }));
                    }}
                  />
                  <span className="ability-name">{STAT_SHORT[key]}</span>
                </label>
              );
            })}
          </div>
          <div className="chips">
            {(["kolay", "normal", "sert"] as const).map((entry) => (
              <button key={entry} className={`chip ${difficulty === entry ? "on" : ""}`} onClick={() => setDifficulty(entry)}>
                {entry === "kolay" ? "Kolay" : entry === "sert" ? "Sert" : "Normal"}
              </button>
            ))}
          </div>
          <p className="faint">Kolayda ölüm yok. Normalde bayılırsın. Sertte ölüm kalabilir.</p>
          <div className="chips">
            <button className={`chip ${magic ? "on" : ""}`} onClick={() => setMagic((value) => !value)}>{magic ? "Büyü açık" : "Büyü kapalı"}</button>
            {(["kisa", "normal", "detayli"] as const).map((entry) => (
              <button key={entry} className={`chip ${tone === entry ? "on" : ""}`} onClick={() => setTone(entry)}>
                {entry === "kisa" ? "Kısa anlatım" : entry === "detayli" ? "Ayrıntılı" : "Normal anlatım"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost" onClick={() => (step === 0 ? setScreen("home") : setStep((value) => value - 1))}>Geri</button>
        {step < 2 ? (
          <button className="primary" onClick={() => setStep((value) => value + 1)}>İleri</button>
        ) : (
          <button
            className="primary"
            data-testid="start-game"
            disabled={!name.trim()}
            onClick={() => create({
              genre,
              customGenre,
              theme: pack.theme,
              classId,
              name,
              race,
              age,
              concept,
              difficulty,
              magic,
              tone,
              stats,
            })}
          >
            Masaya otur
          </button>
        )}
      </div>
    </div>
  );
}
