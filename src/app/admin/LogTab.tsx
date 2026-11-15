"use client";

/** 달란트 장부·로그 탭 */
import { useEffect, useMemo, useState } from "react";
import { TeamAvatar } from "@/components/TeamAvatar";
import { describeEvent } from "@/components/describeEvent";
import { teamName } from "@/components/describe";
import { type GameData } from "@/lib/useGame";
import { btn } from "./ui";

// ---------------------------------------------------------------------------
// 장부·로그
// ---------------------------------------------------------------------------
export const CHECK_KEY = "sbvp:cashCheck";

export function LogTab({ game }: { game: GameData }) {
  const { state, teamById, events } = game;
  const [checked, setChecked] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(CHECK_KEY) || "{}"));
    } catch {}
  }, []);
  const mark = (id: string) => {
    const next = { ...checked, [id]: state.teams[id].talents };
    setChecked(next);
    localStorage.setItem(CHECK_KEY, JSON.stringify(next));
  };
  const ledger = useMemo(() => [...state.ledger].reverse(), [state.ledger]);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.seq - a.seq), [events]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section>
        <h3 className="font-display text-2xl mb-2">팀별 잔액 · 실물 대조</h3>
        <div className="flex flex-col gap-1 mb-4">
          {state.teamIds.map((id) => {
            const ok = checked[id] === state.teams[id].talents;
            return (
              <div key={id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <TeamAvatar team={teamById[id]} size={28} />
                <span className="flex-1">{teamName(teamById, id)}</span>
                <span className="font-display text-xl">{state.teams[id].talents} 달란트</span>
                <button className={`${btn} py-1 ${ok ? "bg-green-500 text-white" : "bg-white border"}`} onClick={() => mark(id)}>
                  {ok ? "✓ 실물 일치" : "실물 확인"}
                </button>
              </div>
            );
          })}
        </div>
        <h3 className="font-display text-2xl mb-2">달란트 장부</h3>
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-left">
            <tr>
              <th>#</th>
              <th>팀</th>
              <th>변동</th>
              <th>잔액</th>
              <th>사유</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((l, i) => (
              <tr key={i} className={`border-t ${l.manual ? "bg-amber-50" : ""}`}>
                <td className="text-slate-400">{l.seq}</td>
                <td>{teamName(teamById, l.teamId)}</td>
                <td className={l.delta > 0 ? "text-green-600" : "text-red-600"}>
                  {l.delta > 0 ? "+" : ""}
                  {l.delta}
                </td>
                <td>{l.balance}</td>
                <td>
                  {l.manual && <span className="rounded bg-amber-300 px-1 text-xs mr-1">수동</span>}
                  {l.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="font-display text-2xl mb-2">입력 기록</h3>
        <ul className="text-sm flex flex-col gap-0.5">
          {sortedEvents.map((e) => (
            <li key={e.id} className={`flex gap-2 ${e.voided ? "line-through text-slate-400" : ""}`}>
              <span className="w-8 text-slate-400">{e.seq}</span>
              <span className="flex-1">{describeEvent(e, teamById)}</span>
              <span className="text-slate-400">{e.created_at ? new Date(e.created_at).toLocaleTimeString("ko-KR") : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
