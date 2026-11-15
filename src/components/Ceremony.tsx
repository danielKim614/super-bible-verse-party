"use client";

import { useEffect, useRef, useState } from "react";
import { finalRanking } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
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

  const awardsShown = c.awards.slice(0, Math.max(0, Math.min(step - 1, n)));
  const ranking = finalRanking(state);
  const refunds = Object.entries(c.refunds).filter(([, v]) => v > 0);

  return (
    <div className={`relative w-full h-full overflow-auto rounded-3xl bg-[radial-gradient(ellipse_at_top,#2b3a8f_0%,#141b4d_60%,#0a0f2e_100%)] ring-1 ring-white/10 text-white ${big ? "p-10" : "p-4"}`}>
      <h2 className={`font-display text-center text-yellow-300 ${big ? "text-6xl mb-8" : "text-3xl mb-4"}`}>🏆 시상식</h2>

      {step === 1 && (
        <div className="text-center">
          <p className={`${big ? "text-3xl" : "text-lg"} mb-4`}>남은 아이템은 1개당 {state.settings.itemRefund}달란트로 환급됩니다</p>
          <div className="flex flex-wrap justify-center gap-4">
            {refunds.length === 0 && <p className="opacity-70">환급할 아이템이 없어요</p>}
            {refunds.map(([id, v]) => (
              <div key={id} className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
                <TeamAvatar team={teamById[id]} size={big ? 48 : 28} />
                <span className={`font-display ${big ? "text-3xl" : "text-lg"}`}>+{v}🪙</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-4 ${showFinal ? "hidden" : ""}`}>
        {awardsShown.map((a) => (
          <div key={a.key} className="animate-pop rounded-3xl bg-white/10 p-4">
            <div className={`font-display ${big ? "text-4xl" : "text-xl"} text-yellow-300`}>⭐ {a.title}</div>
            <div className={`${big ? "text-xl" : "text-sm"} opacity-80`}>{a.desc}</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {a.winners.length === 0 && <span className="opacity-70">해당 팀 없음</span>}
              {a.winners.map((w) => (
                <div key={w} className="flex items-center gap-2 rounded-2xl bg-yellow-300 text-indigo-900 px-4 py-2">
                  <TeamAvatar team={teamById[w]} size={big ? 52 : 30} />
                  <span className={`font-display ${big ? "text-3xl" : "text-lg"}`}>
                    {teamById[w]?.name} ({a.values[w]})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showFinal && reveal !== "suspense" && (
        <div className="mt-8">
          <h3 className={`font-display text-center ${big ? "text-5xl mb-6" : "text-2xl mb-3"} ${reveal === "reveal" ? "animate-reveal-title" : ""}`}>최종 순위</h3>
          <ol className="flex flex-col gap-3 max-w-3xl mx-auto">
            {ranking.map((r, i) => (
              <li
                key={r.id}
                className={`animate-pop flex items-center gap-4 rounded-3xl px-5 py-3 ${r.rank === 1 ? "bg-yellow-300 text-indigo-900 scale-105 animate-winner-glow" : "bg-white/10"}`}
                style={reveal === "reveal" ? { animationDelay: `${i * 110}ms` } : undefined}
              >
                <span className={`font-display ${big ? "text-5xl w-14" : "text-2xl w-8"}`}>{r.rank === 1 ? "👑" : r.rank}</span>
                <TeamAvatar team={teamById[r.id]} size={big ? 64 : 36} />
                <span className={`font-display flex-1 ${big ? "text-4xl" : "text-xl"}`}>{teamById[r.id]?.name}</span>
                <span className={`font-display ${big ? "text-4xl" : "text-xl"}`}>⭐{r.stars}</span>
                <span className={`font-display ${big ? "text-3xl" : "text-lg"} opacity-80`}>🪙{r.talents}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 최종 순위 직전: 두구두구두구… (약 5초) → 빰! */}
      {showFinal && reveal === "suspense" && <Suspense big={big} />}
      {showFinal && reveal === "reveal" && <RevealBurst />}
      {/* 게임 종료 화면에서 넘어올 때 커튼이 양옆으로 열림 */}
      {opening && <Curtains mode="open" />}
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
    <div className="relative w-full h-full overflow-hidden rounded-3xl bg-[#0a0f2e] ring-1 ring-white/10 text-white">
      <Curtains mode="close" />
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center animate-gameover-in" style={{ animationDelay: `${CURTAIN_MS - 200}ms` }}>
        <div className={`font-display text-yellow-300 drop-shadow-[0_6px_0_rgba(0,0,0,0.45)] ${big ? "text-9xl" : "text-5xl"}`}>게임 종료!</div>
        <div className={`mt-6 font-display text-white/95 drop-shadow-[0_3px_0_rgba(0,0,0,0.4)] ${big ? "text-4xl" : "text-xl"}`}>모두 수고하셨어요 🙌</div>
        <div className={`mt-3 text-white/80 ${big ? "text-2xl" : "text-base"}`}>잠시 후 시상식이 시작됩니다</div>
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
  return opening;
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
