"use client";

/** 주사위 결과 뱃지: 실제 눈이 그려진 작은 주사위 + 숫자 */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export function DieFace({ face, size = 28 }: { face: number; size?: number }) {
  const id = `die-grad-${face}`;
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden className="drop-shadow-[0_2px_3px_rgba(0,0,0,.45)]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe3f0" />
        </linearGradient>
      </defs>
      <rect x={-19} y={-19} width={38} height={38} rx={9} fill={`url(#${id})`} />
      <rect x={-19} y={-19} width={38} height={38} rx={9} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeOpacity={0.6} />
      {(PIPS[face] ?? PIPS[1]).map(([px, py], i) => (
        <circle key={i} cx={px * 10} cy={py * 10} r={3.6} fill="#1e1b4b" />
      ))}
    </svg>
  );
}

/** 결과 표시: 실제 나온 눈(faces)이 있으면 그대로, 없으면 합계를 주사위 눈으로 분해해 표시 */
export function DieBadge({ value, faces: given, big }: { value: number; faces?: number[]; big?: boolean }) {
  const faces = given && given.length ? given : splitSum(value);
  const size = big ? 34 : 24;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-2xl bg-white/10 ring-1 ring-white/15 ${big ? "px-4 py-2" : "px-3 py-1.5"}`}
      title={`주사위 ${value}`}
    >
      <span className="flex gap-1">
        {faces.map((f, i) => (
          <DieFace key={i} face={f} size={size} />
        ))}
      </span>
      <span className={`font-display text-amber-300 leading-none ${big ? "text-4xl" : "text-2xl"}`}>{value}</span>
    </span>
  );
}

export function splitSum(v: number): number[] {
  const n = Math.max(1, Math.ceil(v / 6));
  const out: number[] = [];
  let rest = v;
  for (let i = 0; i < n; i++) {
    const left = n - i - 1;
    const f = Math.min(6, Math.max(1, rest - left));
    out.push(f);
    rest -= f;
  }
  return out;
}
