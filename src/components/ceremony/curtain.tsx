"use client";

/** 게임 종료 커튼: 닫히며 '게임 종료!', 시상식 시작 때 열림 */
import { useEffect, useRef, useState } from "react";

export const CURTAIN_MS = 1500;

/** 커튼 한 쪽: 붉은 벨벳 주름 + 금색 술 */
export function CurtainPanel({ side, anim }: { side: "left" | "right"; anim: string }) {
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
export function Curtains({ mode }: { mode: "close" | "open" | "closed" }) {
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
export function GameOverCurtain({ big }: { big: boolean }) {
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
export function useCurtainOpening(started: boolean) {
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
