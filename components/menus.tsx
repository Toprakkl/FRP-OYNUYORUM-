"use client";

import { useMemo, useState } from "react";
import { carryCapacity, carriedWeight } from "@/lib/applyCommands";
import { formatWorldTime } from "@/lib/format";
import {
  ITEM_LABEL,
  ITEM_TYPES,
  LORE_LABEL,
  RARITIES,
  RARITY_LABEL,
  SLOT_LABEL,
  type Item,
  type ItemType,
  type LoreKind,
  type Rarity,
  type Slot,
} from "@/lib/types";
import { useGame } from "./GameApp";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "weapon", label: "Silah" },
  { id: "armor", label: "Zırh" },
  { id: "consumable", label: "İksir" },
  { id: "quest", label: "Görev" },
  { id: "material", label: "Malzeme" },
  { id: "other", label: "Diğer" },
];

type FilterId = "all" | "weapon" | "armor" | "consumable" | "quest" | "material" | "other";
type SortId = "name" | "weight" | "value" | "rarity";

const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

const GLYPH: Record<ItemType, string> = {
  weapon: "⚔",
  armor: "▣",
  shield: "◆",
  accessory: "✧",
  consumable: "✚",
  tool: "⚒",
  material: "▪",
  quest: "⚑",
  book: "≡",
  key: "⚷",
  misc: "·",
};

function matchesFilter(item: Item, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "armor") return item.type === "armor" || item.type === "shield";
  if (filter === "other") return ["tool", "accessory", "book", "key", "misc"].includes(item.type);
  return item.type === filter;
}

export function InventoryMenu() {
  const { game, commands } = useGame();
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("name");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const items = useMemo(() => {
    if (!game) return [];
    const list = game.inventory.filter((item) => {
      if (!game.settings.magic && item.magical) return false;
      if (!matchesFilter(item, filter)) return false;
      if (query && !item.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sort === "weight") return b.weight * b.qty - a.weight * a.qty;
      if (sort === "value") return b.value * b.qty - a.value * a.qty;
      if (sort === "rarity") return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
      return a.name.localeCompare(b.name, "tr");
    });
    return list;
  }, [game, filter, query, sort]);

  if (!game) return null;
  const cap = carryCapacity(game.character.stats.str);
  const weight = carriedWeight(game.inventory);
  const overloaded = weight > cap;
  const valueSum = game.inventory.reduce((sum, item) => sum + item.value * item.qty, 0);
  const selected = game.inventory.find((item) => item.id === open) ?? null;
  const blanks = Math.max(0, 8 - items.length);
  const counts = Object.fromEntries(FILTERS.map((entry) => [entry.id, game.inventory.filter((item) => matchesFilter(item, entry.id)).length])) as Record<FilterId, number>;

  return (
    <div className="menu-block">
      <div className="menu-head">
        <div>
          <p className="meta">Yük {weight.toFixed(1)} / {cap} kg</p>
          <div className="bar load-bar">
            <span className="fill fill-load" data-low={overloaded} style={{ width: `${Math.min(100, (weight / Math.max(1, cap)) * 100)}%` }} />
          </div>
        </div>
        <div className="menu-gold">
          <strong>{game.character.gold}</strong>
          <span>{game.settings.currency}</span>
          <small>eşya {valueSum}</small>
        </div>
        <button className={`icon-btn ${editing ? "on" : ""}`} aria-label="Düzenle" onClick={() => setEditing((value) => !value)}>✎</button>
      </div>
      {overloaded ? <p className="warn-banner">Aşırı yüklü. Fazla yük hamleni yavaşlatır.</p> : null}
      <div className="chips filter-row">
        {FILTERS.map((entry) => (
          <button key={entry.id} className={`chip ${filter === entry.id ? "on" : ""}`} onClick={() => setFilter(entry.id)}>
            {entry.label} <span className="count-badge">{counts[entry.id]}</span>
          </button>
        ))}
      </div>
      <div className="inv-tools">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Eşya ara" aria-label="Eşya ara" />
        <select aria-label="Sırala" value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
          <option value="name">Ad</option>
          <option value="weight">Ağırlık</option>
          <option value="value">Değer</option>
          <option value="rarity">Nadirlik</option>
        </select>
      </div>
      {items.length === 0 ? <p className="empty-state">Bu sepette eşya yok.</p> : null}
      <div className="inv-grid">
        {items.map((item) => (
          <button key={item.id} className={`inv-slot rarity-${item.rarity} ${open === item.id ? "on" : ""}`} onClick={() => setOpen(open === item.id ? null : item.id)}>
            {item.equippedSlot ? <span className="equip-mark">E</span> : null}
            <span className="inv-glyph" aria-hidden="true">{GLYPH[item.type]}</span>
            <span className="inv-name">{item.name}</span>
            {item.qty > 1 ? <span className="qty-badge">{item.qty}</span> : null}
          </button>
        ))}
        {Array.from({ length: blanks }, (_, index) => <span key={index} className="inv-slot inv-empty" aria-hidden="true" />)}
      </div>
      {selected ? <ItemDetailSheet item={selected} editing={editing} onClose={() => setOpen(null)} /> : null}
      {editing ? (
        <button className="fab" onClick={() => setAdding((value) => !value)} aria-label="Eşya ekle">{adding ? "×" : "+"}</button>
      ) : null}
      {adding ? <AddItem onDone={() => setAdding(false)} /> : null}
    </div>
  );
}

function ItemDetailSheet({ item, editing, onClose }: { item: Item; editing: boolean; onClose: () => void }) {
  const { commands, game } = useGame();
  if (!game) return null;
  const canEquip = !["consumable", "material", "quest", "key", "book"].includes(item.type);
  const worn = item.slot ? game.inventory.find((entry) => entry.equippedSlot === item.slot && entry.id !== item.id) : undefined;
  const acDelta = worn && item.props.ac != null && worn.props.ac != null ? item.props.ac - worn.props.ac : null;
  return (
    <article className={`item-detail-sheet rarity-${item.rarity}`}>
      <div className="detail-top">
        <span className="inv-glyph detail-art">{GLYPH[item.type]}</span>
        <div>
          <h3 className={`rarity-ink rarity-ink-${item.rarity}`}>{item.name}</h3>
          <p className="meta">{ITEM_LABEL[item.type]}{item.subtype ? ` · ${item.subtype}` : ""} · {RARITY_LABEL[item.rarity]}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Kapat">×</button>
      </div>
      <dl className="stat-table">
        {item.props.damage ? <div><dt>Hasar</dt><dd>{item.props.damage}</dd></div> : null}
        {item.props.ac != null ? <div><dt>Zırh</dt><dd>+{item.props.ac}</dd></div> : null}
        {item.props.heal ? <div><dt>İyileşme</dt><dd>+{item.props.heal}</dd></div> : null}
        <div><dt>Ağırlık</dt><dd>{item.weight}</dd></div>
        <div><dt>Değer</dt><dd>{item.value} {game.settings.currency}</dd></div>
        <div><dt>Adet</dt><dd>{item.qty}</dd></div>
      </dl>
      {worn ? (
        <p className="meta">
          Takılı: {worn.name}
          {acDelta != null ? <span className={acDelta >= 0 ? "delta-up" : "delta-down"}> {acDelta >= 0 ? `+${acDelta}` : acDelta} zırh</span> : null}
          {item.props.damage && worn.props.damage ? ` · onda ${worn.props.damage}` : ""}
        </p>
      ) : null}
      {item.description ? <p>{item.description}</p> : null}
      {item.lore ? <p className="lore-text">{item.lore}</p> : null}
      <div className="row">
        {canEquip ? (
          item.equippedSlot ? (
            <button className="primary" onClick={() => commands([{ type: "item_unequip", slot: item.equippedSlot as Slot }], "Çıkar")}>Çıkar</button>
          ) : (
            <button className="primary" onClick={() => commands([{ type: "item_equip", name: item.name, id: item.id }], "Kuşan")}>Kuşan</button>
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
      {editing ? (
        <div className="stepper">
          <button aria-label="Azalt" onClick={() => commands([{ type: "item_remove", name: item.name, id: item.id, qty: 1 }], "Adet")} disabled={item.qty <= 1}>−</button>
          <span>{item.qty}</span>
          <button aria-label="Artır" onClick={() => commands([{
            type: "item_add",
            item: {
              name: item.name,
              qty: 1,
              itemType: item.type,
              subtype: item.subtype,
              description: item.description,
              lore: item.lore,
              rarity: item.rarity,
              weight: item.weight,
              value: item.value,
              slot: item.slot,
              magical: item.magical,
              stackable: true,
            },
          }], "Adet")}>+</button>
        </div>
      ) : null}
    </article>
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
    <div className="stack add-card">
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
      <input type="number" step="0.1" aria-label="Ağırlık" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
      <button className="primary" onClick={() => {
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
      }}>Kaydet</button>
    </div>
  );
}

const DOLL_AREAS: { slot: Slot; area: string }[] = [
  { slot: "head", area: "head" },
  { slot: "neck", area: "neck" },
  { slot: "back", area: "back" },
  { slot: "hands", area: "hands" },
  { slot: "chest", area: "chest" },
  { slot: "ranged", area: "ranged" },
  { slot: "ring_1", area: "r1" },
  { slot: "main_hand", area: "main" },
  { slot: "off_hand", area: "off" },
  { slot: "legs", area: "legs" },
  { slot: "feet", area: "feet" },
  { slot: "ring_2", area: "r2" },
];

export function PaperDoll({ onBrowse }: { onBrowse?: () => void }) {
  const { game, commands } = useGame();
  if (!game) return null;
  const character = game.character;
  return (
    <div className="paper-doll">
      <div className="portrait portrait-lg doll-portrait">
        {character.portraitDataUrl ? <img src={character.portraitDataUrl} alt="" /> : character.name.slice(0, 1).toLocaleUpperCase("tr")}
        <span className="level-pip">{character.level}</span>
      </div>
      {DOLL_AREAS.map(({ slot, area }) => {
        const item = game.inventory.find((entry) => entry.equippedSlot === slot);
        return (
          <button
            key={slot}
            className={`doll-slot ${item ? `rarity-${item.rarity}` : ""}`}
            style={{ gridArea: area }}
            onClick={() => {
              if (item?.equippedSlot) commands([{ type: "item_unequip", slot }], "Çıkar");
              else onBrowse?.();
            }}
          >
            <small>{SLOT_LABEL[slot]}</small>
            <span>{item ? item.name : "—"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function QuestMenu() {
  const { game, commands, deleteQuest, setObjective } = useGame();
  const [tab, setTab] = useState<"active" | "completed" | "failed">("active");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (!game) return null;
  const quests = game.quests.filter((quest) => quest.status === tab);
  const labels = { active: "Aktif", completed: "Tamamlanan", failed: "Başarısız" } as const;
  return (
    <div className="menu-block">
      <div className="segment">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => (
          <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{labels[key]}</button>
        ))}
      </div>
      {quests.length === 0 ? <p className="empty-state">{tab === "active" ? "Açık görev yok. Yol seni bekliyor." : "Bu listede görev yok."}</p> : null}
      {quests.map((quest) => {
        const done = quest.objectives.filter((objective) => objective.done).length;
        const total = quest.objectives.length;
        const pct = total ? (done / total) * 360 : 0;
        return (
          <article key={quest.id} className="quest-card">
            <div className="quest-top">
              <div>
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>
              </div>
              <div className="progress-ring" style={{ background: `conic-gradient(var(--accent) ${pct}deg, rgba(255,255,255,.12) 0)` }} aria-label={`${done} / ${total}`}>
                <span>{total ? `${done}/${total}` : "—"}</span>
              </div>
            </div>
            {quest.objectives.map((objective, index) => (
              <label key={objective.text} className="check">
                <input type="checkbox" checked={objective.done} onChange={(event) => setObjective(quest.id, index, event.target.checked)} />
                <span>{objective.text}</span>
              </label>
            ))}
            {quest.reward ? <p className="reward">Ödül · {quest.reward}</p> : null}
            <div className="row">
              {quest.status !== "completed" ? <button onClick={() => commands([{ type: "quest_update", title: quest.title, status: "completed" }], "Görev")}>Bitir</button> : null}
              {quest.status !== "failed" ? <button onClick={() => commands([{ type: "quest_update", title: quest.title, status: "failed" }], "Görev")}>Bırak</button> : null}
              <button className="danger" onClick={() => deleteQuest(quest.id)}>Sil</button>
            </div>
          </article>
        );
      })}
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
    </div>
  );
}

export function WorldMenu() {
  const { game, commands, addLore, updateLore, deleteLore } = useGame();
  const [segment, setSegment] = useState<"npc" | "place" | "faction" | "journal">("npc");
  const [kind, setKind] = useState<LoreKind>("location");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [secret, setSecret] = useState(false);
  const [always, setAlways] = useState(false);
  const [note, setNote] = useState("");
  if (!game) return null;
  const places = game.lore.filter((entry) => entry.kind === "location");
  const factions = game.lore.filter((entry) => entry.kind === "faction");
  const other = game.lore.filter((entry) => entry.kind !== "location" && entry.kind !== "faction");
  const missing = Math.max(0, game.character.maxHp - game.character.hp);
  return (
    <div className="menu-block">
      <p className="meta">{formatWorldTime(game.worldTime)} · {game.location}</p>
      <div className="row">
        <button onClick={() => commands([{ type: "time", delta_hours: 1 }], "Saat")}>+1 saat</button>
        <button onClick={() => commands([
          { type: "time", delta_hours: 8 },
          ...(missing ? [{ type: "hp" as const, delta: Math.max(1, Math.ceil(missing * 0.5)) }] : []),
          { type: "condition_remove", name: "yorgun" },
        ], "Kamp")}>Kamp kur</button>
      </div>
      <div className="segment">
        <button className={segment === "npc" ? "on" : ""} onClick={() => setSegment("npc")}>Kişiler</button>
        <button className={segment === "place" ? "on" : ""} onClick={() => setSegment("place")}>Mekanlar</button>
        <button className={segment === "faction" ? "on" : ""} onClick={() => setSegment("faction")}>Gruplar</button>
        <button className={segment === "journal" ? "on" : ""} onClick={() => setSegment("journal")}>Günlük</button>
      </div>
      {segment === "npc" ? (
        game.npcs.length === 0 ? <p className="empty-state">Henüz kimse yok.</p> : game.npcs.map((npc) => <NpcCard key={npc.id} name={npc.name} attitude={npc.attitude} status={npc.status} location={npc.location} notes={npc.notes} />)
      ) : null}
      {segment === "place" ? (
        places.length === 0 ? <p className="empty-state">Kayıtlı mekan yok.</p> : places.map((entry) => (
          <LoreRow key={entry.id} title={entry.title} content={entry.content} kind={entry.kind} secret={entry.visibility === "ai_only"} always={entry.alwaysInclude} onSave={(partial) => updateLore(entry.id, partial)} onDelete={() => deleteLore(entry.id)} />
        ))
      ) : null}
      {segment === "faction" ? (
        <>
          {Object.entries(game.character.reputation).map(([faction, value]) => (
            <article key={faction} className="faction-card">
              <strong>{faction}</strong>
              <div className="bar"><span className="fill fill-xp" style={{ width: `${Math.min(100, Math.max(0, (value + 100) / 2))}%` }} /></div>
              <p className="meta">İtibar {value}</p>
            </article>
          ))}
          {factions.length === 0 && Object.keys(game.character.reputation).length === 0 ? <p className="empty-state">Bir gruba bağın yok.</p> : null}
          {factions.map((entry) => (
            <LoreRow key={entry.id} title={entry.title} content={entry.content} kind={entry.kind} secret={entry.visibility === "ai_only"} always={entry.alwaysInclude} onSave={(partial) => updateLore(entry.id, partial)} onDelete={() => deleteLore(entry.id)} />
          ))}
        </>
      ) : null}
      {segment === "journal" ? (
        <>
          {game.journal.length === 0 ? <p className="empty-state">Günlük boş.</p> : game.journal.map((entry) => <p key={entry.id} className="log-item">{entry.content}</p>)}
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kendine not" />
          <button onClick={() => { if (!note.trim()) return; commands([{ type: "journal_add", text: note.trim() }], "Günlük"); setNote(""); }}>Yaz</button>
        </>
      ) : null}
      {segment === "place" ? (
        <div className="stack">
          <p className="faint">Diğer notlar da burada durur. Her tur işaretli olanlar hakeme gider.</p>
          {other.map((entry) => (
            <LoreRow key={entry.id} title={entry.title} content={entry.content} kind={entry.kind} secret={entry.visibility === "ai_only"} always={entry.alwaysInclude} onSave={(partial) => updateLore(entry.id, partial)} onDelete={() => deleteLore(entry.id)} />
          ))}
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
      ) : null}
    </div>
  );
}

function NpcCard({ name, attitude, status, location, notes }: { name: string; attitude: number; status: "alive" | "dead" | "missing"; location: string; notes: string }) {
  const label = attitude <= -40 ? "Düşman" : attitude < -10 ? "Soğuk" : attitude <= 10 ? "Nötr" : attitude < 40 ? "Sıcak" : "Sadık";
  const state = status === "alive" ? "Yaşıyor" : status === "dead" ? "Ölü" : "Kayıp";
  return (
    <article className="npc-card">
      <div className="npc-portrait">{name.slice(0, 1).toLocaleUpperCase("tr")}</div>
      <div>
        <strong>{name}</strong>
        <span className={`status-badge status-${status}`}>{state}</span>
        <p className="meta">{location || "Yeri belirsiz"} · {label}</p>
        <div className="bar attitude-bar"><span style={{ width: `${(attitude + 100) / 2}%` }} /></div>
        {notes ? <p>{notes}</p> : null}
      </div>
    </article>
  );
}

function LoreRow({ title, content, kind, secret, always, onSave, onDelete }: { title: string; content: string; kind: LoreKind; secret: boolean; always: boolean; onSave: (partial: { content?: string }) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(content);
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
      ) : <p className="meta lore-preview">{content.slice(0, 140)}</p>}
    </article>
  );
}
