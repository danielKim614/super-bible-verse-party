"use client";

import { ITEMS } from "@/game/items";
import { ItemIcon } from "./ItemIcon";
import { currentTeamId, finalRanking } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

export function Scoreboard({
  state,
  teamById,
  highlightTeam,
  compact = false,
  hideBonus = true,
}: {
  state: GameState;
  teamById: Record<string, TeamInfo>;
  highlightTeam?: string;
  compact?: boolean;
  hideBonus?: boolean;
}) {
  const ranking = finalRanking(state);
  const cur = currentTeamId(state);
  return (
    <ol className="flex flex-col gap-2">
      {ranking.map((r) => {
        const t = teamById[r.id];
        const ts = state.teams[r.id];
        const stars = hideBonus && state.phase !== "ended" ? ts.stars : ts.stars + ts.bonusStars;
        const isCur = r.id === cur && state.phase !== "ended";
        const isMine = highlightTeam === r.id;
        return (
          <li
            key={r.id}
            className={`glass relative flex items-center gap-3 px-3 ${compact ? "py-1.5" : "py-2.5"} transition-all overflow-hidden ${
              isCur ? "scale-[1.02] ring-2 ring-yellow-300/80 shadow-[0_0_24px_rgba(253,224,71,0.35)]" : isMine ? "ring-2 ring-sky-300/70" : ""
            }`}
          >
            <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: t?.color }} />
            <span className={`font-display ${compact ? "text-lg w-6" : "text-2xl w-8"} text-center ${r.rank === 1 ? "text-yellow-300" : "text-white/40"}`}>{r.rank}</span>
            <TeamAvatar team={t} size={compact ? 34 : 44} />
            <div className="min-w-0 flex-1">
              <div className={`font-display truncate ${compact ? "text-base" : "text-xl"}`}>{t?.name ?? "?"}</div>
              {!compact && ts.items.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {ts.items.map((i, k) => (
                    <span key={k} title={ITEMS[i].name} className="inline-flex w-7 h-7 rounded-lg bg-white/15 items-center justify-center">
                      <ItemIcon id={i} size={18} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0 font-display">
              <span className={`${compact ? "text-lg" : "text-2xl"} text-yellow-300`}>★{stars}</span>
              <span className={`${compact ? "text-lg" : "text-2xl"} text-amber-200`}>
                <span className="text-sm align-middle opacity-70">달란트</span> {ts.talents}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
