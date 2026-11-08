"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Board } from "@/components/Board";
import { Scoreboard } from "@/components/Scoreboard";
import { ActionCard } from "@/components/ActionCard";
import { FeedToasts } from "@/components/FeedToasts";
import { Ceremony } from "@/components/Ceremony";
import { isBoost } from "@/game/reducer";
import { useGame } from "@/lib/useGame";
import type { Settings } from "@/game/types";

export default function DisplayPage() {
  const game = useGame();
  const { state, teamById, teams } = game;
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => setJoinUrl(`${window.location.origin}/join${window.location.search}`), []);

  const boost = state.started && state.phase !== "ended" && isBoost(state);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,#6ec6ff_0%,#3a8fe0_55%,#2a62b8_100%)] flex flex-col p-4 gap-3 text-slate-800">
      <header className="flex items-center gap-4 shrink-0">
        <h1 className="font-display text-4xl text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)] tracking-wide">⭐ 로마서 8장 암송 파티</h1>
        {state.started && state.phase !== "ended" && (
          <div className="font-display text-3xl rounded-full bg-white/95 px-5 py-1 shadow-md">
            <span className="text-sky-600">{state.turn}</span>
            <span className="text-slate-400"> / {state.settings.totalTurns} 턴</span>
          </div>
        )}
        {boost && (
          <div className="font-display text-3xl rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white px-5 py-1 shadow-md animate-pulse">🔥 달란트 2배!</div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {game.backend?.mode === "local" && <span className="rounded-full bg-yellow-200 px-3 py-1 text-sm shadow">로컬 데모</span>}
          {joinUrl && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-2 pr-4 shadow-md">
              <QRCodeSVG value={joinUrl} size={64} />
              <div className="font-display text-lg leading-tight text-slate-700">
                폰으로
                <br />
                참가하기
              </div>
            </div>
          )}
        </div>
      </header>

      {game.error && <div className="rounded-xl bg-red-100 text-red-800 px-4 py-2">연결 오류: {game.error}</div>}

      {state.phase === "ended" ? (
        <div className="flex-1 min-h-0">
          <Ceremony state={state} teamById={teamById} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px] gap-4">
          <section className="min-h-0 flex flex-col gap-3">
            <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden">
              <Board state={state} teamById={teamById} />
              <div className="absolute top-3 left-4 flex justify-start">
                <FeedToasts state={state} teamById={teamById} />
              </div>
            </div>
            <div className="shrink-0">
              <ActionCard state={state} teamById={teamById} />
            </div>
          </section>
          <aside className="min-h-0 overflow-auto flex flex-col gap-3">
            {state.started ? (
              <Scoreboard state={state} teamById={teamById} />
            ) : (
              <div className="rounded-3xl bg-white/95 p-5 shadow-md">
                <div className="font-display text-3xl mb-3">참가 팀</div>
                <ul className="flex flex-col gap-2">
                  {teams.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 font-display text-2xl" style={{ color: t.color }}>
                      ● {t.name}
                      <span className="ml-auto text-lg text-slate-500">{game.members.filter((m) => m.team_id === t.id).length}명</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Legend settings={state.settings} />
          </aside>
        </div>
      )}

      {state.paused && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="font-display text-7xl text-white">잠시만요… ⏸</div>
        </div>
      )}
    </main>
  );
}

function Legend({ settings }: { settings: Settings }) {
  const r = settings.rewards;
  const items = [
    ["bg-blue-500", `파란 칸 +${r.blue}`],
    ["bg-red-500", `빨간 칸 +${r.red} 어려움`],
    ["bg-green-500", `이벤트 칸 +${r.event}`],
    ["bg-purple-500", `아이템 칸 +${r.item} 🎁`],
  ];
  return (
    <div className="rounded-3xl bg-white/90 p-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[15px] shadow-md">
      {items.map(([c, l]) => (
        <div key={l} className="flex items-center gap-2">
          <span className={`inline-block w-4 h-4 rounded-full ${c} ring-2 ring-white shadow`} />
          {l}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-base">⭐</span> 지나가며 구매 {settings.starPrice}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base">🏪</span> 출발점 지나며 상점
      </div>
    </div>
  );
}
