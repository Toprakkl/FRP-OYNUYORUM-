"use client";

import { useState } from "react";
import { honorTitle, nextGuildRank, OATHS, pathByName, rankCap, SKILLS, TREES, unlockPlan, type TalentTree } from "@/lib/veyra";
import { useGame } from "./GameApp";

function TreeBlock({ tree, off }: { tree: TalentTree; off?: boolean }) {
  const { game, commands } = useGame();
  if (!game) return null;
  const character = game.character;
  const nextId = tree.nodes.find((node) => !character.talents.includes(node.id))?.id;
  return (
    <div className="talent-tree">
      <h3>{tree.name}{off ? " · yol dışı" : ""}</h3>
      {tree.nodes.map((node) => {
        const owned = character.talents.includes(node.id);
        const plan = unlockPlan(character, node.id);
        const ready = node.id === nextId && !("error" in plan);
        return (
          <div key={node.id} className={`talent-node ${owned ? "owned" : ""}`}>
            <div>
              <strong>{node.name}</strong>
              <p className="faint">{node.text}</p>
            </div>
            {owned ? <span className="meta">Açık</span> : ready ? (
              <button onClick={() => commands([{ type: "talent_unlock", id: node.id }], "Yetenek")}>
                {plan.usePeak ? "Zirve" : `${plan.cost} YP`}
              </button>
            ) : node.id === nextId && "error" in plan ? <span className="faint">{plan.error}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function VeyraSheet({ compact = false }: { compact?: boolean }) {
  const { game, commands } = useGame();
  const [skill, setSkill] = useState(SKILLS[0].name);
  if (!game || game.settings.genre !== "veyra") return null;
  const character = game.character;
  const title = honorTitle(character.honor);
  const honorPct = Math.round(((character.honor + 100) / 200) * 100);
  const path = pathByName(character.className);
  const next = nextGuildRank(character.guildRank, character.level, character.guildPoints);
  const trees = [...TREES].sort((a, b) => Number(path?.trees.includes(b.id)) - Number(path?.trees.includes(a.id)));

  if (compact) {
    return (
      <div className="veyra-sheet">
        <p className="meta">Onur {character.honor > 0 ? `+${character.honor}` : character.honor} · {title.name} · Lonca {character.guildRank || "yok"}</p>
        <div className="honor-track" aria-hidden="true"><span style={{ width: `${honorPct}%` }} /></div>
      </div>
    );
  }

  return (
    <div className="veyra-sheet">
      <div className="honor-line">
        <div>
          <p className="meta">Onur {character.honor > 0 ? `+${character.honor}` : character.honor}</p>
          <strong>{title.name}</strong>
          <p className="faint">{title.note}</p>
        </div>
        <div className="honor-track" aria-hidden="true"><span style={{ width: `${honorPct}%` }} /></div>
      </div>
      <p className="meta">
        Lonca {character.guildRank || "üye değil"} · {character.guildPoints} puan
        {compact || !character.traits ? "" : ` · ${character.traits}`}
      </p>
      {next && !compact ? <button className="primary" onClick={() => commands([{ type: "guild_promote" }], "Lonca")}>{character.guildRank ? `${next} rütbesine geç` : "Serbest Kanat'a katıl"}</button> : null}
      {compact ? null : <p className="meta">Yetenek puanı {character.talentPoints}{character.peakGifts ? ` · Zirve hediyesi ${character.peakGifts}` : ""}{character.oath ? ` · ${character.oath}` : ""}</p>}
      {compact || character.oath ? null : (
        <div className="chips">
          {OATHS.map((oath) => (
            <button key={oath.name} className="chip" title={oath.text} onClick={() => commands([{ type: "oath_set", name: oath.name }], "Yemin")}>{oath.name}</button>
          ))}
        </div>
      )}
      {compact ? null : (
        <>
          <details>
            <summary>Yetenekler</summary>
            {trees.filter((tree) => path?.trees.includes(tree.id)).map((tree) => <TreeBlock key={tree.id} tree={tree} />)}
            <details>
              <summary>Diğer ağaçlar</summary>
              {trees.filter((tree) => !path?.trees.includes(tree.id)).map((tree) => <TreeBlock key={tree.id} tree={tree} off />)}
            </details>
          </details>
          <div className="section">
            <h3>Beceriler</h3>
            {character.skills.map((entry) => {
              const cap = rankCap(character.level);
              const cost = entry.level + 1;
              const can = entry.level < cap && character.talentPoints >= cost;
              return (
                <div key={entry.name} className="row">
                  <span>{entry.name} · rütbe {entry.level} · +{entry.level * 2}</span>
                  <button disabled={!can} onClick={() => commands([{ type: "skill_add", name: entry.name, level: entry.level + 1 }], "Beceri")}>+</button>
                </div>
              );
            })}
            <div className="row">
              <select value={skill} onChange={(event) => setSkill(event.target.value)}>
                {SKILLS.filter((entry) => !character.skills.some((known) => known.name === entry.name)).map((entry) => (
                  <option key={entry.name} value={entry.name}>{entry.name}</option>
                ))}
              </select>
              <button disabled={character.talentPoints < 1} onClick={() => commands([{ type: "skill_add", name: skill, level: 1 }], "Beceri")}>Öğren</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
