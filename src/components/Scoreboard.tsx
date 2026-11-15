"use client";

import { ITEMS } from "@/game/items";
import { ItemIcon } from "./ItemIcon";
import { currentTeamId, finalRanking } from "@/game/reducer";
import { useState } from "react";
import type { GameState, MemberInfo, TeamInfo } from "@/game/types";
import type { ItemId } from "@/game/items";
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
              className={`relative flex items-center ${compact ? "gap-3 py-1.5" : "gap-2.5 py-2"} px-3 ${members ? "cursor-pointer select-none" : ""}`}
              role={members ? "button" : undefined}
              aria-expanded={members ? open === r.id : undefined}
              onClick={members ? () => setOpen((o) => (o === r.id ? null : r.id)) : undefined}
            >
            <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: t?.color }} />
            <span className={`font-display ${compact ? "text-lg w-6" : "text-2xl w-6"} text-center ${r.rank === 1 ? "text-yellow-300" : "text-white/40"}`}>{r.rank}</span>
            <TeamAvatar team={t} size={compact ? 34 : 44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`font-display truncate ${compact ? "text-base" : "text-xl leading-tight"}`}>{t?.name ?? "?"}</span>
              </div>
              {/* 메인 화면(좁은 카드): 이름 아래 줄에 스타·달란트·보유 아이템 */}
              {!compact && (
                <div className="flex items-center gap-2.5 mt-0.5 font-display whitespace-nowrap">
                  <span className="text-xl text-yellow-300">★{stars}</span>
                  <span className="text-xl text-amber-200">
                    <span className="text-xs align-middle opacity-70">달란트</span> {ts.talents}
                  </span>
                  {ts.items.length > 0 && (
                    <span className="flex gap-1 ml-auto shrink-0">
                      {ts.items.map((i, k) => (
                        <span key={k} title={ITEMS[i]?.name ?? i} className="inline-flex w-6 h-6 rounded-md bg-white/15 items-center justify-center">
                          <ItemIcon id={i} size={16} />
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              )}
            </div>
            {compact && (
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
            )}
            </div>
            {members && (
              <div className={`grid transition-[grid-template-rows] duration-300 ${open === r.id ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <TeamDetail items={ts.items} list={members.filter((m) => m.team_id === r.id)} color={t?.color} />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** 펼친 팀 정보: 보유 아이템(누르고 있으면 설명) + 팀원 */
function TeamDetail({ items, list, color }: { items: ItemId[]; list: MemberInfo[]; color?: string }) {
  const [tip, setTip] = useState<ItemId | null>(null);
  const tipDef = tip && items.includes(tip) ? ITEMS[tip] : null;
  return (
    <div className="px-4 pb-3 pt-1 pl-12 flex flex-col gap-2.5">
      <div>
        <div className="text-xs font-bold text-white/50 mb-1">
          아이템
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-white/50">없음</div>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((id) => (
              <ItemBadge key={id} id={id} active={tip === id} onTip={setTip} />
            ))}
          </ul>
        )}
        {tipDef && (
          <div role="tooltip" className="mt-2 rounded-xl bg-white text-slate-800 text-sm px-3 py-2 shadow-lg animate-toast-in">
            <b className="mr-1.5">{tipDef.name}</b>
            {tipDef.desc}
          </div>
        )}
      </div>
      <div>
        <div className="text-xs font-bold text-white/50 mb-1">
          팀원 <span className="font-normal">{list.length}명</span>
        </div>
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
      </div>
    </div>
  );
}

/** 아이템 뱃지: 누르고 있는 동안(마우스는 올려 둔 동안) 설명이 보이고, 손을 떼면 사라짐 */
function ItemBadge({ id, active, onTip }: { id: ItemId; active: boolean; onTip: (id: ItemId | null) => void }) {
  const def = ITEMS[id];
  if (!def) return null;
  const show = () => onTip(id);
  const hide = () => onTip(null);
  return (
    <li
      className="select-none [-webkit-touch-callout:none] touch-manipulation"
      onPointerDown={show}
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerUp={(e) => e.pointerType !== "mouse" && hide()}
      onPointerLeave={hide}
      onPointerCancel={hide}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-sm border transition-all ${active ? "bg-white/25 border-white/60 scale-105" : "bg-white/10 border-white/20"}`}>
        <span className="inline-flex w-6 h-6 rounded-full bg-white/15 items-center justify-center">
          <ItemIcon id={id} size={16} />
        </span>
        {def.name}
      </span>
    </li>
  );
}
