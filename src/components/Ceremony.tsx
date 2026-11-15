"use client";

import { finalRanking } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";
import { StageBackdrop, GoldCard, AwardCard, Podium, WatchScreen } from "./ceremony/stage";
import { Curtains, GameOverCurtain, useCurtainOpening } from "./ceremony/curtain";
import { useFinalReveal, Suspense, RevealBurst } from "./ceremony/reveal";

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
