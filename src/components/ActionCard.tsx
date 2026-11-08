"use client";

import { ITEMS } from "@/game/items";
import { currentTeamId, payoutText } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
import { phaseHeadline, roadName, verseCard } from "./describe";
import { TeamAvatar } from "./TeamAvatar";

const TYPE_BG: Record<string, string> = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  event: "bg-green-500",
  item: "bg-purple-500",
  shop: "bg-orange-400",
};

export function ActionCard({
  state,
  teamById,
  size = "lg",
}: {
  state: GameState;
  teamById: Record<string, TeamInfo>;
  size?: "lg" | "sm";
}) {
  const tid = currentTeamId(state);
  const team = tid ? teamById[tid] : undefined;
  const ctx = state.ctx;
  const big = size === "lg";
  if (!state.started || state.phase === "ended") return null;

  const verseSpace = state.phase === "recite" ? ctx.landed : state.phase === "star_recite" ? ctx.starAt : undefined;
  const card = verseSpace ? verseCard(state, verseSpace) : null;

  return (
    <div className={`rounded-3xl bg-white/95 shadow-[0_10px_30px_rgba(0,0,0,0.2)] border-l-[10px] ${big ? "p-5" : "p-3"}`} style={{ borderColor: team?.color }}>
      <div className="flex items-center gap-3">
        <TeamAvatar team={team} size={big ? 56 : 38} />
        <div className={`font-display ${big ? "text-3xl" : "text-lg"} leading-tight`}>{phaseHeadline(state, teamById)}</div>
        {ctx.roll !== undefined && (
          <div className={`ml-auto font-display ${big ? "text-4xl" : "text-xl"} bg-gradient-to-br from-slate-800 to-slate-600 text-white rounded-2xl px-4 py-1 shadow-md`}>🎲 {ctx.roll}</div>
        )}
      </div>

      {state.phase === "choose_path" && (
        <div className={`mt-3 grid grid-cols-2 gap-3 ${big ? "text-2xl" : "text-base"} font-display`}>
          <div className="rounded-2xl bg-stone-200 p-3 text-center">가운데 길 · 탄식과 소망 (18~25)<br /><span className="text-base text-stone-600">짧지만 어려움</span></div>
          <div className="rounded-2xl bg-sky-100 p-3 text-center">왼쪽 길 · 성령의 간구 (26~39)<br /><span className="text-base text-sky-700">길지만 보상 많음</span></div>
        </div>
      )}

      {card && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-display ${big ? "text-5xl" : "text-2xl"}`}>{card.ref}</span>
            <span className={`rounded-full px-3 py-1 text-white font-bold ${TYPE_BG[card.type]} ${big ? "text-lg" : "text-xs"}`}>{card.typeLabel}</span>
            <span className={`rounded-full px-3 py-1 bg-slate-100 ${big ? "text-lg" : "text-xs"}`}>{roadName(card.space)}</span>
            {ctx.doubleTalentOn && state.phase === "recite" && <span className="rounded-full px-3 py-1 bg-amber-300 font-bold">✖️2 달란트</span>}
            {ctx.hintUsed && <span className="rounded-full px-3 py-1 bg-yellow-200 font-bold">💡 힌트 사용</span>}
          </div>
          <div className={`${big ? "text-2xl" : "text-sm"} text-slate-600`}>암송 방식: <b>{card.modeLabel}</b></div>
          {card.prompt && (
            <div className={`rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 ${big ? "text-3xl leading-relaxed" : "text-base"}`}>{card.prompt}</div>
          )}
        </div>
      )}

      {state.phase === "resolve" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {ctx.reciteResult ? (
            <span className={`font-display text-green-600 ${big ? "text-5xl" : "text-2xl"}`}>
              +{ctx.payout ?? 0} 달란트 <span className={`${big ? "text-2xl" : "text-sm"} text-slate-500`}>({payoutText(ctx.payout ?? 0)})</span>
            </span>
          ) : (
            <span className={`font-display text-slate-500 ${big ? "text-4xl" : "text-xl"}`}>획득 없음</span>
          )}
          {ctx.gainedItem && ctx.gainedItem !== "full" && (
            <span className={`rounded-2xl bg-purple-100 px-3 py-1 font-display ${big ? "text-2xl" : "text-base"}`}>
              🎁 {ITEMS[ctx.gainedItem].name}
            </span>
          )}
          {ctx.starBought && <span className={`font-display ${big ? "text-3xl" : "text-lg"}`}>⭐ 스타 획득!</span>}
        </div>
      )}
    </div>
  );
}
