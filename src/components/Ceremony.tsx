"use client";

import { finalRanking } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

export function Ceremony({ state, teamById, big = true }: { state: GameState; teamById: Record<string, TeamInfo>; big?: boolean }) {
  const c = state.ceremony;
  if (state.phase !== "ended" || !c) return null;
  const awardsShown = c.awards.slice(0, Math.min(c.step, c.awards.length));
  const showFinal = c.step > c.awards.length;
  const ranking = finalRanking(state);
  const refunds = Object.entries(c.refunds).filter(([, v]) => v > 0);

  return (
    <div className={`w-full h-full overflow-auto rounded-3xl bg-[radial-gradient(ellipse_at_top,#2b3a8f_0%,#141b4d_60%,#0a0f2e_100%)] ring-1 ring-white/10 text-white ${big ? "p-10" : "p-4"}`}>
      <h2 className={`font-display text-center text-yellow-300 ${big ? "text-6xl mb-8" : "text-3xl mb-4"}`}>🏆 시상식</h2>

      {c.step === 0 && (
        <div className="text-center">
          <p className={`${big ? "text-3xl" : "text-lg"} mb-4`}>남은 아이템은 1개당 {state.settings.itemRefund}달란트로 환급됩니다</p>
          <div className="flex flex-wrap justify-center gap-4">
            {refunds.length === 0 && <p className="opacity-70">환급할 아이템이 없어요</p>}
            {refunds.map(([id, v]) => (
              <div key={id} className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
                <TeamAvatar team={teamById[id]} size={big ? 48 : 28} />
                <span className={`font-display ${big ? "text-3xl" : "text-lg"}`}>+{v}🪙</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-4 ${showFinal ? "hidden" : ""}`}>
        {awardsShown.map((a) => (
          <div key={a.key} className="animate-pop rounded-3xl bg-white/10 p-4">
            <div className={`font-display ${big ? "text-4xl" : "text-xl"} text-yellow-300`}>⭐ {a.title}</div>
            <div className={`${big ? "text-xl" : "text-sm"} opacity-80`}>{a.desc}</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {a.winners.length === 0 && <span className="opacity-70">해당 팀 없음</span>}
              {a.winners.map((w) => (
                <div key={w} className="flex items-center gap-2 rounded-2xl bg-yellow-300 text-indigo-900 px-4 py-2">
                  <TeamAvatar team={teamById[w]} size={big ? 52 : 30} />
                  <span className={`font-display ${big ? "text-3xl" : "text-lg"}`}>
                    {teamById[w]?.name} ({a.values[w]})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showFinal && (
        <div className="mt-8">
          <h3 className={`font-display text-center ${big ? "text-5xl mb-3" : "text-2xl mb-2"}`}>최종 순위</h3>
          <p className={`text-center opacity-80 ${big ? "text-xl mb-6" : "text-sm mb-3"}`}>
            보너스 스타 포함 ·{" "}
            {c.awards.map((a) => `${a.title}: ${a.winners.map((w) => teamById[w]?.name).join(", ") || "없음"}`).join(" / ")}
          </p>
          <ol className="flex flex-col gap-3 max-w-3xl mx-auto">
            {ranking.map((r) => (
              <li
                key={r.id}
                className={`animate-pop flex items-center gap-4 rounded-3xl px-5 py-3 ${r.rank === 1 ? "bg-yellow-300 text-indigo-900 scale-105" : "bg-white/10"}`}
              >
                <span className={`font-display ${big ? "text-5xl w-14" : "text-2xl w-8"}`}>{r.rank === 1 ? "👑" : r.rank}</span>
                <TeamAvatar team={teamById[r.id]} size={big ? 64 : 36} />
                <span className={`font-display flex-1 ${big ? "text-4xl" : "text-xl"}`}>{teamById[r.id]?.name}</span>
                <span className={`font-display ${big ? "text-4xl" : "text-xl"}`}>⭐{r.stars}</span>
                <span className={`font-display ${big ? "text-3xl" : "text-lg"} opacity-80`}>🪙{r.talents}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
