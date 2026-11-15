"use client";

/** 최종 순위 공개: 두구두구(드럼 롤) → 빰!(번쩍·색종이) */
import { useEffect, useRef, useState } from "react";

export const SUSPENSE_MS = 5000;
export const REVEAL_FX_MS = 2600;

/**
 * 최종 순위 공개 연출 단계.
 * 운영자가 "최종 순위 공개"를 누른 순간에만 두구두구(suspense) → 빰(reveal) → 그대로(shown).
 * 이미 공개된 상태로 화면을 새로 열면 연출 없이 바로 보여 준다.
 */
export function useFinalReveal(showFinal: boolean, withSound: boolean) {
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

export function Suspense({ big }: { big: boolean }) {
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

export const CONFETTI_COLORS = ["#fde047", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#a78bfa", "#ffffff"];

/** 빰! 번쩍임 + 위에서 쏟아지는 색종이 */
export function RevealBurst() {
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
export function playDrumroll(ms: number): () => void {
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
