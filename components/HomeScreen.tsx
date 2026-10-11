"use client";

import { useEffect, useRef } from "react";
import { formatWorldTime } from "@/lib/format";
import { Crest, useGame } from "./GameApp";

export function HomeScreen() {
  const { games, setScreen, open, remove, branch, exportGame, importGame, error, clearError, setPreviewTheme } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setPreviewTheme("orta_cag"), [setPreviewTheme]);
  const ordered = [...games].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="home">
      <Crest />
      <h1>FRP Masası</h1>
      <p className="lede">Zar sende. Hikâye oyun yöneticisinde. Canın, altının ve eşyan masada kalır.</p>
      <div className="row">
        <button className="primary" data-testid="new-game" onClick={() => setScreen("new")}>Yeni macera</button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>Kayıt yükle</button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importGame(file);
          }}
        />
      </div>
      {error ? <div className="toast">{error} <button onClick={clearError}>Kapat</button></div> : null}
      <div className="stack" style={{ marginTop: 18 }}>
        {ordered.length === 0 ? <p className="faint">Henüz masa yok. Külkapı'da bir han kapısı seni bekliyor.</p> : null}
        {ordered.map((game) => (
          <article className="card" key={game.id}>
            <h2>{game.title}</h2>
            <p className="meta">
              {game.character.name} · Sv {game.character.level} · {game.location} · {formatWorldTime(game.worldTime)}
            </p>
            <div className="card-actions">
              <button className="primary" onClick={() => open(game.id)}>Devam et</button>
              <button onClick={() => branch(game.id)}>Dallan</button>
              <button onClick={() => exportGame(game.id)}>Dışa aktar</button>
              <button className="danger" onClick={() => remove(game.id)}>Sil</button>
            </div>
          </article>
        ))}
      </div>
      <div className="advice">
        <p>
          Gemini Pro sohbet aboneliği bu masaya bağlanmaz. Hakem, Google AI Studio API anahtarıyla konuşur.
          Anahtarın yoksa yerel anlatıcı yine sahneyi taşır; anahtarı ayarlardan yapıştırınca oyun yöneticisi değişir.
        </p>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">API anahtarı al</a>
      </div>
    </div>
  );
}
