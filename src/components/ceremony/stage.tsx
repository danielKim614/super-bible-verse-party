"use client";

/** 시상식 무대: 배경, 금테 카드, 보너스 스타 카드, 시상대, 폰 안내 화면 */
import { finalRanking } from "@/game/reducer";
import type { Award, TeamInfo } from "@/game/types";
import { TeamAvatar } from "../TeamAvatar";

/** 무대 배경: 반짝이는 별, 위에서 내리쬐는 금빛 조명, 바닥 빛 */
export function StageBackdrop({ beams = true }: { beams?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {beams && (
        <>
      <div className="absolute -top-10 left-[12%] w-[38%] h-[85%] origin-top -rotate-12 bg-gradient-to-b from-amber-200/25 via-amber-200/5 to-transparent [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
      <div className="absolute -top-10 right-[12%] w-[38%] h-[85%] origin-top rotate-12 bg-gradient-to-b from-sky-200/20 via-sky-200/5 to-transparent [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
        </>
      )}
      <div className="absolute bottom-[-18%] left-1/2 -translate-x-1/2 w-[90%] h-[40%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(253,224,71,0.18),transparent_70%)]" />
      {Array.from({ length: 46 }, (_, k) => (
        <span
          key={k}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${(k * 53) % 100}%`,
            top: `${(k * 37) % 100}%`,
            width: 1.5 + (k % 3),
            height: 1.5 + (k % 3),
            opacity: 0.35 + (k % 4) * 0.15,
            animationDelay: `${(k % 9) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

/** 금테 카드 */
export function GoldCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-3xl p-[2px] bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-700 shadow-[0_12px_40px_rgba(251,191,36,0.22)] ${className}`}>
      <div className="relative h-full rounded-[22px] bg-[#151b52]/95 overflow-hidden">{children}</div>
    </div>
  );
}

export const AWARD_EMOJI: Record<string, string> = { recite: "📖", talent: "💰", challenge: "🔥" };

/** 보너스 스타 카드: 메달 + 제목 + 받은 팀 */
export function AwardCard({ award: a, teamById, big, fresh }: { award: Award; teamById: Record<string, TeamInfo>; big: boolean; fresh: boolean }) {
  return (
    <GoldCard className="animate-pop">
      {fresh && <span className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg] animate-card-shine" />}
      <div className={`relative text-center ${big ? "p-6" : "p-4"}`}>
        <div
          className={`mx-auto rounded-full bg-gradient-to-b from-yellow-100 to-amber-500 ring-4 ring-yellow-100/30 shadow-[0_6px_20px_rgba(251,191,36,0.45)] flex items-center justify-center ${big ? "w-20 h-20 text-5xl" : "w-12 h-12 text-2xl"}`}
          aria-hidden
        >
          {AWARD_EMOJI[a.key] ?? "⭐"}
        </div>
        <div className={`font-display text-amber-200 ${big ? "text-4xl mt-3" : "text-xl mt-2"}`}>⭐ {a.title}</div>
        <div className={`text-white/70 ${big ? "text-lg" : "text-xs"}`}>{a.desc}</div>
        <div className={`flex flex-wrap justify-center gap-2 ${big ? "mt-5" : "mt-3"}`}>
          {a.winners.length === 0 && <span className="text-white/50">해당 팀 없음</span>}
          {a.winners.map((w) => (
            <div key={w} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-200 to-amber-400 text-indigo-950 pl-1.5 pr-3 py-1.5 shadow-lg">
              <TeamAvatar team={teamById[w]} size={big ? 44 : 28} />
              <span className={`font-display ${big ? "text-2xl" : "text-base"}`}>{teamById[w]?.name}</span>
              <span className={`rounded-full bg-indigo-950/15 px-2 font-display ${big ? "text-lg" : "text-xs"}`}>{a.values[w]}</span>
            </div>
          ))}
        </div>
      </div>
    </GoldCard>
  );
}

export const PODIUM: Record<number, { h: number; block: string; text: string }> = {
  1: { h: 170, block: "from-yellow-200 via-amber-400 to-amber-600", text: "text-indigo-950" },
  2: { h: 120, block: "from-slate-100 via-slate-300 to-slate-500", text: "text-slate-800" },
  3: { h: 90, block: "from-orange-200 via-amber-600 to-orange-800", text: "text-orange-950" },
};

/** 최종 순위: 1~3위는 시상대(2위·1위·3위 순), 나머지는 아래 줄 */
export function Podium({
  ranking,
  teamById,
  reveal,
  small = false,
}: {
  ranking: ReturnType<typeof finalRanking>;
  teamById: Record<string, TeamInfo>;
  reveal: boolean;
  small?: boolean;
}) {
  const top = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const slots = [top[1], top[0], top[2]].map((r, k) => ({ r, place: [2, 1, 3][k] }));
  // 공개할 때 3위 → 2위 → 1위 순으로 올라옴
  const delay = (place: number) => (reveal ? { 3: 150, 2: 450, 1: 850 }[place] ?? 0 : 0);
  return (
    <div>
      <div className={`flex items-end justify-center ${small ? "gap-2 pt-10" : "gap-5 pt-14"}`}>
        {slots.map(({ r, place }) => {
          if (!r) return <div key={place} className={small ? "w-[31%]" : "w-56"} />;
          const style = PODIUM[Math.min(3, r.rank)] ?? PODIUM[3];
          const first = r.rank === 1;
          const h = small ? Math.round(style.h * 0.55) : style.h;
          return (
            <div key={r.id} className={`${small ? "w-[31%]" : "w-56"} flex flex-col items-center animate-podium-rise`} style={{ animationDelay: `${delay(place)}ms` }}>
              <div className="relative flex flex-col items-center w-full">
                {first && (
                  <span className={`absolute animate-bob ${small ? "-top-8 text-3xl" : "-top-12 text-5xl"}`} aria-hidden>
                    👑
                  </span>
                )}
                <div className={first ? "rounded-[28%] animate-winner-glow" : ""}>
                  <TeamAvatar team={teamById[r.id]} size={small ? (first ? 56 : 46) : first ? 96 : 76} />
                </div>
                <div
                  className={`font-display mt-1.5 text-center leading-tight w-full truncate ${small ? (first ? "text-lg text-yellow-200" : "text-base") : first ? "text-4xl text-yellow-200" : "text-3xl"}`}
                >
                  {teamById[r.id]?.name}
                </div>
                <div className={`font-display flex flex-wrap justify-center ${small ? "text-xs gap-x-1.5 mt-0.5 mb-1.5" : "text-xl gap-3 mt-1 mb-2"}`}>
                  <span className="text-yellow-300">⭐ {r.stars}</span>
                  <span className="text-amber-100/80">{r.talents} 달란트</span>
                </div>
              </div>
              <div
                className={`w-full ${small ? "rounded-t-xl pt-1.5" : "rounded-t-2xl pt-3"} bg-gradient-to-b ${style.block} ${style.text} flex items-start justify-center shadow-[inset_0_2px_0_rgba(255,255,255,0.6),0_10px_30px_rgba(0,0,0,0.35)]`}
                style={{ height: h }}
              >
                <span className={`font-display drop-shadow-[0_2px_0_rgba(255,255,255,0.4)] ${small ? "text-3xl" : "text-6xl"}`}>{r.rank}</span>
              </div>
            </div>
          );
        })}
      </div>
      {rest.length > 0 && (
        <ol className={`mx-auto grid ${small ? "mt-3 grid-cols-1 gap-1.5" : "mt-5 max-w-4xl grid-cols-2 gap-3"}`}>
          {rest.map((r, k) => (
            <li
              key={r.id}
              className={`animate-pop flex items-center rounded-2xl bg-white/10 border border-white/10 ${small ? "gap-2 px-3 py-1.5" : "gap-3 px-4 py-2"}`}
              style={reveal ? { animationDelay: `${1100 + k * 90}ms` } : undefined}
            >
              <span className={`font-display text-center text-white/60 ${small ? "text-lg w-6" : "text-3xl w-9"}`}>{r.rank}</span>
              <TeamAvatar team={teamById[r.id]} size={small ? 30 : 44} />
              <span className={`font-display flex-1 truncate ${small ? "text-base" : "text-2xl"}`}>{teamById[r.id]?.name}</span>
              <span className={`font-display text-yellow-300 ${small ? "text-sm" : "text-xl"}`}>⭐ {r.stars}</span>
              <span className={`font-display text-amber-100/80 ${small ? "text-sm" : "text-xl"}`}>{r.talents} 달란트</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** 참가자 폰: 시상식 진행 중 안내 */
export function WatchScreen({ label, step, total }: { label: string; step: number; total: number }) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl ring-1 ring-amber-200/25 text-white bg-[radial-gradient(ellipse_at_50%_-10%,#3d3fa3_0%,#1b2063_45%,#0a0d2a_100%)] min-h-[calc(100dvh-104px)] flex flex-col items-center justify-center text-center px-6">
      <StageBackdrop beams={false} />
      <div className="relative flex flex-col items-center">
        <div className="text-xs text-amber-100/70 tracking-[0.15em]">2026 더드림 성경 암송 파티</div>
        <div className="mt-4 text-7xl animate-bob" aria-hidden>
          🏆
        </div>
        <div className="mt-5 font-display text-3xl bg-gradient-to-b from-yellow-50 via-yellow-300 to-amber-500 bg-clip-text text-transparent">시상식 진행 중이에요</div>
        <div className="mt-3 font-display text-xl text-white">정면에 있는 화면을 봐 주세요 👀</div>
        <div className="mt-8 flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={`block rounded-full ${step === k + 1 ? "w-5 h-2 bg-amber-300" : step > k + 1 ? "w-2 h-2 bg-amber-300/60" : "w-2 h-2 bg-white/25"}`} />
          ))}
        </div>
        <div className="mt-2 text-sm text-amber-200">지금: {label}</div>
        <div className="mt-6 text-xs text-white/50">최종 순위가 발표되면 여기에도 보여 드려요</div>
      </div>
    </div>
  );
}
