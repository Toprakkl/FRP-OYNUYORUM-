"use client";

import { useEffect, useState } from "react";
import { getPack, PACKS } from "@/lib/campaigns";
import { DEFAULT_MODEL } from "@/lib/storage";
import { modifier } from "@/lib/dice";
import { xpThreshold } from "@/lib/format";
import { levelCap, statCap } from "@/lib/veyra";
import {
  DIFFICULTY_LABEL,
  GENRE_LABEL,
  STAT_KEYS,
  STAT_LABEL,
  STAT_SHORT,
  THEME_LABEL,
  TONE_LABEL,
  type TabId,
} from "@/lib/types";
import { InventoryMenu, PaperDoll, QuestMenu, WorldMenu } from "./menus";
import { KingdomPanel, ProfessionPanel } from "./VeyraLife";
import { VeyraSheet } from "./VeyraSheet";
import { useGame } from "./GameApp";
import { compressImage } from "./imageFile";

const MODELS = [
  ["gemini-3.8-flash", "Gemini 3.8 Flash"],
  ["gemini-3.6-flash", "Gemini 3.6 Flash"],
  ["gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite"],
  ["gemini-3.1-pro-preview", "Gemini 3.1 Pro"],
];

export function Panel({ tab, onClose, desktop, onJump }: { tab: TabId; onClose: () => void; desktop: boolean; onJump?: (tab: TabId) => void }) {
  const title = tab === "character" ? "Karakter" : tab === "inventory" ? "Envanter" : tab === "quests" ? "Görevler" : tab === "world" ? "Dünya" : tab === "log" ? "Günlük" : tab === "profession" ? "Meslek" : tab === "kingdom" ? "Krallık" : "Ayarlar";
  return (
    <>
      <div className="sheet-handle" aria-hidden="true" />
      <div className="panel-head">
        <h3>{title}</h3>
        {desktop ? null : <button onClick={onClose} aria-label="Kapat">Kapat</button>}
      </div>
      <div className="panel-body">
        {tab === "character" ? <CharacterPanel onJump={onJump} /> : null}
        {tab === "inventory" ? <InventoryMenu /> : null}
        {tab === "quests" ? <QuestMenu /> : null}
        {tab === "world" ? <WorldMenu /> : null}
        {tab === "profession" ? <ProfessionPanel /> : null}
        {tab === "kingdom" ? <KingdomPanel /> : null}
        {tab === "log" ? <LogPanel /> : null}
        {tab === "settings" ? <SettingsPanel /> : null}
      </div>
    </>
  );
}

function CharacterPanel({ onJump }: { onJump?: (tab: TabId) => void }) {
  const { game, commands, patchMeta } = useGame();
  if (!game) return null;
  const character = game.character;
  const hpPct = Math.round((character.hp / Math.max(1, character.maxHp)) * 100);
  const cap = levelCap(game.settings.genre);
  const ceiling = game.settings.genre === "veyra" ? statCap(character.level) : 20;
  const ready = character.xp >= xpThreshold(character.level) && character.level < cap;
  const pool = game.settings.genre === "veyra" ? "Öz" : "Mana";
  return (
    <>
      <div className="sheet-id">
        <h2 className="sheet-name">{character.name}</h2>
        <p className="meta">{character.className} · {character.race || "Köken yok"} · Zırh {character.ac}</p>
      </div>
      {ready ? <button className="level-glow" onClick={() => commands([{ type: "level_up" }], "Seviye")}>Seviye atla</button> : null}
      {character.statPoints > 0 ? <p className="level-glow">Dağıtılacak puan {character.statPoints}</p> : null}
      {game.settings.genre === "veyra" && character.talentPoints > 0 ? <p className="level-glow">Yetenek puanı {character.talentPoints}</p> : null}
      <VeyraSheet compact />
      <PaperDoll onBrowse={() => onJump?.("inventory")} />
      <div className="sheet-vitals">
        <div className="hp-orb hp-orb-lg" data-low={hpPct < 35}>
          <strong>{character.hp}</strong>
          <small>/{character.maxHp}</small>
        </div>
        <div>
          <p className="meta">Can</p>
          <p>XP {character.xp}/{xpThreshold(character.level)} · {character.gold} {game.settings.currency}</p>
          {game.settings.magic && character.maxMana > 0 ? <p className="meta">{pool} {character.mana}/{character.maxMana}</p> : null}
          {character.statPoints > 0 ? <p className="meta">Dağıtılacak puan {character.statPoints}</p> : null}
        </div>
      </div>
      <div className="abilities">
        {STAT_KEYS.map((key) => {
          const score = character.stats[key];
          const mod = modifier(score);
          return (
            <div key={key} className="ability">
              <span className="ability-mod">{mod >= 0 ? `+${mod}` : mod}</span>
              <input
                className="ability-score"
                aria-label={STAT_LABEL[key]}
                type="number"
                min={1}
                max={game.settings.genre === "veyra" ? 30 : 24}
                defaultValue={score}
                key={`${key}-${score}`}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value !== score) commands([{ type: "set_stat", stat: key, value }], "Stat");
                }}
              />
              <span className="ability-name">{STAT_SHORT[key]}</span>
              <button type="button" className="ability-plus" disabled={character.statPoints <= 0 || score >= ceiling} onClick={() => commands([{ type: "stat", stat: key, delta: 1 }], "Stat")}>+</button>
            </div>
          );
        })}
      </div>
      <VeyraSheet />
      <details className="sheet-more">
        <summary>Kağıdı düzenle</summary>
      <div className="row">
        <label className="primary" style={{ display: "inline-grid", placeItems: "center", minHeight: 44, padding: "0 12px", background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 12 }}>
          Portre yükle
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                patchMeta({ portraitDataUrl: await compressImage(file) });
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "Görsel okunamadı");
              }
            }}
          />
        </label>
        {character.portraitDataUrl ? <button onClick={() => patchMeta({ portraitDataUrl: undefined })}>Portreyi kaldır</button> : null}
      </div>
      <div className="grid-2">
        <BlurText label="Ad" value={character.name} onCommit={(name) => patchMeta({ name })} />
        <BlurText label="Sınıf" value={character.className} onCommit={(className) => patchMeta({ className })} />
        <BlurText label="Köken" value={character.race} onCommit={(race) => patchMeta({ race })} />
        <Num label="Yaş" value={character.age} min={1} max={game.settings.genre === "veyra" ? 3000 : 120} onCommit={(age) => patchMeta({ age })} />
        <Num label="Seviye" value={character.level} min={1} max={cap} onCommit={(value) => commands([{ type: "set_level", value }], "Seviye")} />
        <Num label="XP" value={character.xp} max={99999} onCommit={(value) => commands([{ type: "set_xp", value }], "XP")} />
        <Num label="Can" value={character.hp} max={999} onCommit={(value) => commands([{ type: "set_hp", value }], "Can")} />
        <Num label="Azami can" value={character.maxHp} min={1} max={999} onCommit={(value) => commands([{ type: "set_max_hp", value }], "Can")} />
        {game.settings.magic ? <Num label={pool} value={character.mana} max={9999} onCommit={(value) => commands([{ type: "set_mana", value }], pool)} /> : null}
        {game.settings.magic ? <Num label={`Azami ${pool.toLocaleLowerCase("tr")}`} value={character.maxMana} max={9999} onCommit={(value) => commands([{ type: "set_max_mana", value }], pool)} /> : null}
        <Num label={game.settings.currency} value={character.gold} max={999999} onCommit={(value) => commands([{ type: "set_gold", value }], "Para")} />
      </div>
      <BlurText label="Görünüş" value={character.appearance} area onCommit={(appearance) => patchMeta({ appearance })} />
      <BlurText label="Kişilik" value={character.personality} area onCommit={(personality) => patchMeta({ personality })} />
      <BlurText label="Geçmiş" value={character.backstory} area onCommit={(backstory) => patchMeta({ backstory })} />
      <BlurText label="Not" value={character.notes} area onCommit={(notes) => patchMeta({ notes })} />
      {game.settings.genre === "veyra" ? null : <SkillEditor />}
      {game.settings.magic ? <SpellEditor /> : null}
      {Object.keys(character.reputation).length ? (
        <div>
          <h3>İtibar</h3>
          {Object.entries(character.reputation).map(([faction, value]) => <p key={faction}>{faction}: {value}</p>)}
        </div>
      ) : null}
      </details>
    </>
  );
}

function SkillEditor() {
  const { game, commands } = useGame();
  const [name, setName] = useState("");
  if (!game) return null;
  return (
    <div className="section">
      <h3>Beceriler</h3>
      {game.character.skills.map((skill) => <p key={skill.name}>{skill.name} · {skill.level}</p>)}
      <div className="row">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Yeni beceri" />
        <button onClick={() => { if (!name.trim()) return; commands([{ type: "skill_add", name: name.trim(), level: 1 }], "Beceri"); setName(""); }}>Ekle</button>
      </div>
    </div>
  );
}

function SpellEditor() {
  const { game, commands } = useGame();
  const [name, setName] = useState("");
  if (!game) return null;
  return (
    <div className="section">
      <h3>Büyüler</h3>
      {game.character.spells.map((spell) => (
        <div className="row" key={spell}>
          <span>{spell}</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent("frp-compose", { detail: `Büyü kullanıyorum: ${spell}. ` }))}>Yaz</button>
        </div>
      ))}
      <div className="row">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Yeni büyü" />
        <button onClick={() => { if (!name.trim()) return; commands([{ type: "spell_learn", name: name.trim() }], "Büyü"); setName(""); }}>Öğren</button>
      </div>
    </div>
  );
}

function LogPanel() {
  const { game, undo, commands } = useGame();
  const [note, setNote] = useState("");
  if (!game) return null;
  const rolls = game.messages.filter((message) => message.dice);
  return (
    <>
      <button disabled={!game.history.length} onClick={undo}>Son değişikliği geri al</button>
      <p className="faint">Geri alma anlatıyı da o turdan önceki hale çeker. Dünya kitabı notların durur.</p>
      <h3>Olaylar</h3>
      {[...game.events].reverse().slice(0, 40).map((event) => (
        <p key={event.id} className="log-item">{event.summary} <span className="faint">{event.source}</span></p>
      ))}
      <h3>Zarlar</h3>
      {rolls.slice(-12).reverse().map((message) => (
        <p key={message.id} className="log-item">{message.dice ? `d20 ${message.dice.natural} = ${message.dice.total}` : ""} · {message.content.slice(0, 80)}</p>
      ))}
      <h3>Günlük</h3>
      {game.journal.map((entry) => <p key={entry.id} className="log-item">{entry.content}</p>)}
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kendine not" />
      <button onClick={() => { if (!note.trim()) return; commands([{ type: "journal_add", text: note.trim() }], "Günlük"); setNote(""); }}>Yaz</button>
    </>
  );
}

function SettingsPanel() {
  const { game, prefs, setPrefs, setSettings, setTitle, exportGame, serverKey } = useGame();
  const [ping, setPing] = useState("");
  const [showKey, setShowKey] = useState(false);
  if (!game) return null;
  const pack = getPack(game.settings.genre);
  return (
    <>
      <BlurText label="Macera adı" value={game.title} onCommit={setTitle} />
      <label className="field">
        Gemini API anahtarı
        <input type={showKey ? "text" : "password"} value={prefs.apiKey} autoComplete="off" placeholder={serverKey ? "Sunucuda anahtar var" : "AI Studio anahtarı"} onChange={(event) => setPrefs({ apiKey: event.target.value.trim() })} />
      </label>
      <div className="row">
        <button onClick={() => setShowKey((value) => !value)}>{showKey ? "Gizle" : "Göster"}</button>
        <button onClick={async () => {
          setPing("Deneniyor…");
          const response = await fetch("/api/ping", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ apiKey: prefs.apiKey, model: prefs.model, test: true }),
          });
          const data = (await response.json()) as { ok?: boolean; error?: string };
          setPing(data.ok ? "Anahtar çalışıyor." : data.error || "Olmadı");
        }}>Anahtarı dene</button>
      </div>
      {ping ? <p>{ping}</p> : null}
      <p className="faint">Gemini Pro sohbet üyeliği buraya bağlanmaz. Anahtar şurada: aistudio.google.com/apikey</p>
      <label className="field">
        Model
        <select value={MODELS.some((entry) => entry[0] === prefs.model) ? prefs.model : "custom"} onChange={(event) => { if (event.target.value !== "custom") setPrefs({ model: event.target.value }); }}>
          {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          <option value="custom">Başka</option>
        </select>
      </label>
      {!MODELS.some((entry) => entry[0] === prefs.model) ? (
        <input value={prefs.model} onChange={(event) => setPrefs({ model: event.target.value.trim() || DEFAULT_MODEL })} />
      ) : null}
      <div className="chips">
        <button className={`chip ${prefs.narrator === "gemini" ? "on" : ""}`} onClick={() => setPrefs({ narrator: "gemini" })}>Gemini</button>
        <button className={`chip ${prefs.narrator === "yerel" ? "on" : ""}`} onClick={() => setPrefs({ narrator: "yerel" })}>Yerel anlatıcı</button>
        <button className={`chip ${prefs.sound ? "on" : ""}`} onClick={() => setPrefs({ sound: !prefs.sound })}>{prefs.sound ? "Zar sesi açık" : "Zar sesi kapalı"}</button>
      </div>
      <label className="field">
        Tür
        <select value={game.settings.genre} onChange={(event) => setSettings({ genre: event.target.value as typeof game.settings.genre })}>
          {PACKS.map((entry) => <option key={entry.id} value={entry.id}>{GENRE_LABEL[entry.id]}</option>)}
        </select>
      </label>
      {game.settings.genre === "ozel" ? <BlurText label="Dünya tanımı" value={game.settings.customGenre} onCommit={(customGenre) => setSettings({ customGenre })} /> : null}
      <label className="field">
        Tema
        <select value={game.settings.theme} onChange={(event) => setSettings({ theme: event.target.value as typeof game.settings.theme })}>
          {(Object.keys(THEME_LABEL) as (keyof typeof THEME_LABEL)[]).map((theme) => <option key={theme} value={theme}>{THEME_LABEL[theme]}</option>)}
        </select>
      </label>
      <div className="chips">
        {(Object.keys(DIFFICULTY_LABEL) as (keyof typeof DIFFICULTY_LABEL)[]).map((difficulty) => (
          <button key={difficulty} className={`chip ${game.settings.difficulty === difficulty ? "on" : ""}`} onClick={() => setSettings({ difficulty })}>{DIFFICULTY_LABEL[difficulty]}</button>
        ))}
        {(Object.keys(TONE_LABEL) as (keyof typeof TONE_LABEL)[]).map((tone) => (
          <button key={tone} className={`chip ${game.settings.tone === tone ? "on" : ""}`} onClick={() => setSettings({ tone })}>{TONE_LABEL[tone]}</button>
        ))}
      </div>
      <div className="chips">
        <button className={`chip ${game.settings.magic ? "on" : ""}`} onClick={() => setSettings({ magic: !game.settings.magic })}>{game.settings.magic ? "Büyü açık" : "Büyü kapalı"}</button>
        <button className={`chip ${game.settings.realism ? "on" : ""}`} onClick={() => setSettings({ realism: !game.settings.realism })}>{game.settings.realism ? "Gerçekçilik açık" : "Gerçekçilik kapalı"}</button>
        <button
          className={`chip ${game.settings.adult ? "on" : ""}`}
          onClick={() => {
            if (game.character.age > 0 && game.character.age < 18) {
              window.alert("Karakter 18 yaşından küçük. Yetişkin içerik kapalı kalır.");
              return;
            }
            if (!game.settings.adultConfirmed) {
              const ok = window.confirm("18 yaşından büyük müsün? Reşit olmayan karakterlerle cinsel içerik yine de üretilmez.");
              if (!ok) return;
              setSettings({ adultConfirmed: true, adult: true });
              return;
            }
            setSettings({ adult: !game.settings.adult });
          }}
        >{game.settings.adult ? "+18 açık" : "+18 kapalı"}</button>
      </div>
      <BlurText label="Ev kuralları" value={game.settings.customRules} area onCommit={(customRules) => setSettings({ customRules })} />
      <BlurText label="Para birimi" value={game.settings.currency || pack.currency} onCommit={(currency) => setSettings({ currency })} />
      <button onClick={() => exportGame(game.id)}>Macerayı indir</button>
      <p className="faint">Kayıt bu tarayıcıda durur. Telefonla bilgisayar arasında dosyayı taşı. Anahtar dosyaya yazılmaz.</p>
    </>
  );
}

function Num({ label, value, onCommit, min = 0, max = 999 }: { label: string; value: number; onCommit: (value: number) => void; min?: number; max?: number }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="field">
      {label}
      <input
        inputMode="numeric"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = Number(draft);
          if (!Number.isFinite(next)) return;
          const clamped = Math.min(max, Math.max(min, Math.round(next)));
          if (clamped !== value) onCommit(clamped);
        }}
      />
    </label>
  );
}

function BlurText({ label, value, onCommit, area = false }: { label: string; value: string; onCommit: (value: string) => void; area?: boolean }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft !== value) onCommit(draft); };
  return (
    <label className="field">
      {label}
      {area ? <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} /> : <input value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />}
    </label>
  );
}
