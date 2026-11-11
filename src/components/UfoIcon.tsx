/** 상점 UFO 아이콘 (보드의 상점 그림을 작게 줄인 것) */
export function UfoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-20 -18 40 32" aria-hidden>
      <path d="M -9 -2 A 9 9 0 0 1 9 -2 Z" fill="#7dd3fc" stroke="#e0f2fe" strokeWidth={1} />
      <ellipse cx={-3} cy={-7} rx={2.4} ry={1.4} fill="#fff" opacity={0.75} />
      <ellipse cx={0} cy={2} rx={18} ry={6} fill="#8b5cf6" stroke="#f5f3ff" strokeWidth={1.2} />
      {[-11, -4, 4, 11].map((x) => (
        <circle key={x} cx={x} cy={3.6 - Math.abs(x) * 0.08} r={1.6} fill="#fde047" />
      ))}
    </svg>
  );
}
