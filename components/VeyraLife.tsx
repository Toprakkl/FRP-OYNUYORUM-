"use client";

import { useState } from "react";
import type { Command } from "@/lib/commands";
import { rollD20 } from "@/lib/dice";
import { skillRankBonus } from "@/lib/veyra";
import {
  ADVISOR_ROLES,
  BUILDINGS,
  HOMES,
  HOME_COST,
  PROFESSIONS,
  SEASON_EVENTS,
  TIERS,
  WEATHERS,
  kingdomNet,
  professionRank,
  professionWeek,
  tierRequirement,
} from "@/lib/veyraLife";
import { useGame } from "./GameApp";

export function ProfessionPanel() {
  const { game, commands } = useGame();
  const [report, setReport] = useState("");
  if (!game || game.settings.genre !== "veyra") return <p className="empty-state">Bu masa Veyra değil.</p>;
  const character = game.character;
  const groups = [...new Set(PROFESSIONS.map((job) => job.group))];
  const homeName = HOMES[character.homeTier] || "Yok";
  const nextHome = character.homeTier < 5 ? character.homeTier + 1 : 0;
  const homeCost = nextHome ? HOME_COST[nextHome] : 0;

  function work(slot: "main" | "side") {
    const job = slot === "main" ? character.profession : character.sideProfession;
    const def = PROFESSIONS.find((entry) => entry.name === job?.name);
    if (!job || !def) return;
    const rank = professionRank(character.level, job.mp);
    const bonus = skillRankBonus(character.skills, def.skill) - character.fatigue;
    const natural = rollD20();
    const week = professionWeek(natural, bonus, def.silver, rank.mult);
    const list: Command[] = [
      { type: "time", delta_hours: 168 },
      { type: "fatigue", delta: 1 },
      { type: "journal_add", text: `${job.name} haftası: zar ${natural}${bonus >= 0 ? `+${bonus}` : bonus} = ${week.total}. ${week.gold ? `${week.gold} altın.` : "Ücret yok."} ${week.problem}` },
    ];
    if (week.gold) list.push({ type: "gold", delta: week.gold });
    if (week.mp) list.push({ type: "profession_mp", slot, delta: week.mp });
    commands(list, "Meslek haftası");
    setReport(`${job.name}: ${week.total} · ${week.gold ? `${week.gold} altın` : "ücret yok"}${week.problem ? `. ${week.problem}` : ""}`);
  }

  return (
    <div className="stack">
      <label className="field">
        Ana meslek
        <select value={character.profession?.name ?? ""} onChange={(event) => commands([{ type: "profession_set", slot: "main", name: event.target.value }], "Meslek")}>
          <option value="">Yok</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {PROFESSIONS.filter((job) => job.group === group).map((job) => <option key={job.name} value={job.name}>{job.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <JobLine slot="main" />
      <button data-testid="work-week" disabled={!character.profession} onClick={() => work("main")}>İşe git</button>
      {report ? <p data-testid="week-report">{report}</p> : null}
      <label className="field">
        Yan meslek
        <select value={character.sideProfession?.name ?? ""} disabled={character.homeTier < 3} onChange={(event) => commands([{ type: "profession_set", slot: "side", name: event.target.value }], "Yan meslek")}>
          <option value="">Yok</option>
          {PROFESSIONS.map((job) => <option key={job.name} value={job.name}>{job.name}</option>)}
        </select>
      </label>
      {character.homeTier < 3 ? <p className="faint">Yan meslek için ev kademesi gerek.</p> : <JobLine slot="side" />}
      {character.sideProfession ? <button onClick={() => work("side")}>Yan işe git</button> : null}
      <div className="section">
        <h3>Konut</h3>
        <p className="meta">{homeName} · Yorgunluk {character.fatigue}/5</p>
        {nextHome ? (
          <button data-testid="home-upgrade" disabled={character.gold < homeCost} onClick={() => commands([{ type: "home_set", tier: nextHome }], "Konut")}>
            {HOMES[nextHome]} · {homeCost} altın
          </button>
        ) : <p className="meta">Kale senin.</p>}
      </div>
      <label className="field">
        Hava
        <select value={game.weather || "Açık"} onChange={(event) => commands([{ type: "weather_set", name: event.target.value }], "Hava")}>
          {WEATHERS.map((weather) => <option key={weather}>{weather}</option>)}
        </select>
      </label>
      <p className="faint">Haftalık işi masa atar. Hikâye zarı hâlâ sahnededir.</p>
    </div>
  );
}

function JobLine({ slot }: { slot: "main" | "side" }) {
  const { game } = useGame();
  if (!game) return null;
  const job = slot === "main" ? game.character.profession : game.character.sideProfession;
  if (!job) return <p className="meta">Meslek seçilmedi.</p>;
  const def = PROFESSIONS.find((entry) => entry.name === job.name);
  const rank = professionRank(game.character.level, job.mp);
  const width = Math.min(100, Math.round((job.mp / Math.max(1, rank.need)) * 100));
  return (
    <div className="gauge">
      <p className="meta"><span>{rank.name}</span><span>{def ? `${def.silver} gümüş · ${def.skill}` : job.name}</span></p>
      <div className="bar" aria-label={`Meslek puanı ${job.mp}`}>
        <span className="fill fill-xp" style={{ width: `${width}%` }} />
      </div>
      <p className="faint">{job.mp}/{rank.need} puan{rank.next ? ` · sıradaki ${rank.next}` : ""} · çarpan ×{rank.mult}</p>
      {def ? <p className="faint">{def.note}</p> : null}
    </div>
  );
}

export function KingdomPanel() {
  const { game, commands } = useGame();
  const [name, setName] = useState("Karakol");
  const [advisorRole, setAdvisorRole] = useState(ADVISOR_ROLES[0].role);
  const [advisorName, setAdvisorName] = useState("");
  const [companion, setCompanion] = useState("");
  if (!game || game.settings.genre !== "veyra") return <p className="empty-state">Bu masa Veyra değil.</p>;
  const kingdom = game.kingdom;

  if (!kingdom) {
    return (
      <div className="stack">
        <p className="empty-state">Yerleşimin yok.</p>
        <p className="faint">200 altın bir karakol kurar. Köyden krallığa giden yol bir sezonda bitmez.</p>
        <label className="field">
          Ad
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button data-testid="found-settlement" disabled={game.character.gold < 200 || !name.trim()} onClick={() => commands([{ type: "kingdom_found", name: name.trim() }], "Yerleşim")}>
          Yerleşim kur · 200 altın
        </button>
        <CompanionList companion={companion} setCompanion={setCompanion} />
      </div>
    );
  }

  const net = kingdomNet(kingdom);
  const event = SEASON_EVENTS.find((entry) => entry.roll === kingdom.pendingEvent);
  const gate = tierRequirement(kingdom, game.character.level);
  const gauges: [string, number][] = [
    ["Halk", kingdom.people],
    ["İstikrar", kingdom.stability],
    ["Nüfuz", kingdom.influence],
    ["Meşruiyet", kingdom.legitimacy],
  ];

  return (
    <div className="stack">
      <div>
        <h3>{kingdom.name}</h3>
        <p className="meta">{TIERS[kingdom.tier] ?? "Yerleşim"} · Nüfus {kingdom.population} · Ordu {kingdom.army}</p>
        <p className="meta">Hazine {kingdom.treasury} · sezon {net.income} − {net.expense} = {net.net}</p>
      </div>
      {gauges.map(([label, value]) => (
        <div key={label} className="gauge">
          <p className="meta"><span>{label}</span><span>{value}</span></p>
          <div className="bar"><span className="fill fill-xp" style={{ width: `${value}%` }} /></div>
        </div>
      ))}
      {event ? (
        <div className="decision-card" data-testid="decision-card">
          <strong>Zar {event.roll} · {event.name}</strong>
          <p>{event.text}</p>
          {event.choices.map((choice, index) => (
            <button key={choice.label} className="choice" data-testid={`season-choice-${index}`} onClick={() => commands([{ type: "kingdom_choice", index: index as 0 | 1 }], "Karar")}>
              {choice.label}
              <span className="meta"> {choice.note}</span>
            </button>
          ))}
        </div>
      ) : (
        <button data-testid="season-turn" onClick={() => commands([{ type: "season_advance", event: rollD20() }], "Yönetim turu")}>Yönetim turu</button>
      )}
      {gate ? (
        <button disabled={!gate.ok} onClick={() => commands([{ type: "kingdom_upgrade" }], "Kademe")}>
          {gate.ok ? `${TIERS[gate.next]} açık` : gate.reason}
        </button>
      ) : null}
      <div className="section">
        <h3>Yapılar</h3>
        {kingdom.buildings.length ? <p className="meta">{kingdom.buildings.join(" · ")}</p> : <p className="faint">Henüz yapı yok.</p>}
        {BUILDINGS.filter((building) => !kingdom.buildings.includes(building.name)).map((building) => (
          <button key={building.name} disabled={kingdom.treasury < building.cost} onClick={() => commands([{ type: "building_add", name: building.name }], "Yapı")}>
            {building.name} · {building.cost} · {building.effect}
          </button>
        ))}
      </div>
      <div className="section">
        <h3>Danışman</h3>
        {kingdom.advisors.map((advisor) => <p key={advisor.role} className="meta">{advisor.role} · {advisor.name} · sadakat {advisor.loyalty}</p>)}
        <label className="field">
          Rol
          <select value={advisorRole} onChange={(event) => setAdvisorRole(event.target.value)}>
            {ADVISOR_ROLES.map((advisor) => <option key={advisor.role} value={advisor.role}>{advisor.role} · {advisor.effect}</option>)}
          </select>
        </label>
        <label className="field">
          Ad
          <input value={advisorName} onChange={(event) => setAdvisorName(event.target.value)} />
        </label>
        <button disabled={!advisorName.trim()} onClick={() => { commands([{ type: "advisor_set", role: advisorRole, name: advisorName.trim() }], "Danışman"); setAdvisorName(""); }}>Danışman ata</button>
      </div>
      <CompanionList companion={companion} setCompanion={setCompanion} />
    </div>
  );
}

function CompanionList({ companion, setCompanion }: { companion: string; setCompanion: (value: string) => void }) {
  const { game, commands } = useGame();
  if (!game) return null;
  return (
    <div className="section">
      <h3>Yoldaş</h3>
      {game.companions.length === 0 ? <p className="faint">En fazla üç yoldaş.</p> : null}
      {game.companions.map((entry) => (
        <div key={entry.id} className="gauge">
          <p className="meta"><span>{entry.name}</span><span>{entry.loyalty}</span></p>
          <div className="bar"><span className="fill fill-xp" style={{ width: `${entry.loyalty}%` }} /></div>
        </div>
      ))}
      <label className="field">
        Yeni yoldaş
        <input value={companion} onChange={(event) => setCompanion(event.target.value)} />
      </label>
      <button disabled={!companion.trim() || game.companions.length >= 3} onClick={() => { commands([{ type: "companion_touch", name: companion.trim(), delta: 0 }], "Yoldaş"); setCompanion(""); }}>Yanına al</button>
    </div>
  );
}
