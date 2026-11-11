// 로마서 8장 보드 — 마리오 파티식 그래프 맵 (갈림길 3개)
// 칸 id = 절 번호(1~39). 0 = T(출발점·상점, 암송 없음).
//
//   T ─ 1~2 ─┬─ 3~6 (윗길) ──┬─ 11~15 ─┬─ 16~22 (바깥길) ─┬─ 🏪 ─ 28~30 ─┬─ 31~34 ─┬─ 39 ─ T
//            └─ 7~10 (아랫길)┘          └─ 23~27 (지름길) ─┘              └─ 35~38 ─┘
//
// 칸 유형은 본문 길이를 받기 전의 임시 배치입니다. 확정 시 SPACE_TYPES만 고치면 됩니다.

export type SpaceType = "blue" | "red" | "event" | "item" | "happening" | "bless";
export type RedMode = "blank" | "firstWord" | "noHint";
export type EventMode = "twoVerses" | "threeVerses";
export type RouteId = "c0" | "a1" | "a2" | "c1" | "b1" | "b2" | "c2" | "d1" | "d2" | "c3";

export interface Space {
  id: number; // 절 번호
  route: RouteId;
  type: SpaceType;
  redMode?: RedMode;
  eventMode?: EventMode;
  x: number;
  y: number;
}

export const T = 0; // 출발점
export const SHOP_AT = 28; // 이 칸으로 들어가기 직전(합류점, 22절→28절·27절→28절 사이)에 상점

export interface ForkOption {
  to: number;
  label: string;
  desc: string;
}
/** 갈림길: 이 칸 다음에 선택. 옵션 순서 = choose_path.option */
export const FORKS: Record<number, ForkOption[]> = {
  2: [
    { to: 3, label: "윗길", desc: "4칸 · 보통" },
    { to: 7, label: "아랫길", desc: "4칸 · 어려움" },
  ],
  15: [
    { to: 16, label: "바깥길", desc: "7칸 · 넉넉함" },
    { to: 23, label: "지름길", desc: "5칸 · 어려움" },
  ],
  30: [
    { to: 31, label: "왼쪽길", desc: "4칸 · 축복" },
    { to: 35, label: "안쪽길", desc: "4칸 · 아이템" },
  ],
};

/** 각 길: 절 범위, 끝나면 어디로 가는지(0 = T를 지나 1절로) */
interface Route {
  id: RouteId;
  verses: [number, number];
  next: number;
}
export const ROUTES: Route[] = [
  { id: "c0", verses: [1, 2], next: -1 }, // 2는 갈림길
  { id: "a1", verses: [3, 6], next: 11 },
  { id: "a2", verses: [7, 10], next: 11 },
  { id: "c1", verses: [11, 15], next: -1 }, // 15는 갈림길
  { id: "b1", verses: [16, 22], next: 28 },
  { id: "b2", verses: [23, 27], next: 28 },
  { id: "c2", verses: [28, 30], next: -1 }, // 30은 갈림길
  { id: "d1", verses: [31, 34], next: 39 },
  { id: "d2", verses: [35, 38], next: 39 },
  { id: "c3", verses: [39, 39], next: 0 }, // 두 갈래가 만나는 칸
];

// 본문 길이 기준 배치 (긴 절 → 빨간 칸). 길이 순: 3,11,26,29,15,17,9,27,35,23,12,34,20,30 …
// 어려운 길(10~12, 26~30)은 빨간 칸 비중을 높게.
const SPACE_TYPES: Record<number, SpaceType> = {
  1: "blue", 2: "blue", 3: "red",
  4: "blue", 5: "blue", 6: "event", 7: "item",
  8: "blue", 9: "red", 10: "red", 11: "red",
  12: "blue", 13: "blue", 14: "bless", 15: "red", 16: "blue",
  17: "red", 18: "blue", 19: "happening", 20: "blue", 21: "event", 22: "blue", 23: "red",
  24: "happening", 25: "item", 26: "red", 27: "red", 28: "blue",
  29: "red", 30: "blue",
  31: "blue", 32: "blue", 33: "bless", 34: "red", 35: "event",
  36: "blue", 37: "item", 38: "event", 39: "blue",
};

const RED_MODES: RedMode[] = ["blank", "firstWord", "noHint"];
const EVENT_MODES: EventMode[] = ["twoVerses", "threeVerses"];

// ---- 좌표 (viewBox 1000 x 640) ----
export const BOARD_W = 1000;
export const BOARD_H = 640;
/** 출발 표시(START) 위치: 길 위가 아니라 1절 옆에 따로 둔다. 39 → 1은 길이 바로 이어짐 */
export const T_POS = { x: 96, y: 80 };

type Pt = { x: number; y: number };
type Cubic = [Pt, Pt, Pt, Pt];

function cubicAt([p0, c1, c2, p3]: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

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
  // 칸이 하나뿐이면 가운데에, 단 startPad가 0(합류 칸)이면 시작점에 둔다
  for (let k = 0; k < n; k++) out.push(pointAtLength(sp, startPad + (n === 1 ? (startPad === 0 ? 0 : usable / 2) : (usable * k) / (n - 1))));
  return out;
}

// 분기·합류 지점 (칸이 아니라 길이 만나는 곳)
const F1 = { x: 300, y: 105 }; // 2 다음
const M1 = { x: 640, y: 150 }; // 11 앞
const F2 = { x: 915, y: 295 }; // 15 다음
const M2 = { x: 430, y: 530 }; // 28 앞 (상점)
const F3 = { x: 230, y: 545 }; // 30 다음
const M4 = { x: 178, y: 208 }; // 39 앞 (왼쪽길·안쪽길 합류)

// 각 길의 곡선 (시작점·끝점은 분기/합류 지점 또는 T)
const ROUTE_CURVES: Record<RouteId, Cubic[]> = {
  c0: [], // 39~1~2는 c3 곡선 하나에 함께 배치 (아래 LOOP_CURVE)
  a1: [[F1, { x: 400, y: 20 }, { x: 560, y: 30 }, M1]], // 윗길: 위로 활
  a2: [[F1, { x: 420, y: 215 }, { x: 560, y: 225 }, M1]], // 아랫길: 아래로 처진 활
  c1: [[M1, { x: 790, y: 100 }, { x: 930, y: 180 }, F2]],
  b1: [[F2, { x: 960, y: 560 }, { x: 700, y: 650 }, M2]], // 바깥길: 오른쪽 아래를 크게 돎
  b2: [[F2, { x: 780, y: 400 }, { x: 560, y: 380 }, M2]], // 지름길: 안쪽으로 질러감
  c2: [[M2, { x: 340, y: 560 }, { x: 270, y: 560 }, F3]],
  d1: [[F3, { x: 30, y: 575 }, { x: 10, y: 270 }, M4]], // 왼쪽길: 가장자리로 크게
  d2: [[F3, { x: 345, y: 470 }, { x: 350, y: 280 }, M4]], // 안쪽길: 보드 안쪽으로 불룩하게
  c3: [[M4, { x: 196, y: 160 }, { x: 246, y: 112 }, F1]], // 39 → 1 → 2 (짧고 완만하게 이어짐)
};

const PAD_J = 34; // 분기/합류 지점 주변
const PAD_FORK_OUT = 70; // 갈림길에서 갈라진 두 길의 첫 칸끼리 겹치지 않도록
const PAD_MERGE = 66; // 합류 칸 앞 칸과의 간격 (합류 칸은 만나는 지점 바로 위에 놓임)
/** 두 길이 만나는 지점에서 시작하는 길: 첫 칸을 합류 지점에 정확히 둔다 */
const MERGE_ROUTES: RouteId[] = ["c1", "c2"];
const MERGE_TARGETS = new Set([11, 28, 39]);

function toD(curves: Cubic[]): string {
  if (curves.length === 0) return "";
  const [first] = curves;
  let d = `M ${first[0].x} ${first[0].y}`;
  for (const [, c1, c2, p3] of curves) d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`;
  return d;
}

export const ROUTE_D: Record<RouteId, string> = Object.fromEntries(
  (Object.keys(ROUTE_CURVES) as RouteId[]).map((k) => [k, toD(ROUTE_CURVES[k])]),
) as Record<RouteId, string>;

export const JUNCTIONS = { F1, M1, F2, M2, F3, M4 };
/** 상점 그림 위치: 합류 칸(28) 바로 위에 붙여서 */
export const SHOP_POS = { x: M2.x - 18, y: M2.y - 40 };
export const FORK_POINTS: Record<number, Pt> = { 2: F1, 15: F2, 30: F3 };

function buildSpaces(): Space[] {
  const coords: Record<number, Pt> = {};
  for (const r of ROUTES) {
    const [a, b] = r.verses;
    const n = b - a + 1;
    if (r.id === "c0" || r.id === "c3") continue;
    // 갈림길 칸(다음이 -1)은 갈라지는 지점에, 합류 칸은 만나는 지점에 정확히 놓는다
    // 왼쪽길(d1)은 길이가 길어 첫 칸(31)을 30에서 조금 더 띄운다
    const startPad = MERGE_ROUTES.includes(r.id) ? 0 : r.id === "d1" ? 100 : PAD_FORK_OUT;
    const endPad = r.next === -1 ? 0 : MERGE_TARGETS.has(r.next) ? PAD_MERGE : PAD_J;
    const pts = along(ROUTE_CURVES[r.id], n, startPad, endPad);
    for (let v = a; v <= b; v++) coords[v] = pts[v - a];
  }
  // 39(합류) → 1 → 2(갈림길): 한 곡선 위에 균등 배치
  const loop = along(ROUTE_CURVES.c3, 3, 0, 0);
  coords[39] = loop[0];
  coords[1] = loop[1];
  coords[2] = loop[2];
  let red = 0;
  let ev = 0;
  const spaces: Space[] = [];
  for (let v = 1; v <= 39; v++) {
    const route = ROUTES.find((r) => v >= r.verses[0] && v <= r.verses[1])!.id;
    const type = SPACE_TYPES[v];
    const s: Space = { id: v, route, type, ...coords[v] };
    if (type === "red") s.redMode = RED_MODES[red++ % RED_MODES.length];
    if (type === "event") s.eventMode = EVENT_MODES[ev++ % EVENT_MODES.length];
    spaces.push(s);
  }
  return spaces;
}

export const SPACES: Space[] = buildSpaces();
export const SPACE_BY_ID: Record<number, Space> = Object.fromEntries(SPACES.map((s) => [s.id, s]));

/** 다음 칸. 갈림길에서는 choice(옵션 인덱스)가 없으면 null. T를 지나 1절로 갈 때는 1 */
export function nextSpace(pos: number, choice?: number): number | null {
  if (pos === T) return 1;
  const fork = FORKS[pos];
  if (fork) {
    if (choice === undefined || !fork[choice]) return null;
    return fork[choice].to;
  }
  const r = ROUTES.find((x) => pos >= x.verses[0] && pos <= x.verses[1])!;
  if (pos < r.verses[1]) return pos + 1;
  return r.next === 0 ? 1 : r.next;
}

/** 모든 다음 칸 (갈림길이면 전부) */
export function nextOptions(pos: number): number[] {
  const fork = FORKS[pos];
  if (fork) return fork.map((f) => f.to);
  const n = nextSpace(pos);
  return n === null ? [] : [n];
}

/** 이 칸에서 다음 칸으로 갈 때 상점을 지나는가 */
export function passesShop(pos: number): boolean {
  return nextOptions(pos).includes(SHOP_AT) && pos !== SHOP_AT;
}

/** pos에서 앞으로 BFS 거리 (갈림길은 양쪽 다 탐색) */
const DIST_CACHE = new Map<number, Map<number, number>>();
/** 보드는 고정이므로 결과를 기억해 둔다. 돌려받은 Map은 읽기 전용으로 쓸 것 */
export function forwardDistances(from: number): Map<number, number> {
  const cached = DIST_CACHE.get(from);
  if (cached) return cached;
  const dist = new Map<number, number>();
  DIST_CACHE.set(from, dist);
  const queue: [number, number][] = [[from, 0]];
  const seen = new Set<number>([from]);
  while (queue.length) {
    const [p, d] = queue.shift()!;
    for (const n of nextOptions(p)) {
      if (seen.has(n)) continue;
      seen.add(n);
      dist.set(n, d + 1);
      queue.push([n, d + 1]);
    }
  }
  return dist;
}

export const SPACE_LABEL: Record<SpaceType, string> = {
  blue: "일반 칸",
  red: "어려운 칸",
  event: "이벤트 칸",
  item: "선물 칸",
  happening: "해프닝 칸",
  bless: "축복 칸",
};

export const RED_MODE_LABEL: Record<RedMode, string> = {
  blank: "빈칸 채우기",
  firstWord: "첫 단어만 보고",
  noHint: "힌트 없음",
};

export const EVENT_MODE_LABEL: Record<EventMode, string> = {
  twoVerses: "다음 절까지 2절 연속",
  threeVerses: "앞뒤 절 포함 3절 연속",
};
