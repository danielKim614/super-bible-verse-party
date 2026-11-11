"use client";

import { ITEMS } from "@/game/items";
import { ItemIcon } from "./ItemIcon";
import { currentTeamId, finalRanking } from "@/game/reducer";
import { useState } from "react";
import type { GameState, MemberInfo, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

export function Scoreboard({
  state,
  teamById,
  highlightTeam,
  compact = false,
  hideBonus = true,
  members,
}: {
  state: GameState;
  teamById: Record<string, TeamInfo>;
  highlightTeam?: string;
  compact?: boolean;
  hideBonus?: boolean;
  /** 주면 팀을 눌러 멤버 목록을 펼쳐 볼 수 있다 (참가자 화면) */
  members?: MemberInfo[];
}) {
  const [open, setOpen] = useState<string | null>(null);
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
            className={`glass relative overflow-hidden transition-all ${
              isCur ? "scale-[1.02] ring-2 ring-yellow-300/80 shadow-[0_0_24px_rgba(253,224,71,0.35)]" : isMine ? "ring-2 ring-sky-300/70" : ""
            }`}
          >
            <div
              className={`relative flex items-center gap-3 px-3 ${compact ? "py-1.5" : "py-2.5"} ${members ? "cursor-pointer select-none" : ""}`}
              role={members ? "button" : undefined}
              aria-expanded={members ? open === r.id : undefined}
              onClick={members ? () => setOpen((o) => (o === r.id ? null : r.id)) : undefined}
            >
            <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: t?.color }} />
            <span className={`font-display ${compact ? "text-lg w-6" : "text-2xl w-8"} text-center ${r.rank === 1 ? "text-yellow-300" : "text-white/40"}`}>{r.rank}</span>
            <TeamAvatar team={t} size={compact ? 34 : 44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`font-display truncate ${compact ? "text-base" : "text-xl"}`}>{t?.name ?? "?"}</span>
                {/* 폰(축약)에서는 이름 옆에 작은 아이콘으로 보유 아이템 표시 */}
                {compact &&
                  ts.items.map((i, k) => (
                    <span key={k} title={ITEMS[i]?.name ?? i} className="inline-flex w-5 h-5 rounded-md bg-white/15 items-center justify-center shrink-0">
                      <ItemIcon id={i} size={14} />
                    </span>
                  ))}
              </div>
              {!compact && ts.items.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {ts.items.map((i, k) => (
                    <span key={k} title={ITEMS[i]?.name ?? i} className="inline-flex w-7 h-7 rounded-lg bg-white/15 items-center justify-center">
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
              {members && (
                <span className={`text-white/50 text-sm transition-transform ${open === r.id ? "rotate-180" : ""}`} aria-hidden>
                  ▾
                </span>
              )}
            </div>
            </div>
            {members && (
              <div className={`grid transition-[grid-template-rows] duration-300 ${open === r.id ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <TeamMembers list={members.filter((m) => m.team_id === r.id)} color={t?.color} />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TeamMembers({ list, color }: { list: MemberInfo[]; color?: string }) {
  return (
    <div className="px-4 pb-3 pt-1 pl-12">
      {list.length === 0 ? (
        <div className="text-sm text-white/50">아직 참가한 사람이 없어요</div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {list.map((m) => (
            <li key={m.id} className="rounded-full px-2.5 py-0.5 text-sm bg-white/10 border" style={{ borderColor: color ?? "rgba(255,255,255,0.2)" }}>
              {m.nickname}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1.5 text-xs text-white/40">{list.length}명</div>
    </div>
  );
}
