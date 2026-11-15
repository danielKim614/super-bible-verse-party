"use client";

/** 강제 개입 탭 */
import { askConfirm } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";
import { teamName } from "@/components/describe";
import { SPACES, SPACE_LABEL, spaceName } from "@/game/board";
import { ITEMS, ITEM_IDS, type ItemId } from "@/game/items";
import { type GameData } from "@/lib/useGame";
import { type Admin, btn, Row } from "./ui";

// ---------------------------------------------------------------------------
// 강제 개입
// ---------------------------------------------------------------------------
export function OverrideTab({ game, admin }: { game: GameData; admin: Admin }) {
  const { state, teamById } = game;
  const [teamId, setTeamId] = useState<string>("");
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState("");
  const [item, setItem] = useState<ItemId>("tripleDice");
  const [pos, setPos] = useState(1);
  const [stars, setStars] = useState("");
  const [shopPos, setShopPos] = useState(0);
  const [turns, setTurns] = useState(state.settings.totalTurns);
  const [cur, setCur] = useState({ turn: state.turn, idx: state.teamIndex });
  const send = admin.send;

  useEffect(() => {
    if (!teamId && state.teamIds[0]) setTeamId(state.teamIds[0]);
  }, [teamId, state.teamIds]);
  useEffect(() => setStars(state.stars.join(", ")), [state.stars]);

  if (!state.started) return <p className="text-slate-500">게임 시작 후 사용할 수 있어요.</p>;
  const t = state.teams[teamId];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-2xl">팀별 조정</h3>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg border px-2 py-2">
          {state.teamIds.map((id) => (
            <option key={id} value={id}>
              {teamName(teamById, id)}
            </option>
          ))}
        </select>
        {t && (
          <div className="text-sm text-slate-600">
            위치 {spaceName(t.pos)} · ⭐{t.stars} · 달란트 {t.talents} · {t.items.map((i) => ITEMS[i]?.name ?? i).join(", ") || "아이템 없음"}
          </div>
        )}
        <Row label="달란트">
          <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="w-24 rounded-lg border px-2 py-1" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="사유 (선택)" className="flex-1 rounded-lg border px-2 py-1" />
          <button className={`${btn} bg-amber-400`} disabled={!delta || admin.busy} onClick={() => { send({ type: "override", payload: { action: "talents", teamId, delta, note } }); setDelta(0); setNote(""); }}>
            적용
          </button>
        </Row>
        <Row label="스타">
          <button className={`${btn} bg-yellow-200`} onClick={() => send({ type: "override", payload: { action: "stars", teamId, delta: 1 } })}>+1</button>
          <button className={`${btn} bg-yellow-100`} onClick={() => send({ type: "override", payload: { action: "stars", teamId, delta: -1 } })}>−1</button>
        </Row>
        <Row label="아이템">
          <select value={item} onChange={(e) => setItem(e.target.value as ItemId)} className="rounded-lg border px-2 py-1">
            {ITEM_IDS.map((id) => (
              <option key={id} value={id}>
                {ITEMS[id].name}
              </option>
            ))}
          </select>
          <button
            className={`${btn} bg-purple-100`}
            disabled={!t || t.items.includes(item) || t.items.length >= state.settings.inventoryLimit}
            title={t?.items.includes(item) ? "이미 가지고 있어요 (같은 아이템은 하나만)" : `팀당 최대 ${state.settings.inventoryLimit}개`}
            onClick={() => send({ type: "override", payload: { action: "addItem", teamId, item } })}
          >
            추가
          </button>
          <button className={`${btn} bg-purple-50`} disabled={!t?.items.includes(item)} onClick={() => send({ type: "override", payload: { action: "removeItem", teamId, item } })}>삭제</button>
        </Row>
        <Row label="위치">
          <select value={pos} onChange={(e) => setPos(Number(e.target.value))} className="rounded-lg border px-2 py-1">
            <option value={0}>출발</option>
            {SPACES.map((s) => (
              <option key={s.id} value={s.id}>
                {spaceName(s.id)} ({SPACE_LABEL[s.type]})
              </option>
            ))}
          </select>
          <button className={`${btn} bg-sky-100`} onClick={() => send({ type: "override", payload: { action: "position", teamId, pos } })}>이동</button>
        </Row>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-2xl">게임 전체</h3>
        <Row label="스타 위치">
          <input value={stars} onChange={(e) => setStars(e.target.value)} className="flex-1 rounded-lg border px-2 py-1" placeholder="예: 12, 30" />
          <button
            className={`${btn} bg-yellow-200`}
            onClick={() =>
              send({ type: "override", payload: { action: "starPositions", stars: stars.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 39) } })
            }
          >
            적용
          </button>
        </Row>
        <Row label="상점 위치">
          <select value={shopPos || state.shopAt} onChange={(e) => setShopPos(Number(e.target.value))} className="rounded-lg border px-2 py-1">
            {SPACES.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {spaceName(sp.id)} ({SPACE_LABEL[sp.type]})
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">
            지금 {spaceName(state.shopAt)} · {state.shopVisits}/{state.settings.shopMoveAfter}팀 방문
          </span>
          <button
            className={`${btn} bg-violet-200`}
            disabled={!shopPos || shopPos === state.shopAt}
            onClick={() => send({ type: "override", payload: { action: "shopPosition", pos: shopPos } })}
          >
            이동
          </button>
        </Row>
        <Row label="총 턴 수">
          <input type="number" min={1} value={turns} onChange={(e) => setTurns(Number(e.target.value))} className="w-20 rounded-lg border px-2 py-1" />
          <button className={`${btn} bg-slate-200`} onClick={() => send({ type: "override", payload: { action: "totalTurns", value: turns } })}>적용</button>
        </Row>
        <Row label="2배 구간">
          {([
            [null, "자동"],
            [true, "켜기"],
            [false, "끄기"],
          ] as [boolean | null, string][]).map(([v, l]) => (
            <button key={l} className={`${btn} ${state.boostOverride === v ? "bg-red-500 text-white" : "bg-slate-100"}`} onClick={() => send({ type: "override", payload: { action: "boost", on: v } })}>
              {l}
            </button>
          ))}
        </Row>
        <Row label="현재 차례">
          <input type="number" min={1} value={cur.turn} onChange={(e) => setCur({ ...cur, turn: Number(e.target.value) })} className="w-16 rounded-lg border px-2 py-1" />
          턴
          <select value={cur.idx} onChange={(e) => setCur({ ...cur, idx: Number(e.target.value) })} className="rounded-lg border px-2 py-1">
            {state.teamIds.map((id, i) => (
              <option key={id} value={i}>
                {teamName(teamById, id)}
              </option>
            ))}
          </select>
          <button className={`${btn} bg-slate-200`} onClick={() => void askConfirm("이 팀 차례로 이동할까요? (현재 턴 진행은 취소됨)").then((ok) => { if (ok) void (send({ type: "override", payload: { action: "setCurrent", turn: cur.turn, teamIndex: cur.idx } })); })}>
            이동
          </button>
        </Row>
        <div className="flex flex-wrap gap-2">
          <button className={`${btn} bg-slate-200`} onClick={() => void askConfirm("현재 팀을 건너뛸까요?").then((ok) => { if (ok) void (send({ type: "override", payload: { action: "skipTurn" } })); })}>
            ⏭ 현재 팀 건너뛰기
          </button>
          <button className={`${btn} bg-slate-200`} onClick={() => send({ type: "override", payload: { action: "forceRecite" } })}>
            🔁 현재 칸에서 다시 암송
          </button>
          <button className={`${btn} bg-red-100 text-red-700`} onClick={() => void askConfirm("게임을 지금 종료하고 시상식으로 갈까요?", { okLabel: "종료", danger: true }).then((ok) => { if (ok) void (send({ type: "override", payload: { action: "endGame" } })); })}>
            🏁 게임 종료
          </button>
        </div>
      </section>
    </div>
  );
}
