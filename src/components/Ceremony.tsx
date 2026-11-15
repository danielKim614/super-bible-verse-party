"use client";

import { useEffect, useRef, useState } from "react";
import { finalRanking } from "@/game/reducer";
import type { Award, GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

export function Ceremony({ state, teamById, big = true }: { state: GameState; teamById: Record<string, TeamInfo>; big?: boolean }) {
  const c = state.ceremony;
  const ended = state.phase === "ended" && !!c;
  // 0: 게임 종료(커튼) → 1: 환급 → 2..n+1: 보너스 스타 → n+2: 최종 순위
  const n = c?.awards.length ?? 0;
  const step = c?.step ?? 0;
  const showFinal = ended && step > n + 1;
  const reveal = useFinalReveal(showFinal, big);
  const opening = useCurtainOpening(ended && step >= 1);
  if (!ended || !c) return null;

  if (step === 0) return <GameOverCurtain big={big} />;

  const stepsLabel = ["환급", ...c.awards.map((a) => a.title), "최종 순위"];
  // 참가자 폰: 환급·보너스 스타 공개 중에는 앞 화면을 보도록 안내, 최종 순위는 공개된 뒤 폰에도 보여 줌
  if (!big && step <= n + 1) return <WatchScreen label={stepsLabel[step - 1]} step={step} total={stepsLabel.length} />;

  const awardsShown = c.awards.slice(0, Math.max(0, Math.min(step - 1, n)));
  const ranking = finalRanking(state);
  const refunds = Object.entries(c.refunds).filter(([, v]) => v > 0);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl ring-1 ring-amber-200/25 text-white bg-[radial-gradient(ellipse_at_50%_-10%,#3d3fa3_0%,#1b2063_45%,#0a0d2a_100%)] ${big ? "h-full" : "min-h-[calc(100dvh-104px)]"}`}
    >
      <StageBackdrop beams={big} />
      <div className={`relative h-full overflow-auto ${big ? "px-10 py-7" : "px-4 py-5"}`}>
        <header className="text-center">
          <div className={`text-amber-100/70 ${big ? "text-base tracking-[0.35em]" : "text-xs tracking-[0.15em]"}`}>2026 더드림 성경 암송 파티</div>
          <h2 className={`font-display flex items-center justify-center gap-3 ${big ? "text-6xl mt-1" : "text-3xl"}`}>
            <span aria-hidden className="animate-bob inline-block">🏆</span>
            <span className="bg-gradient-to-b from-yellow-50 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]">시상식</span>
          </h2>
          {/* 진행 단계: 폰에서는 점 + 지금 단계 이름만 */}
          {!big && (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <span className="flex items-center gap-1.5" aria-hidden>
                {stepsLabel.map((label, k) => (
                  <span
                    key={label}
                    className={`block rounded-full ${step === k + 1 ? "w-5 h-2 bg-amber-300" : step > k + 1 ? "w-2 h-2 bg-amber-300/60" : "w-2 h-2 bg-white/25"}`}
                  />
                ))}
              </span>
              <span className="text-xs text-amber-200">{stepsLabel[Math.min(stepsLabel.length, Math.max(1, step)) - 1]}</span>
            </div>
          )}
          <ol className={`mt-3 flex-wrap justify-center items-center gap-1.5 text-sm ${big ? "flex" : "hidden"}`}>
            {stepsLabel.map((label, k) => {
              const at = k + 1; // 1: 환급, 2..n+1: 보너스, n+2: 최종
              const done = step > at;
              const now = step === at;
              return (
                <li key={label} className="flex items-center gap-1.5">
                  {k > 0 && <span className={`h-px ${big ? "w-6" : "w-3"} ${done || now ? "bg-amber-300/70" : "bg-white/20"}`} />}
                  <span
                    className={`rounded-full px-2.5 py-0.5 border ${
                      now ? "bg-amber-300 text-indigo-950 border-amber-200 font-bold" : done ? "border-amber-300/60 text-amber-200" : "border-white/20 text-white/40"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </header>

        {step === 1 && (
          <div className={`mx-auto ${big ? "mt-10 max-w-3xl" : "mt-4"}`}>
            <GoldCard>
              <div className={`text-center ${big ? "p-8" : "p-4"}`}>
                <div className={`${big ? "text-6xl" : "text-3xl"}`} aria-hidden>
                  🎁
                </div>
                <div className={`font-display text-amber-200 ${big ? "text-4xl mt-2" : "text-xl mt-1"}`}>남은 아이템 환급</div>
                <p className={`text-white/85 ${big ? "text-2xl mt-2" : "text-sm mt-1"}`}>
                  남은 아이템은 1개당 {state.settings.itemRefund} 달란트로 바꿔 드려요
                </p>
                <div className={`flex flex-wrap justify-center gap-3 ${big ? "mt-6" : "mt-3"}`}>
                  {refunds.length === 0 && <p className="text-white/60">환급할 아이템이 없어요</p>}
                  {refunds.map(([id, v], k) => (
                    <div key={id} className="animate-pop flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2" style={{ animationDelay: `${k * 90}ms` }}>
                      <TeamAvatar team={teamById[id]} size={big ? 48 : 28} />
                      <span className={`font-display ${big ? "text-2xl" : "text-base"}`}>{teamById[id]?.name}</span>
                      <span className={`font-display text-amber-200 ${big ? "text-3xl" : "text-lg"}`}>+{v} 달란트</span>
                    </div>
                  ))}
                </div>
              </div>
            </GoldCard>
          </div>
        )}

        {!showFinal && awardsShown.length > 0 && (
          <div
            className={`mx-auto grid gap-5 ${big ? "mt-10" : "mt-4"}`}
            style={big ? { gridTemplateColumns: `repeat(${Math.min(3, n)}, minmax(0, 1fr))`, maxWidth: Math.min(3, n) * 420 } : undefined}
          >
            {awardsShown.map((a, k) => (
              <AwardCard key={a.key} award={a} teamById={teamById} big={big} fresh={k === awardsShown.length - 1} />
            ))}
          </div>
        )}

        {showFinal && reveal !== "suspense" && (
          <div className={big ? "mt-6" : "mt-4"}>
            <h3 className={`font-display text-center text-amber-100 ${big ? "text-4xl mb-2" : "text-2xl mb-3"} ${reveal === "reveal" ? "animate-reveal-title" : ""}`}>최종 순위</h3>
            <Podium ranking={ranking} teamById={teamById} reveal={reveal === "reveal"} small={!big} />
          </div>
        )}
      </div>

      {/* 최종 순위 직전: 두구두구두구… (약 5초) → 빰! */}
      {showFinal && reveal === "suspense" && <Suspense big={big} />}
      {showFinal && reveal === "reveal" && <RevealBurst />}
      {/* 게임 종료 화면에서 넘어올 때 커튼이 양옆으로 열림 */}
      {opening && <Curtains mode="open" />}
    </div>
  );
}

/** 무대 배경: 반짝이는 별, 위에서 내리쬐는 금빛 조명, 바닥 빛 */
function StageBackdrop({ beams = true }: { beams?: boolean }) {
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
function GoldCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-3xl p-[2px] bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-700 shadow-[0_12px_40px_rgba(251,191,36,0.22)] ${className}`}>
      <div className="relative h-full rounded-[22px] bg-[#151b52]/95 overflow-hidden">{children}</div>
    </div>
  );
}

const AWARD_EMOJI: Record<string, string> = { recite: "📖", talent: "💰", challenge: "🔥" };

/** 보너스 스타 카드: 메달 + 제목 + 받은 팀 */
function AwardCard({ award: a, teamById, big, fresh }: { award: Award; teamById: Record<string, TeamInfo>; big: boolean; fresh: boolean }) {
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

const PODIUM: Record<number, { h: number; block: string; text: string }> = {
  1: { h: 170, block: "from-yellow-200 via-amber-400 to-amber-600", text: "text-indigo-950" },
  2: { h: 120, block: "from-slate-100 via-slate-300 to-slate-500", text: "text-slate-800" },
  3: { h: 90, block: "from-orange-200 via-amber-600 to-orange-800", text: "text-orange-950" },
};

/** 최종 순위: 1~3위는 시상대(2위·1위·3위 순), 나머지는 아래 줄 */
function Podium({
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
function WatchScreen({ label, step, total }: { label: string; step: number; total: number }) {
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

const CURTAIN_MS = 1500;

/** 커튼 한 쪽: 붉은 벨벳 주름 + 금색 술 */
function CurtainPanel({ side, anim }: { side: "left" | "right"; anim: string }) {
  return (
    <div
      className={`absolute top-0 bottom-0 w-1/2 ${side === "left" ? "left-0" : "right-0"} ${anim}`}
      style={{
        background:
          "repeating-linear-gradient(90deg, #5b0d14 0px, #8f1420 18px, #c0262f 34px, #8f1420 50px, #5b0d14 68px)",
        boxShadow: side === "left" ? "inset -24px 0 40px rgba(0,0,0,0.45)" : "inset 24px 0 40px rgba(0,0,0,0.45)",
      }}
    >
      <div className={`absolute top-0 bottom-0 w-3 ${side === "left" ? "right-0" : "left-0"} bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-300 opacity-80`} />
    </div>
  );
}

/** 무대 커튼. close: 양옆에서 닫힘, open: 가운데서 양옆으로 열림, closed: 닫힌 채 */
function Curtains({ mode }: { mode: "close" | "open" | "closed" }) {
  const left = mode === "close" ? "animate-curtain-close-left" : mode === "open" ? "animate-curtain-open-left" : "";
  const right = mode === "close" ? "animate-curtain-close-right" : mode === "open" ? "animate-curtain-open-right" : "";
  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      <CurtainPanel side="left" anim={left} />
      <CurtainPanel side="right" anim={right} />
      {/* 위쪽 휘장 */}
      <div
        className="absolute top-0 left-0 right-0 h-14"
        style={{
          background: "radial-gradient(circle at 50% 0, #c0262f 0 38px, transparent 39px) 0 0 / 80px 56px repeat-x, linear-gradient(#7a1019, #a51c26)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
        }}
      />
      <div className="absolute top-14 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600" />
    </div>
  );
}

/** 게임이 끝나면: 커튼이 쳐지고 "게임 종료!" (운영자가 다음을 누르면 시상식) */
function GameOverCurtain({ big }: { big: boolean }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-3xl bg-[#0a0f2e] ring-1 ring-white/10 text-white ${big ? "h-full" : "h-[calc(100dvh-104px)] min-h-[420px]"}`}>
      <Curtains mode="close" />
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center animate-gameover-in" style={{ animationDelay: `${CURTAIN_MS - 200}ms` }}>
        <div className={`font-display text-yellow-300 drop-shadow-[0_6px_0_rgba(0,0,0,0.45)] ${big ? "text-9xl" : "text-5xl"}`}>게임 종료!</div>
        <div className={`mt-6 font-display text-white/95 drop-shadow-[0_3px_0_rgba(0,0,0,0.4)] ${big ? "text-4xl" : "text-xl"}`}>모두 수고하셨어요 🙌</div>
        <div className={`mt-3 text-white/80 ${big ? "text-2xl" : "text-base"}`}>{big ? "잠시 후 시상식이 시작됩니다" : "잠시 후 정면 화면에서 시상식이 시작돼요"}</div>
      </div>
    </div>
  );
}

/** 게임 종료 화면(0) → 시상식(1)으로 넘어가는 순간에만 커튼 열림 연출 */
function useCurtainOpening(started: boolean) {
  const [opening, setOpening] = useState(false);
  const prev = useRef(started);
  useEffect(() => {
    if (prev.current === started) return;
    prev.current = started;
    if (!started) return;
    setOpening(true);
    const t = setTimeout(() => setOpening(false), CURTAIN_MS);
    return () => {
      clearTimeout(t);
      setOpening(false);
    };
  }, [started]);
  // 넘어온 첫 렌더에서도 커튼이 덮여 있게
  return opening || (started && !prev.current);
}

const SUSPENSE_MS = 5000;
const REVEAL_FX_MS = 2600;

/**
 * 최종 순위 공개 연출 단계.
 * 운영자가 "최종 순위 공개"를 누른 순간에만 두구두구(suspense) → 빰(reveal) → 그대로(shown).
 * 이미 공개된 상태로 화면을 새로 열면 연출 없이 바로 보여 준다.
 */
function useFinalReveal(showFinal: boolean, withSound: boolean) {
  const [phase, setPhase] = useState<"suspense" | "reveal" | "shown">("shown");
  const prev = useRef(showFinal);
  useEffect(() => {
    if (prev.current === showFinal) return;
    prev.current = showFinal;
    if (!showFinal) {
      setPhase("shown");
      return;
    }
    setPhase("suspense");
    const stopSound = withSound ? playDrumroll(SUSPENSE_MS) : undefined;
    const t1 = setTimeout(() => setPhase("reveal"), SUSPENSE_MS);
    const t2 = setTimeout(() => setPhase("shown"), SUSPENSE_MS + REVEAL_FX_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      stopSound?.();
    };
  }, [showFinal, withSound]);
  // 방금 최종 순위 단계로 넘어온 첫 렌더에서도 순위가 잠깐 비치지 않도록 바로 두구두구로
  if (showFinal && !prev.current) return "suspense";
  return phase;
}

function Suspense({ big }: { big: boolean }) {
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-[#05081f]/95 flex flex-col items-center justify-center text-center animate-dim-in">
      {/* 좌우에서 훑는 스포트라이트 */}
      <div className="absolute -top-1/4 left-1/2 w-[140%] h-[160%] -translate-x-1/2 pointer-events-none">
        <div className="absolute inset-0 animate-spot-left bg-[conic-gradient(from_180deg_at_30%_0%,transparent_0deg,rgba(253,224,71,0.18)_8deg,transparent_16deg)]" />
        <div className="absolute inset-0 animate-spot-right bg-[conic-gradient(from_180deg_at_70%_0%,transparent_0deg,rgba(125,211,252,0.16)_8deg,transparent_16deg)]" />
      </div>
      <div className={`relative font-display text-yellow-300 ${big ? "text-5xl mb-6" : "text-2xl mb-3"}`}>최종 순위 발표!</div>
      <div className={`relative ${big ? "text-8xl" : "text-5xl"} animate-drum-bounce`} aria-hidden>
        🥁
      </div>
      <div className={`relative font-display ${big ? "text-7xl mt-6" : "text-3xl mt-3"} animate-drum-shake`}>두구두구두구…</div>
      {/* 5초 동안 차오르는 막대 */}
      <div className={`relative mt-8 h-2 rounded-full bg-white/15 overflow-hidden ${big ? "w-96" : "w-48"}`}>
        <div className="h-full bg-gradient-to-r from-yellow-300 to-rose-400 animate-suspense-bar" style={{ animationDuration: `${SUSPENSE_MS}ms` }} />
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#fde047", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#a78bfa", "#ffffff"];

/** 빰! 번쩍임 + 위에서 쏟아지는 색종이 */
function RevealBurst() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-white animate-reveal-flash" />
      {Array.from({ length: 48 }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 8) * 70;
        const dur = 1700 + ((i * 53) % 900);
        const size = 8 + (i % 4) * 3;
        return (
          <span
            key={i}
            className="absolute top-0 block animate-confetti"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.6,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${delay}ms`,
              animationDuration: `${dur}ms`,
              ["--drift" as string]: `${((i * 29) % 160) - 80}px`,
              ["--spin" as string]: `${360 + ((i * 47) % 540)}deg`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * 두구두구두구… (스네어 롤, 점점 빠르고 크게) → 빰! (심벌 + 화음).
 * 브라우저가 소리를 막으면(화면을 한 번도 누르지 않은 경우 등) 조용히 넘어간다.
 */
function playDrumroll(ms: number): () => void {
  type Ctx = typeof AudioContext;
  const AC: Ctx | undefined = typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctx }).webkitAudioContext) : undefined;
  if (!AC) return () => {};
  let ctx: AudioContext;
  try {
    ctx = new AC();
  } catch {
    return () => {};
  }
  void ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const hit = (at: number, vol: number, len: number, freq: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + len);
    src.connect(bp).connect(g).connect(master);
    src.start(at, Math.random() * 1.5);
    src.stop(at + len + 0.05);
  };

  const t0 = ctx.currentTime + 0.05;
  const total = ms / 1000;
  // 롤: 간격 0.12초 → 0.035초, 소리 0.12 → 0.5 로 점점
  for (let t = 0; t < total - 0.05; ) {
    const k = t / total;
    hit(t0 + t, 0.12 + 0.38 * k * k, 0.09, 1800 + 600 * k);
    t += 0.12 - 0.085 * Math.sqrt(k);
  }
  // 빰!
  const bam = t0 + total;
  hit(bam, 0.9, 1.6, 6000); // 심벌
  hit(bam, 0.8, 0.25, 180); // 큰북
  [261.63, 329.63, 392.0, 523.25].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, bam);
    g.gain.exponentialRampToValueAtTime(0.12, bam + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, bam + 1.4);
    o.connect(lp).connect(g).connect(master);
    o.start(bam);
    o.stop(bam + 1.5);
  });
  const closeAt = setTimeout(() => void ctx.close().catch(() => {}), ms + 2500);
  return () => {
    clearTimeout(closeAt);
    void ctx.close().catch(() => {});
  };
}
