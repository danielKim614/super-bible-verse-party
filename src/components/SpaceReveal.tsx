"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_H, BOARD_W, EVENT_MODE_LABEL, SPACE_BY_ID } from "@/game/board";
import { currentTeamId } from "@/game/reducer";
import type { GameState, HappeningKind } from "@/game/types";
import { eventRange } from "./describe";

/** 이벤트·해프닝 칸에 도착하면 보드 가운데에 무슨 이벤트/해프닝인지 보여 주는 연출 */
export type RevealInfo =
  | { key: string; type: "event"; space: number }
  | { key: string; type: "happening"; space: number; kind: HappeningKind; text: string };

const EVENT_MS = 3400;
const HAPPENING_MS = 5600;

export function useSpaceReveal(state: GameState, shown: Record<string, number>, busy: boolean): (RevealInfo & { pending?: false }) | { pending: true; key: string; type: "pending" } | null {
  const cur = currentTeamId(state);
  const landed = state.ctx.landed;
  const type = landed ? SPACE_BY_ID[landed]?.type : undefined;
  const key = landed && (type === "event" || type === "happening") ? `${state.ctx.startSeq ?? 0}:${landed}:${state.moveSeq}` : null;
  const arrived = !!cur && landed !== undefined && shown[cur] === landed;
  // 화면을 새로 열었을 때 이미 도착해 있던 칸은 다시 보여 주지 않는다
  const seen = useRef<string | null>(key);
  const [active, setActive] = useState<RevealInfo | null>(null);
  const happening = state.ctx.happening;

  useEffect(() => {
    if (!key || !arrived || busy || seen.current === key || !landed) return;
    seen.current = key;
    const info: RevealInfo =
      type === "happening" && happening
        ? { key, type: "happening", space: landed, kind: happening.kind, text: happening.text }
        : { key, type: "event", space: landed };
    if (info.type === "happening" || type === "event") setActive(info);
    const t = setTimeout(() => setActive((a) => (a?.key === key ? null : a)), info.type === "happening" ? HAPPENING_MS : EVENT_MS);
    return () => clearTimeout(t);
  }, [key, arrived, busy, landed, type, happening]);

  // 되돌리기 등으로 그 칸에서 벗어나면 바로 닫기
  useEffect(() => {
    if (active && active.key !== key) setActive(null);
  }, [active, key]);

  // 해프닝 칸에 도착했지만 아직 공개 전(이동·주사위 연출 중)인 동안
  if (!active && key && type === "happening" && seen.current !== key) return { pending: true, key, type: "pending" };
  return active;
}

const HAPPENING_FACES: { kind: HappeningKind; emoji: string; name: string }[] = [
  { kind: "stars", emoji: "🌠", name: "스타 대이동" },
  { kind: "rain", emoji: "🌧️", name: "달란트 비" },
  { kind: "golden", emoji: "👑", name: "황금 라운드" },
  { kind: "gift", emoji: "🎁", name: "깜짝 선물" },
];

/** 슬롯처럼 돌다가 점점 느려지며 결과에서 멈춤 */
function useSlot(target: number) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const delays = [70, 70, 70, 75, 80, 90, 100, 115, 135, 160, 190, 230, 280, 340];
    // 마지막 칸이 target이 되도록 출발 위치를 맞춘다
    const n = HAPPENING_FACES.length;
    const start = (((target - delays.length) % n) + n) % n;
    setIdx(start);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 250;
    delays.forEach((d, k) => {
      t += d;
      timers.push(setTimeout(() => setIdx((start + k + 1) % n), t));
    });
    timers.push(setTimeout(() => setDone(true), t + 120));
    return () => timers.forEach(clearTimeout);
  }, [target]);
  return { idx, done };
}

export function SpaceRevealFx({ info }: { info: RevealInfo }) {
  return (
    <g>
      <rect width={BOARD_W} height={BOARD_H} rx={36} fill="#05081f" opacity={0.62} className="animate-dim-in" />
      <g transform={`translate(${BOARD_W / 2},${BOARD_H / 2})`}>
        <g className="animate-pop" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {info.type === "happening" ? <HappeningCard info={info} /> : <EventCard space={info.space} />}
        </g>
      </g>
    </g>
  );
}

function HappeningCard({ info }: { info: Extract<RevealInfo, { type: "happening" }> }) {
  const target = Math.max(0, HAPPENING_FACES.findIndex((f) => f.kind === info.kind));
  const { idx, done } = useSlot(target);
  const face = HAPPENING_FACES[idx];
  // 결과 문구에서 앞의 이름 부분("달란트 비! ")은 빼고 설명만
  const detail = info.text.includes("!") ? info.text.slice(info.text.indexOf("!") + 1).trim() : info.text;
  return (
    <g>
      {done && (
        <g className="animate-starfx-rays" style={{ animationDuration: "1.6s" }}>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={-4} y={-250} width={8} height={70} rx={4} fill="#a5f3fc" opacity={0.7} transform={`rotate(${i * 30})`} />
          ))}
        </g>
      )}
      <rect x={-250} y={-150} width={500} height={300} rx={34} fill="#0e1a4a" stroke="#22d3ee" strokeWidth={5} />
      <rect x={-250} y={-150} width={500} height={300} rx={34} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={1.5} transform="scale(0.97)" />
      <text textAnchor="middle" y={-98} fontSize={30} className="font-display" fill="#67e8f9">
        ❔ 해프닝 발생!
      </text>
      {/* 슬롯 창 */}
      <rect x={-200} y={-66} width={400} height={104} rx={22} fill={done ? "#fde047" : "#ffffff"} opacity={done ? 1 : 0.95} className={done ? "animate-pop" : ""} />
      <g key={idx} className={done ? "" : "animate-slot-tick"}>
        <text textAnchor="middle" y={4} fontSize={44} className="font-display" fill="#0b1033">
          {face.emoji} {face.name}
        </text>
      </g>
      <text textAnchor="middle" y={92} fontSize={22} className="font-display" fill="#fff" opacity={done ? 1 : 0}>
        {done ? detail : ""}
      </text>
      {!done && (
        <text textAnchor="middle" y={92} fontSize={18} fill="#a5f3fc">
          무슨 일이 일어날까…?
        </text>
      )}
    </g>
  );
}

function EventCard({ space }: { space: number }) {
  const sp = SPACE_BY_ID[space];
  const mode = sp?.eventMode ?? "twoVerses";
  const [a, b] = eventRange(mode, space);
  const verses = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const chipW = 92;
  const gap = 44;
  const totalW = verses.length * chipW + (verses.length - 1) * gap;
  return (
    <g>
      <rect x={-260} y={-150} width={520} height={300} rx={34} fill="#0b2a2a" stroke="#34d399" strokeWidth={5} />
      <text textAnchor="middle" y={-96} fontSize={32} className="font-display" fill="#6ee7b7">
        🎉 이벤트 칸!
      </text>
      <text textAnchor="middle" y={-56} fontSize={24} className="font-display" fill="#fff">
        {EVENT_MODE_LABEL[mode]}
      </text>
      {verses.map((v, i) => {
        const x = -totalW / 2 + i * (chipW + gap);
        return (
          <g key={v}>
            {i > 0 && (
              <text x={x - gap / 2} y={30} textAnchor="middle" fontSize={30} fill="#6ee7b7" className="animate-pop" style={{ animationDelay: `${300 + i * 350 - 150}ms` }}>
                →
              </text>
            )}
            <g transform={`translate(${x + chipW / 2},18)`}>
              <g className="animate-pop" style={{ animationDelay: `${300 + i * 350}ms`, transformBox: "fill-box", transformOrigin: "center" }}>
                <rect x={-chipW / 2} y={-36} width={chipW} height={72} rx={20} fill={v === space ? "#fde047" : "#ffffff"} />
                <text textAnchor="middle" y={12} fontSize={34} className="font-display" fill="#0b1033">
                  {v}절
                </text>
              </g>
            </g>
          </g>
        );
      })}
      <text textAnchor="middle" y={104} fontSize={20} fill="#d1fae5">
        한 사람이 {verses.length}절을 이어서 암송해요
      </text>
    </g>
  );
}
