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

/**
 * 결과 표시. 더블 다이스(2~12)는 두 개의 주사위 눈으로 분해해서 보여준다
 * (실제 눈 조합은 기록하지 않으므로 합계만 맞는 대표 조합).
 */
export function DieBadge({ value, double, big }: { value: number; double?: boolean; big?: boolean }) {
  const faces = double ? splitDouble(value) : [Math.min(6, Math.max(1, value))];
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

function splitDouble(v: number): [number, number] {
  const a = Math.min(6, Math.max(1, Math.ceil(v / 2)));
  const b = Math.min(6, Math.max(1, v - a));
  return [a, b];
}
