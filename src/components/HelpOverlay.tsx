"use client";

import { useEffect, useState } from "react";
import { ITEMS, ITEM_IDS } from "@/game/items";
import type { Settings } from "@/game/types";
import { ItemIcon } from "./ItemIcon";

/**
 * 도움말: 폰에서는 "?"를 꾹 누르는 동안, 큰 화면에서는 클릭으로 켜고 끔.
 */
export function HelpButton({ settings, mode = "hold", className = "" }: { settings: Settings; mode?: "hold" | "toggle"; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    if (mode === "hold") {
      window.addEventListener("pointerup", close);
      window.addEventListener("pointercancel", close);
      return () => {
        window.removeEventListener("pointerup", close);
        window.removeEventListener("pointercancel", close);
      };
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode]);

  return (
    <>
      <button
        type="button"
        aria-label="도움말"
        className={`select-none touch-none rounded-full bg-white text-slate-900 font-display shadow-lg flex items-center justify-center ${className}`}
        onPointerDown={(e) => {
          e.preventDefault();
          if (mode === "hold") setOpen(true);
        }}
        onClick={() => mode === "toggle" && setOpen((v) => !v)}
        onContextMenu={(e) => e.preventDefault()}
      >
        ?
      </button>
      {open && <HelpOverlay settings={settings} onClose={() => setOpen(false)} dismissOnClick={mode === "toggle"} />}
    </>
  );
}

function HelpOverlay({ settings, onClose, dismissOnClick }: { settings: Settings; onClose: () => void; dismissOnClick: boolean }) {
  const r = settings.rewards;
  const spaces: [string, string, string][] = [
    ["bg-sky-400", "파란 칸", `장절을 보고 암송 · +${r.blue}`],
    ["bg-rose-400", "빨간 칸", `빈칸·첫 단어·힌트 없음 중 하나 · +${r.red}`],
    ["bg-emerald-400", "이벤트 칸", `팀 릴레이 또는 3절 연속 · +${r.event}`],
    ["bg-violet-400", "선물 칸", `성공하면 랜덤 아이템 · +${r.item}`],
    ["bg-teal-400", "해프닝 칸", "멈추면 보드에 사건 발생 (스타 대이동·달란트 비·황금 라운드·깜짝 선물)"],
    ["bg-pink-400", "축복 칸", "멈추면 꼴찌 팀에게 +5 달란트"],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-[#0b1033]/92 backdrop-blur-sm text-white overflow-auto p-5" onClick={() => dismissOnClick && onClose()}>
      <div className="max-w-3xl mx-auto flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-3xl">
          <span className="text-yellow-300">★</span> 게임 도움말
        </h2>

        <section className="glass p-4">
          <h3 className="font-display text-xl mb-2">이기는 법</h3>
          <p className="text-white/85 leading-relaxed">
            주사위로 보드를 돌며 도착한 칸의 로마서 8장 구절을 암송해 <b className="text-amber-200">달란트</b>를 모으고, 달란트로{" "}
            <b className="text-yellow-300">스타</b>를 사세요. 게임이 끝나면 보너스 스타(암송 최다·달란트 최다·도전 최다)를 더해{" "}
            <b>스타가 가장 많은 팀</b>이 우승! 마지막 {settings.finalBoostTurns}턴은 달란트가 2배예요.
          </p>
        </section>

        <section className="glass p-4">
          <h3 className="font-display text-xl mb-2">스타 ★</h3>
          <p className="text-white/85 leading-relaxed">
            보드 위에 떠 있는 별을 <b>지나가기만 해도</b> 살 수 있어요 ({settings.starPrice}달란트). 단, 그 칸의 구절을 먼저 암송해야 해요. 스타를 사면 별은 다른 곳에
            다시 나타나요.
          </p>
        </section>

        <section className="glass p-4">
          <h3 className="font-display text-xl mb-2">칸 종류</h3>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
            {spaces.map(([c, n, d]) => (
              <li key={n} className="flex gap-2 items-start">
                <span className={`mt-1 inline-block w-4 h-4 rounded-full shrink-0 ${c} ring-2 ring-white/70`} />
                <span>
                  <b>{n}</b> <span className="text-white/75">— {d}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass p-4">
          <h3 className="font-display text-xl mb-2">아이템</h3>
          <p className="text-sm text-white/60 mb-2">선물 칸에서 얻거나 상점(지름길과 바깥길이 만나는 곳)을 지날 때 살 수 있어요. 최대 {settings.inventoryLimit}개.</p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
            {ITEM_IDS.map((id) => (
              <li key={id} className="flex gap-2 items-center">
                <span className="inline-flex w-9 h-9 rounded-xl bg-white/10 items-center justify-center shrink-0">
                  <ItemIcon id={id} size={24} />
                </span>
                <span>
                  <b>{ITEMS[id].name}</b> <span className="text-white/75">— {ITEMS[id].desc}</span>
                  <span className="text-amber-200/80 text-sm"> · {ITEMS[id].price}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {dismissOnClick ? (
          <button className="self-center rounded-full bg-white text-slate-900 font-display px-6 py-2" onClick={onClose}>
            닫기
          </button>
        ) : (
          <p className="text-center text-white/50 text-sm">손을 떼면 닫혀요</p>
        )}
      </div>
    </div>
  );
}
