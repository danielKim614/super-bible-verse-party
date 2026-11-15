"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_H, BOARD_W, EVENT_MODE_LABEL, SPACE_BY_ID } from "@/game/board";
import { currentTeamId } from "@/game/reducer";
import type { GameState, HappeningKind, TeamInfo } from "@/game/types";
import { ITEMS, type ItemId } from "@/game/items";
import { ItemIcon } from "./ItemIcon";
import { eventRange } from "./describe";

/** 이벤트·해프닝 칸에 도착하면 보드 가운데에 무슨 이벤트/해프닝인지 보여 주는 연출 */
export type RevealInfo =
  | { key: string; type: "event"; space: number }
  | { key: string; type: "happening"; space: number; kind: HappeningKind; text: string }
  | { key: string; type: "bless"; space: number; teams: string[] };

const EVENT_MS = 3400;
const HAPPENING_MS = 5600;
const BLESS_MS = 4000;

export function useSpaceReveal(state: GameState, shown: Record<string, number>, busy: boolean): (RevealInfo & { pending?: false }) | { pending: true; key: string; type: "pending" } | null {
  const cur = currentTeamId(state);
  const landed = state.ctx.landed;
  const type = landed ? SPACE_BY_ID[landed]?.type : undefined;
  const key =
    landed && (type === "event" || type === "happening" || type === "bless") ? `${state.ctx.startSeq ?? 0}:${landed}:${state.moveSeq}` : null;
  const arrived = !!cur && landed !== undefined && shown[cur] === landed;
  // 화면을 새로 열었을 때 이미 도착해 있던 칸은 다시 보여 주지 않는다
  const seen = useRef<string | null>(key);
  const [active, setActive] = useState<RevealInfo | null>(null);
  const happening = state.ctx.happening;
  const blessTo = state.ctx.blessTo;

  useEffect(() => {
    if (!key || !arrived || busy || seen.current === key || !landed) return;
    seen.current = key;
    const info: RevealInfo =
      type === "happening" && happening
        ? { key, type: "happening", space: landed, kind: happening.kind, text: happening.text }
        : type === "bless"
          ? { key, type: "bless", space: landed, teams: blessTo ?? [] }
          : { key, type: "event", space: landed };
    setActive(info);
    const ms = info.type === "happening" ? HAPPENING_MS : info.type === "bless" ? BLESS_MS : EVENT_MS;
    const t = setTimeout(() => setActive((a) => (a?.key === key ? null : a)), ms);
    return () => clearTimeout(t);
  }, [key, arrived, busy, landed, type, happening, blessTo]);

  // 되돌리기 등으로 그 칸에서 벗어나면 바로 닫기
  useEffect(() => {
    if (active && active.key !== key) setActive(null);
  }, [active, key]);

  // 해프닝 칸에 도착했지만 아직 공개 전(이동·주사위 연출 중)인 동안
  if (!active && key && (type === "happening" || type === "bless") && seen.current !== key) return { pending: true, key, type: "pending" };
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

/** 가운데 공개 카드 공통 틀: 남색 카드 + 칸 색 테두리·빛 + 위쪽 탭(칸 이름). NOW 카드와 같은 느낌 */
const ACCENT = {
  event: { line: "#34d399", glow: "#10b981", chip: "#059669" },
  happening: { line: "#22d3ee", glow: "#06b6d4", chip: "#0891b2" },
  gift: { line: "#a78bfa", glow: "#8b5cf6", chip: "#7c3aed" },
  bless: { line: "#f9a8d4", glow: "#ec4899", chip: "#db2777" },
} as const;
type AccentKey = keyof typeof ACCENT;
const CARD_W = 520;
const CARD_H = 300;

function RevealFrame({ accent, chip, children }: { accent: AccentKey; chip: string; children: React.ReactNode }) {
  const a = ACCENT[accent];
  const id = `rv-${accent}`;
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="0%" cy="0%" r="120%">
          <stop offset="0%" stopColor={a.glow} stopOpacity={0.45} />
          <stop offset="55%" stopColor={a.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-CARD_W / 2 - 6} y={-CARD_H / 2 - 6} width={CARD_W + 12} height={CARD_H + 12} rx={34} fill={a.glow} opacity={0.35} filter="url(#neon)" />
      <rect x={-CARD_W / 2} y={-CARD_H / 2} width={CARD_W} height={CARD_H} rx={28} fill="#141b4d" />
      <rect x={-CARD_W / 2} y={-CARD_H / 2} width={CARD_W} height={CARD_H} rx={28} fill={`url(#${id})`} />
      <rect x={-CARD_W / 2} y={-CARD_H / 2} width={CARD_W} height={CARD_H} rx={28} fill="none" stroke={a.line} strokeWidth={4} />
      {/* 위쪽 탭 */}
      <g transform={`translate(0,${-CARD_H / 2})`}>
        <rect x={-80} y={-19} width={160} height={38} rx={19} fill={a.chip} stroke="#fff" strokeWidth={2.5} />
        <text textAnchor="middle" y={8} fontSize={20} className="font-display" fill="#fff" letterSpacing="0.06em">
          {chip}
        </text>
      </g>
      {children}
    </g>
  );
}

/** 카드 안 큰 제목 / 작은 설명 */
function Title({ y, children, color = "#fff" }: { y: number; children: React.ReactNode; color?: string }) {
  return (
    <text textAnchor="middle" y={y} fontSize={34} className="font-display" fill={color}>
      {children}
    </text>
  );
}
function Note({ y, children }: { y: number; children: React.ReactNode }) {
  return (
    <text textAnchor="middle" y={y} fontSize={20} className="font-display" fill="#fff" opacity={0.8}>
      {children}
    </text>
  );
}
function Rays({ color }: { color: string }) {
  return (
    <g className="animate-starfx-rays" style={{ animationDuration: "1.6s" }}>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={-4} y={-250} width={8} height={70} rx={4} fill={color} opacity={0.7} transform={`rotate(${i * 30})`} />
      ))}
    </g>
  );
}
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <g>
      <rect width={BOARD_W} height={BOARD_H} rx={36} fill="#05081f" opacity={0.62} className="animate-dim-in" />
      <g transform={`translate(${BOARD_W / 2},${BOARD_H / 2})`}>
        <g className="animate-pop" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {children}
        </g>
      </g>
    </g>
  );
}

export function SpaceRevealFx({ info, teamById }: { info: RevealInfo; teamById: Record<string, TeamInfo> }) {
  return (
    <Overlay>
      {info.type === "happening" ? <HappeningCard info={info} /> : info.type === "bless" ? <BlessCard teams={info.teams} teamById={teamById} /> : <EventCard space={info.space} />}
    </Overlay>
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
      {done && <Rays color="#a5f3fc" />}
      <RevealFrame accent="happening" chip="해프닝 칸">
        <Title y={-72}>{done ? "해프닝 발생!" : "무슨 일이 일어날까…?"}</Title>
        {/* 슬롯 창 */}
        <rect x={-190} y={-44} width={380} height={96} rx={22} fill={done ? "#fde047" : "#ffffff"} />
        <g key={idx} className={done ? "" : "animate-slot-tick"}>
          <text textAnchor="middle" y={20} fontSize={42} className="font-display" fill="#0b1033">
            {face.emoji} {face.name}
          </text>
        </g>
        {done && <Note y={100}>{detail}</Note>}
      </RevealFrame>
    </g>
  );
}

function EventCard({ space }: { space: number }) {
  const sp = SPACE_BY_ID[space];
  const mode = sp?.eventMode ?? "twoVerses";
  const [a, b] = eventRange(mode, space);
  const verses = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const chipW = 96;
  const gap = 44;
  const totalW = verses.length * chipW + (verses.length - 1) * gap;
  return (
    <RevealFrame accent="event" chip="이벤트 칸">
      <Title y={-72}>{EVENT_MODE_LABEL[mode]}</Title>
      {verses.map((v, i) => {
        const x = -totalW / 2 + i * (chipW + gap);
        return (
          <g key={v}>
            {i > 0 && (
              <g transform={`translate(${x - gap / 2},10)`}>
                <text textAnchor="middle" y={10} fontSize={30} className="font-display" fill={ACCENT.event.line}>
                  →
                </text>
              </g>
            )}
            <g transform={`translate(${x + chipW / 2},10)`}>
              <g className="animate-pop" style={{ animationDelay: `${300 + i * 350}ms`, transformBox: "fill-box", transformOrigin: "center" }}>
                <rect x={-chipW / 2} y={-38} width={chipW} height={76} rx={20} fill={v === space ? "#fde047" : "#ffffff"} />
                <text textAnchor="middle" y={13} fontSize={36} className="font-display" fill="#0b1033">
                  {v}절
                </text>
              </g>
            </g>
          </g>
        );
      })}
      <Note y={100}>{verses.length}절을 연속으로 외워 주세요</Note>
    </RevealFrame>
  );
}

/** 축복 칸: 하트가 퍼지며 꼴찌 팀(공동이면 모두)에게 +5 */
function BlessCard({ teams, teamById }: { teams: string[]; teamById: Record<string, TeamInfo> }) {
  const n = Math.max(1, teams.length);
  const chipW = n > 2 ? 140 : 170;
  const gap = 14;
  const totalW = n * chipW + (n - 1) * gap;
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 36})`}>
          <text y={-190} textAnchor="middle" fontSize={26} className="animate-heart-float" style={{ animationDelay: `${200 + (i % 5) * 120}ms` }}>
            💗
          </text>
        </g>
      ))}
      <RevealFrame accent="bless" chip="축복 칸">
        <Title y={-72}>가장 뒤처진 팀을 축복해요</Title>
        {teams.length === 0 ? (
          <Note y={20}>축복받을 팀이 없어요</Note>
        ) : (
          teams.map((id, i) => {
            const t = teamById[id];
            const name = t?.name ?? "?";
            const x = -totalW / 2 + i * (chipW + gap);
            return (
              <g key={id} transform={`translate(${x + chipW / 2},12)`}>
                <g className="animate-pop" style={{ animationDelay: `${400 + i * 200}ms`, transformBox: "fill-box", transformOrigin: "center" }}>
                  <rect x={-chipW / 2} y={-40} width={chipW} height={80} rx={20} fill="#ffffff" />
                  {/* 팀 표시: 보드의 말과 같은 둥근 네모 */}
                  <rect x={-chipW / 2 + 10} y={-24} width={48} height={48} rx={14} fill={t?.color ?? "#999"} stroke="#fff" strokeWidth={3} />
                  <text x={-chipW / 2 + 34} y={9} textAnchor="middle" fontSize={22} className="font-display" fill="#fff">
                    {name.slice(0, 1)}
                  </text>
                  <text x={-chipW / 2 + 68} y={-4} fontSize={19} className="font-display" fill="#0b1033">
                    {name.length > 5 ? `${name.slice(0, 5)}…` : name}
                  </text>
                  <text x={-chipW / 2 + 68} y={22} fontSize={19} className="font-display" fill="#db2777">
                    +5 달란트
                  </text>
                </g>
              </g>
            );
          })
        )}
        <Note y={100}>도착한 팀은 이어서 이 칸 구절을 암송해요</Note>
      </RevealFrame>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 선물 칸 성공: 선물 상자가 흔들리다 열리며 받은 아이템 공개

export type GiftInfo = { key: string; item: ItemId | "full"; full: number };
const GIFT_MS = 3600;

export function useGiftReveal(state: GameState, fullTalents: number): { gift: GiftInfo | null; pending: boolean } {
  const gained = state.ctx.gainedItem;
  const key = gained ? `${state.ctx.startSeq ?? 0}:${state.ctx.landed ?? 0}:${gained}` : null;
  // 화면을 새로 열었을 때 이미 받은 선물은 다시 보여 주지 않는다
  const seen = useRef<string | null>(key);
  const [active, setActive] = useState<GiftInfo | null>(null);
  useEffect(() => {
    if (!key || !gained || seen.current === key) return;
    seen.current = key;
    setActive({ key, item: gained, full: fullTalents });
    const t = setTimeout(() => setActive((a) => (a?.key === key ? null : a)), GIFT_MS);
    return () => clearTimeout(t);
  }, [key, gained, fullTalents]);
  useEffect(() => {
    if (active && active.key !== key) setActive(null);
  }, [active, key]);
  // 받았지만 아직 연출이 시작되기 전(같은 렌더)도 "공개 중"으로 본다
  return { gift: active, pending: !active && !!key && seen.current !== key };
}

export function GiftRevealFx({ info }: { info: GiftInfo }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(t);
  }, []);
  const def = info.item !== "full" ? ITEMS[info.item] : null;
  return (
    <Overlay>
      {open && <Rays color="#ddd6fe" />}
      <RevealFrame accent="gift" chip="선물 칸">
        {!open ? (
          <>
            <Title y={-72}>어떤 선물일까…?</Title>
            {/* 흔들리는 선물 상자 */}
            <g transform="translate(0,62)">
              <g className="animate-gift-shake" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
                <text textAnchor="middle" y={0} fontSize={104}>
                  🎁
                </text>
              </g>
            </g>
          </>
        ) : def ? (
          <>
            <Title y={-72}>선물 획득!</Title>
            <g transform="translate(-210,-44)">
              <g className="animate-pop" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                <rect width={110} height={110} rx={26} fill="#ffffff" />
                <g transform="translate(15,15)">
                  <ItemIcon id={info.item as ItemId} size={80} />
                </g>
              </g>
            </g>
            <text x={-80} y={4} fontSize={40} className="font-display" fill="#fde047">
              {def.name}
            </text>
            <text x={-80} y={42} fontSize={20} className="font-display" fill="#fff" opacity={0.85}>
              {def.desc}
            </text>
            <Note y={112}>아이템을 받았어요!</Note>
          </>
        ) : (
          <>
            <Title y={-72}>선물 획득!</Title>
            <g className="animate-pop" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
              <text textAnchor="middle" y={20} fontSize={48} className="font-display" fill="#fde047">
                +{info.full} 달란트
              </text>
            </g>
            <Note y={90}>받을 수 있는 아이템이 없어서 달란트로 드려요</Note>
          </>
        )}
      </RevealFrame>
    </Overlay>
  );
}
