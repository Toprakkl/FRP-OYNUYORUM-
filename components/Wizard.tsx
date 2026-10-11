"use client";

import { useEffect, useMemo, useState } from "react";
import { getPack, PACKS } from "@/lib/campaigns";
import { modifier, roll4d6DropLowest } from "@/lib/dice";
import { STAT_KEYS, STAT_LABEL, STAT_SHORT, type GenreId, type StatKey, type Stats } from "@/lib/types";
import { applyRace, essenceMax, PATHS, pointCost, pointSpent, RACES, SKILLS, type VeyraRace } from "@/lib/veyra";
import { useGame } from "./GameApp";

const EIGHTS: Stats = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

export function Wizard() {
  const { create, setScreen, setPreviewTheme } = useGame();
  const [step, setStep] = useState(0);
  const [genre, setGenre] = useState<GenreId>("veyra");
  const pack = getPack(genre);
  const veyra = genre === "veyra";
  const [classId, setClassId] = useState(pack.classes[0].id);
  const preset = pack.classes.find((entry) => entry.id === classId) ?? pack.classes[0];
  const [name, setName] = useState("");
  const [race, setRace] = useState(pack.raceSuggestions[0] ?? "");
  const [age, setAge] = useState(24);
  const [concept, setConcept] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [stats, setStats] = useState<Stats>({ ...preset.stats });
  const [base, setBase] = useState<Stats>({ ...EIGHTS });
  const [boosts, setBoosts] = useState<StatKey[]>([]);
  const [bonusSkill, setBonusSkill] = useState("İkna");
  const [originId, setOriginId] = useState("lonca");
  const [difficulty, setDifficulty] = useState<"kolay" | "normal" | "sert">("normal");
  const [magic, setMagic] = useState(pack.magicDefault);
  const [tone, setTone] = useState<"kisa" | "normal" | "detayli">("normal");

  const pickedRace = RACES.find((entry) => entry.name === race);
  const path = PATHS.find((entry) => entry.id === classId) ?? PATHS[0];
  const finalStats = useMemo(() => (veyra ? applyRace(base, pickedRace, boosts) : stats), [veyra, base, pickedRace, boosts, stats]);
  const spent = pointSpent(base);
  const left = 27 - spent;
  const hp = useMemo(() => {
    if (veyra) return Math.max(1, path.die + modifier(finalStats.con));
    return Math.max(8, preset.hp + modifier(stats.con) - modifier(preset.stats.con));
  }, [veyra, path, finalStats.con, preset, stats.con]);
  const mana = veyra ? essenceMax(path, 1, finalStats, pickedRace) : magic ? Math.max(0, preset.mana) : 0;
  const humanReady = !veyra || pickedRace?.id !== "insan" || boosts.length === 2;
  const pointsReady = !veyra || left >= 0;

  useEffect(() => {
    setPreviewTheme(pack.theme);
  }, [pack.theme, setPreviewTheme]);

  function chooseGenre(next: GenreId) {
    const chosen = getPack(next);
    setGenre(next);
    setClassId(chosen.classes[0].id);
    setStats({ ...chosen.classes[0].stats });
    setBase({ ...EIGHTS });
    setBoosts([]);
    setMagic(chosen.id === "veyra" ? true : chosen.magicDefault);
    setRace(chosen.raceSuggestions[0] ?? "");
    setAge(chosen.id === "veyra" ? 24 : 30);
    setOriginId("lonca");
    setPreviewTheme(chosen.theme);
  }

  function chooseClass(id: string) {
    const chosen = pack.classes.find((entry) => entry.id === id) ?? pack.classes[0];
    setClassId(chosen.id);
    if (!veyra) setStats({ ...chosen.stats });
  }

  function chooseRace(next: VeyraRace) {
    setRace(next.name);
    setAge(next.age);
    if (next.id !== "insan") setBoosts([]);
  }

  function bump(key: StatKey, delta: number) {
    setBase((prev) => {
      const score = prev[key] + delta;
      if (score < 8 || score > 15) return prev;
      const draft = { ...prev, [key]: score };
      if (pointSpent(draft) > 27) return prev;
      return draft;
    });
  }

  function toggleBoost(key: StatKey) {
    setBoosts((prev) => {
      if (prev.includes(key)) return prev.filter((entry) => entry !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  }

  return (
    <div className="wizard">
      <p className="steps">Adım {step + 1} / 3</p>
      <h1>{step === 0 ? "Dünya" : step === 1 ? (veyra ? "Doğuş" : "Kimlik") : veyra ? "Özellik" : "Masa"}</h1>
      {step === 0 ? (
        <div className="genre-grid">
          {PACKS.map((entry) => (
            <button key={entry.id} className={`genre ${genre === entry.id ? "on" : ""}`} onClick={() => chooseGenre(entry.id)}>
              {entry.id === "veyra" ? <span className="kicker">Sabit dünya</span> : null}
              <strong>{entry.title}</strong>
              <span className="meta"> {entry.pitch}</span>
            </button>
          ))}
        </div>
      ) : null}
      {step === 1 && veyra ? (
        <div className="stack">
          <p className="meta">Başlangıç YT 1247'de kilitli. Gizemler yerinde kalır.</p>
          <div className="origin-grid">
            {[
              ["lonca", "Serbest Kanat acemisi", "Lormarin, ilk Bakır görev"],
              ["valdrenia", "Valdrenia köylüsü", "Altın Ovalar, suskun çan"],
              ["vaelmoor", "Ay Kulesi öğrencisi", "Vaelmoor, eksik sayfa"],
              ["hrimgard", "Hrimgard savaşçısı", "Frostheim, kayıp izci"],
              ["yesiloz", "Yeşilöz vatandaşı", "Kök Şehri, yeni ulus"],
              ["nekrodur", "Nekrodur eşiği", "Mor-Sarkath, eksik ad"],
              ["thalassar", "Thalassar denizcisi", "Port Argent, mühürlü sandık"],
              ["samirat", "Samirat tüccarı", "Safiran, baharat mühürü"],
              ["zul", "Zul'Karath sığlığı", "Yeraltı, yukarı çıkan kapı"],
              ["akagane", "Akagane gezgini", "Doğudan gelen mektup"],
            ].map(([id, title, pitch]) => (
              <button key={id} data-testid={`origin-${id}`} className={`genre ${originId === id ? "on" : ""}`} onClick={() => setOriginId(id)}>
                <strong>{title}</strong>
                <span className="meta"> {pitch}</span>
              </button>
            ))}
          </div>
          <label className="field">
            Ad
            <input data-testid="hero-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aria" autoFocus />
          </label>
          <label className="field">
            Köken
            <select value={race} onChange={(event) => {
              const next = RACES.find((entry) => entry.name === event.target.value);
              if (next) chooseRace(next);
            }}>
              {RACES.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
            </select>
          </label>
          <p className="faint">{pickedRace?.trait}</p>
          <label className="field">
            Yol
            <select value={classId} onChange={(event) => chooseClass(event.target.value)}>
              {PATHS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>
          <p className="meta">{path.blurb}</p>
          <label className="field">
            Yaş
            <input type="number" min={18} max={3000} value={age} onChange={(event) => setAge(Number(event.target.value))} />
          </label>
          <label className="field">
            Tek cümlelik geçmiş
            <textarea value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="Lonca kapısından içeri ilk kez girdin." />
          </label>
        </div>
      ) : null}
      {step === 1 && !veyra ? (
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
      {step === 2 && veyra ? (
        <div className="stack">
          <p className={`point-left ${left < 0 ? "bad" : ""}`}>Kalan puan {left}</p>
          <p className="faint">Her özellik 8'den başlar. 27 puan, tavan 15. Irk bonusu bunun üstüne eklenir. Can {hp} · Öz {mana} · Zırh {10 + modifier(finalStats.dex) + (pickedRace?.naturalArmor ? 1 : 0)}</p>
          <div className="buy-list">
            {STAT_KEYS.map((key) => {
              const score = base[key];
              const mod = modifier(finalStats[key]);
              return (
                <div key={key} className="buy-row">
                  <span>{STAT_SHORT[key]}</span>
                  <button type="button" aria-label={`${STAT_LABEL[key]} düşür`} onClick={() => bump(key, -1)}>−</button>
                  <strong>{finalStats[key]}</strong>
                  <button type="button" aria-label={`${STAT_LABEL[key]} yükselt`} onClick={() => bump(key, 1)}>+</button>
                  <small>{mod >= 0 ? `+${mod}` : mod} · {pointCost(score)}</small>
                </div>
              );
            })}
          </div>
          {pickedRace?.id === "insan" ? (
            <div>
              <p className="meta">İnsan: iki özelliğe +1</p>
              <div className="chips">
                {STAT_KEYS.map((key) => (
                  <button key={key} className={`chip ${boosts.includes(key) ? "on" : ""}`} onClick={() => toggleBoost(key)}>{STAT_SHORT[key]}</button>
                ))}
              </div>
              <label className="field">
                Fazladan beceri
                <select value={bonusSkill} onChange={(event) => setBonusSkill(event.target.value)}>
                  {SKILLS.map((skill) => <option key={skill.name} value={skill.name}>{skill.name}</option>)}
                </select>
              </label>
            </div>
          ) : null}
          <div className="chips">
            {(["kolay", "normal", "sert"] as const).map((entry) => (
              <button key={entry} className={`chip ${difficulty === entry ? "on" : ""}`} onClick={() => setDifficulty(entry)}>
                {entry === "kolay" ? "Kolay" : entry === "sert" ? "Sert" : "Normal"}
              </button>
            ))}
          </div>
          <p className="faint">Normal masada olağan zorluk 12. Kolayda ölüm yok. Sertte ölüm kalabilir. Öz bu dünyada kapanmaz.</p>
          <div className="chips">
            {(["kisa", "normal", "detayli"] as const).map((entry) => (
              <button key={entry} className={`chip ${tone === entry ? "on" : ""}`} onClick={() => setTone(entry)}>
                {entry === "kisa" ? "Kısa anlatım" : entry === "detayli" ? "Ayrıntılı" : "Normal anlatım"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 2 && !veyra ? (
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
            disabled={!name.trim() || !humanReady || !pointsReady}
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
              magic: veyra ? true : magic,
              tone,
              stats: finalStats,
              originId,
              bonusSkill,
            })}
          >
            Masaya otur
          </button>
        )}
      </div>
      {veyra && step === 0 ? <p className="faint">Gemini bu kıtanın dışına çıkmaz. Yemin, onur ve lonca masada durur.</p> : null}
    </div>
  );
}
