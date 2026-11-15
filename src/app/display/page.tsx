"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Board } from "@/components/Board";
import { Scoreboard } from "@/components/Scoreboard";
import { ActionCard } from "@/components/ActionCard";
import { FeedToasts } from "@/components/FeedToasts";
import { Ceremony } from "@/components/Ceremony";
import { TeamAvatar } from "@/components/TeamAvatar";
import { HelpButton } from "@/components/HelpOverlay";
import { boostReason } from "@/game/reducer";
import { StartIntro } from "@/components/StartIntro";
import { useGame } from "@/lib/useGame";

export default function DisplayPage() {
  const game = useGame();
  const { state, teamById, teams } = game;
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => setJoinUrl(`${window.location.origin}/${window.location.search}`), []);

  const [revealing, setRevealing] = useState(false);
  const onRevealChange = useCallback((v: boolean) => setRevealing(v), []);
  const boost = state.started && state.phase !== "ended" ? boostReason(state) : null;

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0b1033] text-white flex flex-col px-4 pt-2.5 pb-4 gap-2.5">
      <header className="flex items-center gap-3 shrink-0 h-10">
        <h1 className="font-display text-2xl tracking-wide whitespace-nowrap">
          <span className="text-yellow-300">★</span> 2026 더드림 성경 암송 파티
        </h1>
        {state.started && state.phase !== "ended" && (
          <RoundBadge turn={state.turn} total={state.settings.totalTurns} />
        )}
        {boost && (
          <div className="font-display text-lg whitespace-nowrap rounded-full bg-gradient-to-r from-rose-500 to-amber-400 px-4 py-0.5 shadow-[0_0_24px_rgba(251,113,133,0.6)] animate-pulse">
            {boost === "golden" ? "황금 라운드 · 보상 2배" : boost === "final" ? "마지막 스퍼트 · 보상 2배" : "보상 2배"}
          </div>
        )}
        <div className="flex-1 min-w-0 relative self-stretch">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 z-30">
            <FeedToasts state={state} teamById={teamById} hold={revealing} />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {game.backend?.mode === "local" && <span className="rounded-full bg-yellow-300/90 text-slate-900 px-3 py-1 text-sm">데모</span>}
          <HelpButton settings={state.settings} className="w-9 h-9 text-xl" />
          {joinUrl && (
            <div className="flex items-center gap-1.5 rounded-xl bg-white p-1 pr-2.5 shadow-lg">
              <QRCodeSVG value={joinUrl} size={34} />
              <div className="font-display text-sm text-slate-700">참가</div>
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
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_290px] gap-3">
          <section className="min-h-0 flex flex-col gap-3">
            <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-[36px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10">
              <Board state={state} teamById={teamById} onRevealChange={onRevealChange} />
            </div>
            <div className="shrink-0">
              <ActionCard state={state} teamById={teamById} verses={game.verses} hideHappening={revealing} />
            </div>
          </section>
          <aside className="min-h-0 overflow-auto flex flex-col gap-3">
            {state.started ? (
              <Scoreboard state={state} teamById={teamById} />
            ) : (
              <ul className="flex flex-col gap-2">
                {teams.map((t) => (
                  <li key={t.id} className="glass flex items-center gap-2.5 px-3 py-2">
                    <TeamAvatar team={t} size={40} />
                    <span className="font-display text-xl truncate min-w-0" style={{ color: t.color }}>
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

      <StartIntro state={state} teamById={teamById} />
      {state.paused && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="font-display text-7xl text-white">잠시만요 ⏸</div>
        </div>
      )}
    </main>
  );
}

/** 라운드 표시: "ROUND 5" + 전체 라운드만큼 점(지난 라운드는 채움). 마지막 라운드는 "LAST ROUND" */
function RoundBadge({ turn, total }: { turn: number; total: number }) {
  const last = turn >= total;
  return (
    <div className={`glass flex items-center gap-2.5 px-3.5 py-1 whitespace-nowrap ${last ? "ring-2 ring-rose-400/70" : ""}`} title={`전체 ${total}라운드 중 ${turn}라운드`}>
      <span className={`font-display text-sm tracking-[0.15em] ${last ? "text-rose-300" : "text-white/60"}`}>{last ? "LAST ROUND" : "ROUND"}</span>
      <span className="font-display text-2xl leading-none text-yellow-300">{turn}</span>
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`block rounded-full ${i + 1 === turn ? "w-2.5 h-2.5 bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.9)]" : i + 1 < turn ? "w-2 h-2 bg-yellow-300/60" : "w-2 h-2 bg-white/20"}`}
          />
        ))}
      </span>
    </div>
  );
}
