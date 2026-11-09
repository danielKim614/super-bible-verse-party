"use client";

import { ITEMS } from "@/game/items";
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
        return (
          <li
            key={r.id}
            className={`flex items-center gap-3 rounded-2xl px-3 ${compact ? "py-1.5" : "py-2.5"} bg-white/95 shadow-md border-[3px] transition-all ${
              isCur ? "scale-[1.03] border-yellow-300 shadow-[0_0_0_4px_rgba(253,224,71,0.35)]" : highlightTeam === r.id ? "border-sky-300" : "border-white"
            }`}
          >
            <span className={`font-display ${compact ? "text-lg w-6" : "text-2xl w-8"} text-center ${r.rank === 1 ? "text-amber-500" : "text-slate-400"}`}>{r.rank}</span>
            <TeamAvatar team={t} size={compact ? 34 : 46} />
            <div className="min-w-0 flex-1">
              <div className={`font-display truncate ${compact ? "text-base" : "text-xl"}`} style={{ color: t?.color }}>
                {t?.name ?? "?"}
              </div>
              {!compact && ts.items.length > 0 && <div className="text-sm truncate">{ts.items.map((i) => ITEMS[i].icon).join(" ")}</div>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`font-display ${compact ? "text-lg" : "text-2xl"}`}>⭐{stars}</span>
              <span className={`font-display ${compact ? "text-lg" : "text-2xl"} text-amber-600`}>🪙{ts.talents}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
