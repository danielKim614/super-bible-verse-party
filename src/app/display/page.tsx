"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Board } from "@/components/Board";
import { Scoreboard } from "@/components/Scoreboard";
import { ActionCard } from "@/components/ActionCard";
import { FeedToasts } from "@/components/FeedToasts";
import { Ceremony } from "@/components/Ceremony";
import { TeamAvatar } from "@/components/TeamAvatar";
import { isBoost } from "@/game/reducer";
import { useGame } from "@/lib/useGame";

export default function DisplayPage() {
  const game = useGame();
  const { state, teamById, teams } = game;
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => setJoinUrl(`${window.location.origin}/join${window.location.search}`), []);

  const boost = state.started && state.phase !== "ended" && isBoost(state);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0b1033] text-white flex flex-col p-5 gap-4">
      <header className="flex items-center gap-4 shrink-0">
        <h1 className="font-display text-4xl tracking-wide">
          <span className="text-yellow-300">★</span> 로마서 8장 암송 파티
        </h1>
        {state.started && state.phase !== "ended" && (
          <div className="glass font-display text-2xl px-5 py-1.5">
            <span className="text-yellow-300">{state.turn}</span>
            <span className="text-white/50"> / {state.settings.totalTurns}</span>
          </div>
        )}
        {boost && (
          <div className="font-display text-2xl rounded-full bg-gradient-to-r from-rose-500 to-amber-400 px-5 py-1.5 shadow-[0_0_24px_rgba(251,113,133,0.6)] animate-pulse">
            달란트 2배
          </div>
        )}
        <div className="flex-1 min-w-0 flex justify-center">
          <FeedToasts state={state} teamById={teamById} />
        </div>
        <div className="flex items-center gap-3">
          {game.backend?.mode === "local" && <span className="rounded-full bg-yellow-300/90 text-slate-900 px-3 py-1 text-sm">데모</span>}
          {joinUrl && (
            <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 pr-3 shadow-lg">
              <QRCodeSVG value={joinUrl} size={52} />
              <div className="font-display text-base text-slate-700">참가</div>
            </div>
          )}
        </div>
      </header>

      {game.error && <div className="rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-2">연결 오류: {game.error}</div>}

      {state.phase === "ended" ? (
        <div className="flex-1 min-h-0">
          <Ceremony state={state} teamById={teamById} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_380px] gap-4">
          <section className="min-h-0 flex flex-col gap-4">
            <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-[36px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10">
              <Board state={state} teamById={teamById} />
            </div>
            <div className="shrink-0">
              <ActionCard state={state} teamById={teamById} />
            </div>
          </section>
          <aside className="min-h-0 overflow-auto flex flex-col gap-3">
            {state.started ? (
              <Scoreboard state={state} teamById={teamById} />
            ) : (
              <ul className="flex flex-col gap-2">
                {teams.map((t) => (
                  <li key={t.id} className="glass flex items-center gap-3 px-3 py-2">
                    <TeamAvatar team={t} size={44} />
                    <span className="font-display text-2xl" style={{ color: t.color }}>
                      {t.name}
                    </span>
                    <span className="ml-auto font-display text-xl text-white/50">{game.members.filter((m) => m.team_id === t.id).length}</span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      {state.paused && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="font-display text-7xl text-white">잠시만요 ⏸</div>
        </div>
      )}
    </main>
  );
}
