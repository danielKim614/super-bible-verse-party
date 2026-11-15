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

  // 보드가 다 보여 준 상태. 보드 연출(주사위·이동·스타·파이프·공개)이 끝나기 전엔 상황판·알림·순위표가 먼저 반응하지 않는다
  const [presented, setPresented] = useState(state);
  const onPresented = useCallback((s: typeof state) => setPresented(s), []);
  const usable = presented.started === state.started && presented.teamIds.length === state.teamIds.length;
  const shownState = usable ? presented : state;
  const holding = usable && presented.lastSeq !== state.lastSeq;
  // 새 상태에 말 이동이 있으면 "이동 중", 아니면(공개 연출 대기) 직전 상태를 그대로
  const moving = holding && presented.moveSeq !== state.moveSeq;
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
            <FeedToasts state={state} teamById={teamById} hold={holding} />
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
              <Board state={state} teamById={teamById} onPresented={onPresented} />
            </div>
            <div className="shrink-0">
              <ActionCard state={moving ? state : shownState} teamById={teamById} verses={game.verses} moving={moving} />
            </div>
          </section>
          <aside className="min-h-0 overflow-auto flex flex-col gap-3">
            {state.started ? (
              <Scoreboard state={shownState} teamById={teamById} />
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

/** 라운드 표시: 참가자 폰과 같은 "ROUND 7/8" (마지막 라운드는 "LAST ROUND") */
function RoundBadge({ turn, total }: { turn: number; total: number }) {
  const last = turn >= total;
  return (
    <div className={`glass flex items-baseline gap-1.5 px-3.5 py-1 whitespace-nowrap font-display ${last ? "ring-2 ring-rose-400/70" : ""}`}>
      <span className={`text-sm tracking-wider ${last ? "text-rose-300" : "text-white/60"}`}>{last ? "LAST ROUND" : "ROUND"}</span>
      <span className="text-2xl leading-none text-yellow-300">{turn}</span>
      <span className="text-base text-white/50">/{total}</span>
    </div>
  );
}
