"use client";

import { FORKS } from "@/game/board";
import { ITEMS } from "@/game/items";
import { ItemIcon } from "./ItemIcon";
import { currentTeamId } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
import type { VerseMap } from "@/game/verses";
import { phaseHeadline, verseCard } from "./describe";
import { DieBadge } from "./DieBadge";
import { TeamAvatar } from "./TeamAvatar";

const TYPE_BG: Record<string, string> = {
  blue: "bg-sky-400 text-sky-950",
  red: "bg-rose-400 text-rose-950",
  event: "bg-emerald-400 text-emerald-950",
  item: "bg-violet-400 text-violet-950",
  happening: "bg-cyan-300 text-cyan-950",
  bless: "bg-pink-300 text-pink-950",
};

export function ActionCard({
  state,
  teamById,
  verses,
  size = "lg",
}: {
  state: GameState;
  teamById: Record<string, TeamInfo>;
  verses: VerseMap;
  size?: "lg" | "sm";
}) {
  const tid = currentTeamId(state);
  const team = tid ? teamById[tid] : undefined;
  const ctx = state.ctx;
  const big = size === "lg";
  if (!state.started || state.phase === "ended") return null;

  const verseSpace = state.phase === "recite" ? ctx.landed : state.phase === "star_recite" ? ctx.starAt : undefined;
  const card = verseSpace ? verseCard(state, verseSpace, verses) : null;

  return (
    <div className={`glass relative overflow-hidden ${big ? "p-5 pl-7" : "p-3 pl-5"}`}>
      <span className="absolute left-0 top-0 bottom-0 w-2" style={{ background: team?.color }} />
      <div className="flex items-center gap-3">
        <TeamAvatar team={team} size={big ? 52 : 36} />
        <div className={`font-display ${big ? "text-3xl" : "text-lg"} leading-tight`}>{phaseHeadline(state, teamById)}</div>
        {ctx.roll !== undefined && (
          <div className="ml-auto">
            <DieBadge value={ctx.roll} double={ctx.rollMode === "double"} big={big} />
          </div>
        )}
      </div>

      {state.phase === "shop_offer" && tid && (
        <div className={`mt-3 flex flex-wrap gap-2 ${big ? "text-lg" : "text-sm"}`}>
          {Object.values(ITEMS).map((d) => (
            <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 pl-1.5 pr-3 py-1">
              <ItemIcon id={d.id} size={22} /> {d.name} <b className="text-amber-300">{d.price} 달란트</b>
            </span>
          ))}
        </div>
      )}

      {state.phase === "choose_path" && tid && (
        <div className={`mt-3 grid grid-cols-2 gap-3 ${big ? "text-2xl" : "text-base"} font-display`}>
          {(FORKS[state.teams[tid].pos] ?? []).map((f, i) => (
            <div key={f.to} className={`rounded-2xl p-3 text-center border ${i === 0 ? "bg-sky-400/20 border-sky-300/40" : "bg-amber-400/20 border-amber-300/40"}`}>
              {f.label} {f.to}~
              <br />
              <span className={`text-base ${i === 0 ? "text-sky-200" : "text-amber-200"}`}>{f.desc}</span>
            </div>
          ))}
        </div>
      )}

      {state.phase === "recite" && ctx.happening && (
        <div className={`mt-3 rounded-2xl bg-cyan-300/20 border border-cyan-200/40 px-4 py-2 font-display animate-pop ${big ? "text-2xl" : "text-base"}`}>
          ❔ {ctx.happening.text}
        </div>
      )}
      {state.phase === "recite" && ctx.blessTo && (
        <div className={`mt-3 rounded-2xl bg-pink-300/20 border border-pink-200/40 px-4 py-2 font-display animate-pop ${big ? "text-2xl" : "text-base"}`}>
          🕊️ 축복! {teamById[ctx.blessTo]?.name} 팀에게 +5 달란트
        </div>
      )}

      {card && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`font-display ${big ? "text-5xl" : "text-2xl"}`}>{card.ref}</span>
            <span className={`rounded-full px-3 py-1 font-bold ${TYPE_BG[card.type]} ${big ? "text-base" : "text-xs"}`}>{card.typeLabel}</span>
            <span className={`rounded-full px-3 py-1 bg-white/10 border border-white/15 ${big ? "text-base" : "text-xs"}`}>{card.modeLabel}</span>
            {ctx.doubleTalentOn && state.phase === "recite" && <span className="rounded-full px-3 py-1 bg-amber-300 text-amber-950 font-bold">✖️2</span>}
            {ctx.hintUsed && <span className="rounded-full px-3 py-1 bg-yellow-200 text-yellow-900 font-bold">💡 힌트</span>}
          </div>
          {card.prompt && (
            <div className={`rounded-2xl bg-white/10 border border-white/15 p-3 ${big ? "text-3xl leading-relaxed" : "text-base"}`}>{card.prompt}</div>
          )}
        </div>
      )}

      {state.phase === "resolve" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {ctx.reciteResult ? (
            <span className={`font-display text-emerald-300 ${big ? "text-5xl" : "text-2xl"}`}>
              +{ctx.payout ?? 0} 달란트
            </span>
          ) : (
            <span className={`font-display text-white/50 ${big ? "text-4xl" : "text-xl"}`}>획득 없음</span>
          )}
          {ctx.gainedItem && ctx.gainedItem !== "full" && (
            <span className={`inline-flex items-center gap-2 rounded-2xl bg-violet-400/30 border border-violet-300/40 px-3 py-1 font-display ${big ? "text-2xl" : "text-base"}`}>
              <ItemIcon id={ctx.gainedItem} size={big ? 30 : 20} /> {ITEMS[ctx.gainedItem].name} 획득!
            </span>
          )}
          {ctx.starBought && <span className={`font-display text-yellow-300 ${big ? "text-3xl" : "text-lg"}`}>★ 스타 획득!</span>}
        </div>
      )}
    </div>
  );
}
