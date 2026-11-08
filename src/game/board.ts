// 로마서 8장 "다섯 길" 보드 정의 (기획서 v1.2 §4~5)
// 칸 id = 절 번호(1~39). 0 = T(출발·합류점, 암송 없음).
// 칸 유형은 본문 길이를 받기 전의 임시 배치입니다. 확정 시 SPACE_TYPES만 고치면 됩니다.

export type SpaceType = "blue" | "red" | "event" | "item";
export type RedMode = "blank" | "firstWord" | "noHint";
export type EventMode = "relay" | "threeVerses";
export type RoadId = 1 | 2 | 3 | 4 | 5;

export interface Space {
  id: number; // 절 번호
  road: RoadId;
  type: SpaceType;
  redMode?: RedMode;
  eventMode?: EventMode;
  x: number;
  y: number;
}

export const T = 0; // 출발·합류점 (지나갈 때 상점 이용)
export const FORK_FROM = 17; // 17절 다음이 갈림길 B
export const CENTER_START = 18;
export const LEFT_START = 26;

export const ROADS: { id: RoadId; name: string; verses: [number, number]; theme: string }[] = [
  { id: 1, name: "생명의 법", verses: [1, 11], theme: "들판" },
  { id: 2, name: "자녀의 길", verses: [12, 17], theme: "마을" },
  { id: 3, name: "탄식과 소망", verses: [18, 25], theme: "광야" },
  { id: 4, name: "성령의 간구", verses: [26, 30], theme: "산길" },
  { id: 5, name: "끊을 수 없는 사랑", verses: [31, 39], theme: "성" },
];

const SPACE_TYPES: Record<number, SpaceType> = {
  1: "blue", 2: "blue", 3: "red", 4: "blue", 5: "item", 6: "blue", 7: "red", 8: "event",
  9: "blue", 10: "blue", 11: "red", 12: "blue", 13: "item", 14: "blue", 15: "red", 16: "blue", 17: "blue",
  18: "red", 19: "blue", 20: "red", 21: "blue", 22: "red", 23: "red", 24: "blue", 25: "red",
  26: "event", 27: "blue", 28: "item", 29: "blue", 30: "blue",
  31: "event", 32: "blue", 33: "blue", 34: "item", 35: "event", 36: "blue", 37: "blue", 38: "red", 39: "blue",
};

const RED_MODES: RedMode[] = ["blank", "firstWord", "noHint"];
const EVENT_MODES: EventMode[] = ["relay", "threeVerses"];

// ---- 좌표 (viewBox 1000 x 640) ----
export const BOARD_W = 1000;
export const BOARD_H = 640;
export const T_POS = { x: 500, y: 82 };
export const B_POS = { x: 500, y: 572 };

type Pt = { x: number; y: number };
/** 3차 베지어 곡선 하나 = [p0, c1, c2, p3] */
type Cubic = [Pt, Pt, Pt, Pt];

function cubicAt([p0, c1, c2, p3]: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

/** 곡선들을 잇는 경로를 호 길이 기준으로 샘플링 */
function samplePath(curves: Cubic[], steps = 120): { pts: Pt[]; cum: number[] } {
  const pts: Pt[] = [];
  const cum: number[] = [];
  let acc = 0;
  for (const c of curves) {
    let prev = cubicAt(c, 0);
    if (pts.length === 0) {
      pts.push(prev);
      cum.push(0);
    }
    for (let i = 1; i <= steps; i++) {
      const q = cubicAt(c, i / steps);
      acc += Math.hypot(q.x - prev.x, q.y - prev.y);
      pts.push(q);
      cum.push(acc);
      prev = q;
    }
  }
  return { pts, cum };
}

function pointAtLength(sp: { pts: Pt[]; cum: number[] }, d: number): Pt {
  const { pts, cum } = sp;
  if (d <= 0) return pts[0];
  const total = cum[cum.length - 1];
  if (d >= total) return pts[pts.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < d) lo = mid;
    else hi = mid;
  }
  const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return { x: Math.round(pts[lo].x + (pts[hi].x - pts[lo].x) * t), y: Math.round(pts[lo].y + (pts[hi].y - pts[lo].y) * t) };
}

/** 경로 위에 n개 칸을 균등 배치. startPad/endPad: 양 끝점에서 띄울 거리 */
function along(curves: Cubic[], n: number, startPad: number, endPad: number): Pt[] {
  const sp = samplePath(curves);
  const total = sp.cum[sp.cum.length - 1];
  const usable = total - startPad - endPad;
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) out.push(pointAtLength(sp, startPad + (n === 1 ? usable / 2 : (usable * k) / (n - 1))));
  return out;
}

// 길 모양 — 부드러운 타원형 고리 + 가운데 길
const J_RIGHT = { x: 932, y: 330 }; // 11 ↔ 12 꺾임(곡선이라 눈에 안 띔)
const J_LEFT = { x: 68, y: 330 }; // 30 ↔ 31
const ROAD_CURVES: Record<RoadId, Cubic[]> = {
  1: [[T_POS, { x: 700, y: 60 }, { x: 932, y: 150 }, J_RIGHT]],
  2: [[J_RIGHT, { x: 932, y: 500 }, { x: 760, y: 585 }, B_POS]],
  3: [[B_POS, { x: 560, y: 430 }, { x: 440, y: 230 }, T_POS]],
  4: [[B_POS, { x: 240, y: 585 }, { x: 68, y: 500 }, J_LEFT]],
  5: [[J_LEFT, { x: 68, y: 150 }, { x: 300, y: 60 }, T_POS]],
};

function toD(curves: Cubic[]): string {
  const [first] = curves;
  let d = `M ${first[0].x} ${first[0].y}`;
  for (const [, c1, c2, p3] of curves) d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`;
  return d;
}

/** 렌더링용 SVG path d */
export const ROAD_D: Record<RoadId, string> = {
  1: toD(ROAD_CURVES[1]),
  2: toD(ROAD_CURVES[2]),
  3: toD(ROAD_CURVES[3]),
  4: toD(ROAD_CURVES[4]),
  5: toD(ROAD_CURVES[5]),
};

/** 길 이름 표시 위치 */
export const ROAD_LABEL_POS: Record<RoadId, Pt> = {
  1: { x: 735, y: 215 },
  2: { x: 780, y: 470 },
  3: { x: 615, y: 330 },
  4: { x: 275, y: 470 },
  5: { x: 240, y: 215 },
};

const PAD_T = 70;
const PAD_B = 62;
const PAD_J = 30;

function buildSpaces(): Space[] {
  const coords: Record<number, Pt> = {};
  const assign = (road: RoadId, from: number, to: number, pts: Pt[]) => {
    for (let v = from; v <= to; v++) coords[v] = pts[v - from];
  };
  assign(1, 1, 11, along(ROAD_CURVES[1], 11, PAD_T, PAD_J));
  assign(2, 12, 17, along(ROAD_CURVES[2], 6, PAD_J, PAD_B));
  assign(3, 18, 25, along(ROAD_CURVES[3], 8, PAD_B, PAD_T));
  assign(4, 26, 30, along(ROAD_CURVES[4], 5, PAD_B, PAD_J));
  assign(5, 31, 39, along(ROAD_CURVES[5], 9, PAD_J, PAD_T));

  let red = 0;
  let ev = 0;
  const spaces: Space[] = [];
  for (let v = 1; v <= 39; v++) {
    const road = ROADS.find((r) => v >= r.verses[0] && v <= r.verses[1])!.id;
    const type = SPACE_TYPES[v];
    const s: Space = { id: v, road, type, ...coords[v] };
    if (type === "red") s.redMode = RED_MODES[red++ % RED_MODES.length];
    if (type === "event") s.eventMode = EVENT_MODES[ev++ % EVENT_MODES.length];
    spaces.push(s);
  }
  return spaces;
}

export const SPACES: Space[] = buildSpaces();
export const SPACE_BY_ID: Record<number, Space> = Object.fromEntries(SPACES.map((s) => [s.id, s]));

export type PathChoice = "center" | "left";

/** 다음 칸. 17에서는 갈림길 선택이 필요하므로 choice 없으면 null */
export function nextSpace(pos: number, choice?: PathChoice): number | null {
  if (pos === T) return 1;
  if (pos === FORK_FROM) {
    if (!choice) return null;
    return choice === "center" ? CENTER_START : LEFT_START;
  }
  if (pos === 25 || pos === 39) return 1; // T를 지나 1절로
  return pos + 1;
}

/** pos에서 앞으로 BFS 거리 (갈림길은 양쪽 다 탐색) */
export function forwardDistances(from: number): Map<number, number> {
  const dist = new Map<number, number>();
  const queue: [number, number][] = [[from, 0]];
  const seen = new Set<number>([from]);
  while (queue.length) {
    const [p, d] = queue.shift()!;
    const nexts = p === FORK_FROM ? [CENTER_START, LEFT_START] : [nextSpace(p)!];
    for (const n of nexts) {
      if (seen.has(n)) continue;
      seen.add(n);
      dist.set(n, d + 1);
      queue.push([n, d + 1]);
    }
  }
  return dist;
}

export const SPACE_LABEL: Record<SpaceType, string> = {
  blue: "파란 칸",
  red: "빨간 칸",
  event: "이벤트 칸",
  item: "아이템 칸",
};

export const RED_MODE_LABEL: Record<RedMode, string> = {
  blank: "빈칸 채우기",
  firstWord: "첫 단어만 보고",
  noHint: "힌트 없음",
};

export const EVENT_MODE_LABEL: Record<EventMode, string> = {
  relay: "팀 전원 릴레이 (한 명씩 이어 말하기)",
  threeVerses: "앞뒤 절 포함 3절 연속",
};
