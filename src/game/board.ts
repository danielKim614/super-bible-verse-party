// 로마서 8장 보드 — 마리오 파티식 그래프 맵 (갈림길 3개)
// 칸 id = 절 번호(1~39). 0 = T(출발점). 101~103 = 이벤트 칸(🎲, 절이 아니라 도착하면 랜덤으로 뽑음)
//
//   T ─ 1~2 ─┬─ 3~6 (윗길) ──┬─ 11~12·🎲·13~15 ─┬─ 16~21·🎲 (바깥길) ─┬─ 🏪 ─ 28~30 ─┬─ 31·🎲·32~34 (왼쪽길) ─┬─ 39 ─ T
//            └─ 7~10 (아랫길)┘                    └─ 22~27 (지름길) ────┘              └─ 35~38 (안쪽길) ───────┘

export type SpaceType = "blue" | "red" | "event" | "item" | "happening" | "bless";
export type RedMode = "blank" | "firstWord" | "noHint";
export type RouteId = "c0" | "a1" | "a2" | "c1" | "b1" | "b2" | "c2" | "d1" | "d2" | "c3";

export interface Space {
  id: number; // 절 번호(1~39) 또는 이벤트 칸(101~)
  /** 이 칸의 절. 이벤트 칸은 없음(도착하면 랜덤으로 뽑음) */
  verse?: number;
  /** 보드에 쓰는 이름: 절 번호, 이벤트 칸은 🎲 */
  label: string;
  route: RouteId;
  type: SpaceType;
  redMode?: RedMode;
  x: number;
  y: number;
}

/** 이벤트 칸 id (절이 아님) */
export const EVENT_SPACES = [101, 102, 103] as const;
export function isVerseSpace(id: number): boolean {
  return id >= 1 && id <= 39;
}

export const T = 0; // 출발점
export const SHOP_AT = 28; // 처음 상점 위치: 바깥길·지름길이 만나는 28절

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
    { to: 16, label: "바깥길", desc: "7칸 · 넉넉함·이벤트" },
    { to: 22, label: "지름길", desc: "6칸 · 어려움" },
  ],
  30: [
    { to: 31, label: "왼쪽길", desc: "5칸 · 축복·이벤트" },
    { to: 35, label: "안쪽길", desc: "4칸 · 선물" },
  ],
};

/** 각 길: 칸 순서, 끝나면 어디로 가는지(-1 = 마지막 칸이 갈림길, 0 = T를 지나 1절로) */
interface Route {
  id: RouteId;
  spaces: number[];
  next: number;
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const ROUTES: Route[] = [
  { id: "c0", spaces: [1, 2], next: -1 }, // 2는 갈림길
  { id: "a1", spaces: range(3, 6), next: 11 },
  { id: "a2", spaces: range(7, 10), next: 11 },
  // 이벤트 칸(🎲)은 칸 사이가 넉넉한 길에 나눠 둔다
  { id: "c1", spaces: [11, 12, 101, 13, 14, 15], next: -1 }, // 15는 갈림길
  { id: "b1", spaces: [16, 17, 18, 19, 20, 21, 102], next: 28 },
  { id: "b2", spaces: range(22, 27), next: 28 },
  { id: "c2", spaces: range(28, 30), next: -1 }, // 30은 갈림길
  { id: "d1", spaces: [31, 103, 32, 33, 34], next: 39 },
  { id: "d2", spaces: range(35, 38), next: 39 },
  { id: "c3", spaces: [39], next: 0 }, // 두 갈래가 만나는 칸
];
const ROUTE_OF: Record<number, Route> = Object.fromEntries(ROUTES.flatMap((r) => r.spaces.map((id) => [id, r])));

// 본문 길이 기준 배치 (긴 절 → 빨간 칸). 길이 순: 3,11,26,29,15,17,9,27,35,23,12,34,20,30 …
// 어려운 길(10~12, 26~30)은 빨간 칸 비중을 높게. 이벤트 칸(🎲)은 절과 따로 101~103.
const SPACE_TYPES: Record<number, SpaceType> = {
  1: "blue", 2: "blue", 3: "red",
  4: "blue", 5: "blue", 6: "happening", 7: "item",
  8: "blue", 9: "red", 10: "red", 11: "red",
  12: "blue", 13: "blue", 14: "bless", 15: "red", 16: "blue",
  17: "red", 18: "blue", 19: "happening", 20: "blue", 21: "blue", 22: "blue", 23: "red",
  24: "blue", 25: "item", 26: "red", 27: "red", 28: "blue",
  29: "red", 30: "blue",
  31: "blue", 32: "blue", 33: "bless", 34: "red", 35: "red",
  36: "blue", 37: "item", 38: "blue", 39: "blue",
  101: "event", 102: "event", 103: "event",
};

const RED_MODES: RedMode[] = ["blank", "firstWord", "noHint"];

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
  a2: [[F1, { x: 420, y: 262 }, { x: 570, y: 272 }, M1]], // 아랫길: 아래로 처진 활 (칸 사이가 답답하지 않게 조금 더 깊게)
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

/** 상점 그림 위치: 합류 칸(28) 바로 위에 붙여서 */
export const SHOP_POS = { x: M2.x - 18, y: M2.y - 40 };

function buildSpaces(): Space[] {
  const coords: Record<number, Pt> = {};
  for (const r of ROUTES) {
    const n = r.spaces.length;
    if (r.id === "c0" || r.id === "c3") continue;
    // 갈림길 칸(다음이 -1)은 갈라지는 지점에, 합류 칸은 만나는 지점에 정확히 놓는다
    // 왼쪽길(d1)은 길이가 길어 첫 칸(31)을 30에서 조금 더 띄운다
    const startPad = MERGE_ROUTES.includes(r.id) ? 0 : r.id === "d1" ? 100 : PAD_FORK_OUT;
    const endPad = r.next === -1 ? 0 : MERGE_TARGETS.has(r.next) ? PAD_MERGE : PAD_J;
    const pts = along(ROUTE_CURVES[r.id], n, startPad, endPad);
    r.spaces.forEach((id, k) => (coords[id] = pts[k]));
  }
  // 39(합류) → 1 → 2(갈림길): 한 곡선 위에 균등 배치
  const loop = along(ROUTE_CURVES.c3, 3, 0, 0);
  coords[39] = loop[0];
  coords[1] = loop[1];
  coords[2] = loop[2];
  let red = 0;
  const spaces: Space[] = [];
  for (const id of [...range(1, 39), ...EVENT_SPACES]) {
    const route = ROUTE_OF[id].id;
    const type = SPACE_TYPES[id];
    const verse = isVerseSpace(id) ? id : undefined;
    const s: Space = { id, verse, label: verse ? String(verse) : "🎲", route, type, ...coords[id] };
    if (type === "red") s.redMode = RED_MODES[red++ % RED_MODES.length];
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
  const r = ROUTE_OF[pos];
  if (!r) return null;
  const k = r.spaces.indexOf(pos);
  if (k < r.spaces.length - 1) return r.spaces[k + 1];
  return r.next === 0 ? 1 : r.next;
}

/** 모든 다음 칸 (갈림길이면 전부) */
export function nextOptions(pos: number): number[] {
  const fork = FORKS[pos];
  if (fork) return fork.map((f) => f.to);
  const n = nextSpace(pos);
  return n === null ? [] : [n];
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

/** 칸 이름: "12절", 이벤트 칸은 "🎲 이벤트 칸 1", 출발은 "출발" */
export function spaceName(id: number): string {
  if (id === 0) return "출발";
  if (isVerseSpace(id)) return `${id}절`;
  const k = (EVENT_SPACES as readonly number[]).indexOf(id);
  return k >= 0 ? `🎲 이벤트 칸 ${k + 1}` : `${id}번 칸`;
}

/** 이벤트 칸에서 뽑힌 절 수 → 이름 */
export function eventCountLabel(n: number): string {
  return n <= 1 ? "1절" : `${n}절 연속`;
}
