import type { ItemId } from "@/game/items";

/** 아이템 아이콘 (자체 SVG, 24×24 기준) */
export function ItemIcon({ id, size = 24, className }: { id: ItemId; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
}

const die = (x: number, y: number, s: number, fill: string, pips: [number, number][]) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={0} y={0} width={10} height={10} rx={2.2} fill={fill} stroke="#1e293b" strokeWidth={0.8} />
    {pips.map(([px, py], i) => (
      <circle key={i} cx={px} cy={py} r={1.1} fill="#1e293b" />
    ))}
  </g>
);

const ICONS: Record<ItemId, React.JSX.Element> = {
  tripleDice: (
    <g>
      {die(1, 11, 1.05, "#fff", [[2.5, 2.5], [7.5, 7.5], [5, 5]])}
      {die(12, 11, 1.05, "#fde68a", [[2.5, 2.5], [7.5, 2.5], [2.5, 7.5], [7.5, 7.5]])}
      {die(6.5, 1.5, 1.05, "#bae6fd", [[5, 5]])}
    </g>
  ),
  selectDice: (
    <g>
      {die(2, 7, 1.3, "#fff", [[2.5, 2.5], [5, 5], [7.5, 7.5]])}
      <path d="M17 4 l4 4 l-4 4 M21 8 h-7" fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20 l4 -4 l-4 -4 M21 16 h-7" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  warpPipe: (
    <g>
      <rect x={6} y={9} width={12} height={12} rx={1} fill="#22c55e" stroke="#14532d" strokeWidth={1} />
      <rect x={4} y={5} width={16} height={6} rx={1.5} fill="#4ade80" stroke="#14532d" strokeWidth={1} />
      <ellipse cx={12} cy={5.5} rx={6} ry={1.8} fill="#166534" />
    </g>
  ),
  goldenPipe: (
    <g>
      <rect x={6} y={9} width={12} height={12} rx={1} fill="#f59e0b" stroke="#78350f" strokeWidth={1} />
      <rect x={4} y={5} width={16} height={6} rx={1.5} fill="#fcd34d" stroke="#78350f" strokeWidth={1} />
      <ellipse cx={12} cy={5.5} rx={6} ry={1.8} fill="#b45309" />
      <path d="M12 1.5 l1 2 l2.2 .3 l-1.6 1.5 l.4 2.2 l-2 -1 l-2 1 l.4 -2.2 l-1.6 -1.5 l2.2 -.3 z" fill="#fff7c2" />
    </g>
  ),
  doubleTalent: (
    <g>
      <circle cx={12} cy={12} r={9.5} fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
      <circle cx={12} cy={12} r={6.5} fill="none" stroke="#92400e" strokeWidth={1} opacity={0.6} />
      <text x={12} y={15.5} textAnchor="middle" fontSize={9} fontWeight={900} fill="#78350f" fontFamily="sans-serif">
        ×2
      </text>
    </g>
  ),
  hint: (
    <g>
      <path d="M12 2.5 a6.5 6.5 0 0 0 -3.6 11.9 c.6 .5 1 1.2 1 2 v.6 h5.2 v-.6 c0 -.8 .4 -1.5 1 -2 A6.5 6.5 0 0 0 12 2.5 z" fill="#fde047" stroke="#854d0e" strokeWidth={1.1} />
      <rect x={9.5} y={18} width={5} height={3.5} rx={1} fill="#94a3b8" stroke="#334155" strokeWidth={0.8} />
      <path d="M12 6 v4" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
    </g>
  ),
  starCoupon: (
    <g>
      <path d="M3 7 h18 v3.5 a2 2 0 0 0 0 4 V18 H3 v-3.5 a2 2 0 0 0 0 -4 z" fill="#f472b6" stroke="#831843" strokeWidth={1.1} />
      <path d="M12 9 l1.2 2.4 l2.6 .4 l-1.9 1.8 l.5 2.6 l-2.4 -1.2 l-2.4 1.2 l.5 -2.6 l-1.9 -1.8 l2.6 -.4 z" fill="#fff7c2" />
      <path d="M8 7 v11" stroke="#831843" strokeWidth={0.8} strokeDasharray="1.5 1.5" />
    </g>
  ),
};
