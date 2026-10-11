"use client";

import { useEffect, useState } from "react";
import { carryCapacity, carriedWeight } from "@/lib/applyCommands";
import { getPack, PACKS } from "@/lib/campaigns";
import { DEFAULT_MODEL } from "@/lib/storage";
import { formatWorldTime, xpThreshold } from "@/lib/format";
import {
  DIFFICULTY_LABEL,
  GENRE_LABEL,
  ITEM_LABEL,
  ITEM_TYPES,
  LORE_LABEL,
  RARITIES,
  RARITY_LABEL,
  SLOT_LABEL,
  SLOTS,
  STAT_KEYS,
  STAT_LABEL,
  THEME_LABEL,
  TONE_LABEL,
  type Item,
  type ItemType,
  type LoreKind,
  type Rarity,
  type Slot,
  type TabId,
} from "@/lib/types";
import { useGame } from "./GameApp";
import { compressImage } from "./imageFile";

const MODELS = [
  ["gemini-3.8-flash", "Gemini 3.8 Flash"],
  ["gemini-3.6-flash", "Gemini 3.6 Flash"],
  ["gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite"],
  ["gemini-3.1-pro-preview", "Gemini 3.1 Pro"],
];

export function Panel({ tab, onClose, desktop }: { tab: TabId; onClose: () => void; desktop: boolean }) {
  return (
    <>
      <div className="panel-head">
        <h3>{tab === "character" ? "Karakter" : tab === "inventory" ? "Envanter" : tab === "quests" ? "Görevler" : tab === "world" ? "Dünya" : tab === "log" ? "Günlük" : "Ayarlar"}</h3>
        {desktop ? null : <button onClick={onClose}>Kapat</button>}
      </div>
      <div className="panel-body">
        {tab === "character" ? <CharacterPanel /> : null}
        {tab === "inventory" ? <InventoryPanel /> : null}
        {tab === "quests" ? <QuestPanel /> : null}
        {tab === "world" ? <WorldPanel /> : null}
        {tab === "log" ? <LogPanel /> : null}
        {tab === "settings" ? <SettingsPanel /> : null}
      </div>
    </>
  );
}

function CharacterPanel() {
  const { game, commands, patchMeta } = useGame();
  if (!game) return null;
  const character = game.character;
  return (
    <>
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
        <Num label="Yaş" value={character.age} min={1} max={120} onCommit={(age) => patchMeta({ age })} />
        <Num label="Seviye" value={character.level} min={1} max={20} onCommit={(value) => commands([{ type: "set_level", value }], "Seviye")} />
        <Num label="XP" value={character.xp} max={99999} onCommit={(value) => commands([{ type: "set_xp", value }], "XP")} />
        <Num label="Can" value={character.hp} max={999} onCommit={(value) => commands([{ type: "set_hp", value }], "Can")} />
        <Num label="Azami can" value={character.maxHp} min={1} max={999} onCommit={(value) => commands([{ type: "set_max_hp", value }], "Can")} />
        {game.settings.magic ? <Num label="Mana" value={character.mana} max={999} onCommit={(value) => commands([{ type: "set_mana", value }], "Mana")} /> : null}
        {game.settings.magic ? <Num label="Azami mana" value={character.maxMana} max={999} onCommit={(value) => commands([{ type: "set_max_mana", value }], "Mana")} /> : null}
        <Num label={game.settings.currency} value={character.gold} max={999999} onCommit={(value) => commands([{ type: "set_gold", value }], "Para")} />
      </div>
      <p className="meta">Sonraki seviye {xpThreshold(character.level)} XP · Zırh sınıfı {character.ac} · Dağıtılacak puan {character.statPoints}</p>
      <div className="stat-grid">
        {STAT_KEYS.map((key) => (
          <div key={key} className="field">
            <span>{STAT_LABEL[key]}</span>
            <div className="row">
              <input
                type="number"
                min={1}
                max={24}
                defaultValue={character.stats[key]}
                key={`${key}-${character.stats[key]}`}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value !== character.stats[key]) commands([{ type: "set_stat", stat: key, value }], "Stat");
                }}
              />
              <button type="button" disabled={character.statPoints <= 0 || character.stats[key] >= 20} onClick={() => commands([{ type: "stat", stat: key, delta: 1 }], "Stat")}>+</button>
            </div>
          </div>
        ))}
      </div>
      <BlurText label="Görünüş" value={character.appearance} area onCommit={(appearance) => patchMeta({ appearance })} />
      <BlurText label="Kişilik" value={character.personality} area onCommit={(personality) => patchMeta({ personality })} />
      <BlurText label="Geçmiş" value={character.backstory} area onCommit={(backstory) => patchMeta({ backstory })} />
      <BlurText label="Not" value={character.notes} area onCommit={(notes) => patchMeta({ notes })} />
      <SkillEditor />
      {game.settings.magic ? <SpellEditor /> : null}
      {Object.keys(character.reputation).length ? (
        <div>
          <h3>İtibar</h3>
          {Object.entries(character.reputation).map(([faction, value]) => <p key={faction}>{faction}: {value}</p>)}
        </div>
      ) : null}
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

function InventoryPanel() {
  const { game, commands } = useGame();
  const [filter, setFilter] = useState<"all" | ItemType>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  if (!game) return null;
  const cap = carryCapacity(game.character.stats.str);
  const weight = carriedWeight(game.inventory);
  const items = game.inventory.filter((item) => {
    if (!game.settings.magic && item.magical) return false;
    if (filter !== "all" && item.type !== filter) return false;
    if (query && !item.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))) return false;
    return true;
  });
  return (
    <>
      <div>
        <div className="bar"><span className="fill fill-xp" data-low={weight > cap} style={{ width: `${Math.min(100, (weight / cap) * 100)}%` }} /></div>
        <p className="meta">Yük {weight.toFixed(1)} / {cap} · {game.character.gold} {game.settings.currency}</p>
      </div>
      <div className="doll">
        {SLOTS.map((slot) => {
          const item = game.inventory.find((entry) => entry.equippedSlot === slot);
          return (
            <button key={slot} className="slot" onClick={() => item && commands([{ type: "item_unequip", slot }], "Çıkar")}>
              <small>{SLOT_LABEL[slot]}</small>
              {item ? item.name : "—"}
            </button>
          );
        })}
      </div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Eşya ara" />
      <div className="chips">
        <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>Tümü</button>
        {ITEM_TYPES.map((type) => (
          <button key={type} className={`chip ${filter === type ? "on" : ""}`} onClick={() => setFilter(type)}>{ITEM_LABEL[type]}</button>
        ))}
      </div>
      {items.map((item) => (
        <article key={item.id} className={`item rarity-${item.rarity}`}>
          <button onClick={() => setOpen(open === item.id ? null : item.id)}>
            <strong>{item.name}</strong> ×{item.qty}
            <span className="meta"> {RARITY_LABEL[item.rarity]} · {ITEM_LABEL[item.type]} · {item.weight} yük</span>
          </button>
          {open === item.id ? <ItemDetail item={item} /> : null}
        </article>
      ))}
      <button onClick={() => setAdding((value) => !value)}>{adding ? "Vazgeç" : "Eşya ekle"}</button>
      {adding ? <AddItem onDone={() => setAdding(false)} /> : null}
    </>
  );
}

function ItemDetail({ item }: { item: Item }) {
  const { commands, game } = useGame();
  if (!game) return null;
  const canEquip = !["consumable", "material", "quest", "key", "book"].includes(item.type);
  return (
    <div className="detail">
      <p>{item.description || "Açıklama yok."}</p>
      {item.lore ? <p className="meta">{item.lore}</p> : null}
      <p className="meta">
        {item.props.damage ? `Hasar ${item.props.damage} ` : ""}
        {item.props.ac ? `Zırh +${item.props.ac} ` : ""}
        {item.props.heal ? `İyileştirir ${item.props.heal} ` : ""}
        Değer {item.value} {game.settings.currency}
      </p>
      <div className="row">
        {canEquip ? (
          item.equippedSlot ? (
            <button onClick={() => commands([{ type: "item_unequip", slot: item.equippedSlot as Slot }], "Çıkar")}>Çıkar</button>
          ) : (
            <button onClick={() => commands([{ type: "item_equip", name: item.name, id: item.id }], "Kuşan")}>Kuşan</button>
          )
        ) : null}
        {item.props.heal || item.props.healMana ? (
          <button onClick={() => {
            const list = [];
            if (item.props.heal) list.push({ type: "hp" as const, delta: item.props.heal });
            if (item.props.healMana && game.settings.magic) list.push({ type: "mana" as const, delta: item.props.healMana });
            list.push({ type: "item_remove" as const, name: item.name, id: item.id, qty: 1 });
            commands(list, "Kullan");
          }}>Kullan</button>
        ) : null}
        <button className="danger" onClick={() => commands([{ type: "item_remove", name: item.name, id: item.id, qty: 1 }], "At")}>At</button>
      </div>
    </div>
  );
}

function AddItem({ onDone }: { onDone: () => void }) {
  const { commands } = useGame();
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<ItemType>("misc");
  const [rarity, setRarity] = useState<Rarity>("common");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState(0.2);
  return (
    <div className="stack">
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ad" />
      <div className="grid-2">
        <select value={itemType} onChange={(event) => setItemType(event.target.value as ItemType)}>
          {ITEM_TYPES.map((type) => <option key={type} value={type}>{ITEM_LABEL[type]}</option>)}
        </select>
        <select value={rarity} onChange={(event) => setRarity(event.target.value as Rarity)}>
          {RARITIES.map((entry) => <option key={entry} value={entry}>{RARITY_LABEL[entry]}</option>)}
        </select>
      </div>
      <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Kısa açıklama" />
      <input type="number" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
      <button
        className="primary"
        onClick={() => {
          if (!name.trim()) return;
          commands([{
            type: "item_add",
            item: {
              name: name.trim(),
              qty: 1,
              itemType,
              subtype: "",
              description,
              lore: "",
              rarity,
              weight,
              value: 0,
              slot: null,
              magical: false,
              stackable: itemType === "consumable" || itemType === "material",
            },
          }], "Eşya");
          onDone();
        }}
      >Kaydet</button>
    </div>
  );
}

function QuestPanel() {
  const { game, commands, deleteQuest, setObjective } = useGame();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (!game) return null;
  return (
    <>
      {game.quests.map((quest) => (
        <article key={quest.id} className="quest">
          <h3>{quest.title}</h3>
          <p className="meta">{quest.status === "active" ? "Açık" : quest.status === "completed" ? "Bitti" : "Boşa düştü"}</p>
          <p>{quest.description}</p>
          {quest.objectives.map((objective, index) => (
            <label key={objective.text} className="check">
              <input type="checkbox" checked={objective.done} onChange={(event) => setObjective(quest.id, index, event.target.checked)} />
              <span>{objective.text}</span>
            </label>
          ))}
          {quest.reward ? <p className="meta">Ödül: {quest.reward}</p> : null}
          <div className="row">
            {quest.status !== "completed" ? <button onClick={() => commands([{ type: "quest_update", title: quest.title, status: "completed" }], "Görev")}>Bitir</button> : null}
            {quest.status !== "failed" ? <button onClick={() => commands([{ type: "quest_update", title: quest.title, status: "failed" }], "Görev")}>Bırak</button> : null}
            <button className="danger" onClick={() => deleteQuest(quest.id)}>Sil</button>
          </div>
        </article>
      ))}
      <div className="stack">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Yeni görev" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ne isteniyor?" />
        <button onClick={() => {
          if (!title.trim()) return;
          commands([{ type: "quest_add", title: title.trim(), description, objectives: [], reward: "" }], "Görev");
          setTitle("");
          setDescription("");
        }}>Görev ekle</button>
      </div>
    </>
  );
}

function WorldPanel() {
  const { game, commands, addLore, updateLore, deleteLore } = useGame();
  const [kind, setKind] = useState<LoreKind>("location");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [secret, setSecret] = useState(false);
  const [always, setAlways] = useState(false);
  if (!game) return null;
  const missing = Math.max(0, game.character.maxHp - game.character.hp);
  return (
    <>
      <p>{formatWorldTime(game.worldTime)} · {game.location}</p>
      <BlurText label="Konum" value={game.location} onCommit={(name) => commands([{ type: "location_set", name }], "Konum")} />
      <div className="row">
        <button onClick={() => commands([{ type: "time", delta_hours: -1 }], "Saat")}>-1 saat</button>
        <button onClick={() => commands([{ type: "time", delta_hours: 1 }], "Saat")}>+1 saat</button>
        <button onClick={() => commands([
          { type: "time", delta_hours: 8 },
          ...(missing ? [{ type: "hp" as const, delta: Math.max(1, Math.ceil(missing * 0.5)) }] : []),
          { type: "condition_remove", name: "yorgun" },
        ], "Kamp")}>Kamp kur</button>
      </div>
      <h3>Kişiler</h3>
      {game.npcs.map((npc) => (
        <article key={npc.id} className="npc">
          <strong>{npc.name}</strong>
          <p className="meta">Tutum {npc.attitude} · {npc.status === "alive" ? "sağ" : npc.status === "dead" ? "ölü" : "kayıp"} · {npc.location}</p>
          {npc.notes ? <p>{npc.notes}</p> : null}
        </article>
      ))}
      <h3>Dünya kitabı</h3>
      <p className="faint">Her zaman dahil olanlar her tur hakeme gider. GM'e özel notlar sende görünür, anlatımda açıkça söylenmez.</p>
      {game.lore.map((entry) => (
        <LoreCard key={entry.id} title={entry.title} content={entry.content} kind={entry.kind} secret={entry.visibility === "ai_only"} always={entry.alwaysInclude} onSave={(partial) => updateLore(entry.id, partial)} onDelete={() => deleteLore(entry.id)} />
      ))}
      <div className="stack">
        <select value={kind} onChange={(event) => setKind(event.target.value as LoreKind)}>
          {(Object.keys(LORE_LABEL) as LoreKind[]).map((entry) => <option key={entry} value={entry}>{LORE_LABEL[entry]}</option>)}
        </select>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Başlık" />
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Uzun not" />
        <label className="check"><input type="checkbox" checked={always} onChange={(event) => setAlways(event.target.checked)} /> Her tur hakeme git</label>
        <label className="check"><input type="checkbox" checked={secret} onChange={(event) => setSecret(event.target.checked)} /> Yalnız hakem bilsin</label>
        <button onClick={() => {
          if (!title.trim() || !content.trim()) return;
          addLore({ kind, title: title.trim(), content: content.trim(), tags: [], visibility: secret ? "ai_only" : "player_visible", alwaysInclude: always });
          setTitle("");
          setContent("");
        }}>Nota ekle</button>
      </div>
    </>
  );
}

function LoreCard({ title, content, kind, secret, always, onSave, onDelete }: { title: string; content: string; kind: LoreKind; secret: boolean; always: boolean; onSave: (partial: { title?: string; content?: string; alwaysInclude?: boolean; visibility?: "ai_only" | "player_visible" }) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(content);
  useEffect(() => setDraft(content), [content]);
  return (
    <article className="lore">
      <button onClick={() => setOpen((value) => !value)}>
        <strong>{title}</strong>
        <span className="meta"> {LORE_LABEL[kind]}{always ? " · her tur" : ""}{secret ? " · yalnız hakem" : ""}</span>
      </button>
      {open ? (
        <div className="stack">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
          <div className="row">
            <button onClick={() => onSave({ content: draft })}>Kaydet</button>
            <button className="danger" onClick={onDelete}>Sil</button>
          </div>
        </div>
      ) : null}
    </article>
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
