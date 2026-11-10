"use client";

import { useEffect, useState } from "react";
import { ITEMS, ITEM_IDS } from "@/game/items";
import type { Settings } from "@/game/types";
import { FULL_BAG_TALENTS } from "@/game/reducer";
import { ItemIcon } from "./ItemIcon";

/**
 * 도움말: 폰에서는 "?"를 꾹 누르는 동안, 큰 화면에서는 클릭으로 켜고 끔.
 */
export function HelpButton({ settings, className = "" }: { settings: Settings; mode?: "hold" | "toggle"; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="도움말"
        className={`rounded-full bg-white text-slate-900 font-display shadow-lg flex items-center justify-center ${className}`}
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open && <HelpOverlay settings={settings} onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpOverlay({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const r = settings.rewards;
  const spaces: [string, string, string, number?][] = [
    ["bg-sky-400", "일반 칸", "장절을 보고 암송", r.blue],
    ["bg-rose-400", "어려운 칸", "일반 칸보다 어려운 난이도!!", r.red],
    ["bg-emerald-400", "이벤트 칸", "그냥 외우기만 하면 심심하잖아요~", r.event],
    ["bg-violet-400", "선물 칸", "성공하면 랜덤 아이템", r.item],
    ["bg-teal-400", "해프닝 칸", "멈추면 게임판에 사건(?) 발생"],
    ["bg-pink-400", "축복 칸", "축복합니다~"],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-[#0b1033]/95 backdrop-blur-sm text-white flex flex-col">
      <OverlayHeader onClose={onClose}>
        <span className="text-yellow-300">★</span> 게임 도움말
      </OverlayHeader>
      <div className="flex-1 overflow-auto p-5 pt-3">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        <section className="glass p-4">
          <h3 className="font-display text-xl mb-2">이기는 법</h3>
          <p className="text-white/85 leading-relaxed">
            주사위 2개로 보드를 돌며 도착한 칸의 로마서 8장 구절을 암송해 <b className="text-amber-200">달란트</b>를 모으고, 달란트로{" "}
            <b className="text-yellow-300">스타</b>를 사세요. 게임이 끝나면 보너스 스타를 더해{" "}
            <b>스타가 가장 많은 팀</b>이 우승!
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
          <SectionTitle title="칸 종류" note="암송 성공 시 받는 달란트" />
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {spaces.map(([c, n, d, reward]) => (
              <li key={n} className="flex gap-2 items-center">
                <span className={`inline-block w-5 h-5 rounded-full shrink-0 ${c} ring-2 ring-white/70`} />
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block">{n}</b>
                  <span className="block text-sm text-white/70 truncate">{d}</span>
                </span>
                {reward !== undefined && <Talent n={reward} plus />}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass p-4">
          <SectionTitle title="아이템" note="상점 가격" />
          <p className="text-sm text-white/60 mb-2">
            선물 칸에서 얻거나 상점을 지날 때 살 수 있어요. 팀당 최대 {settings.inventoryLimit}개, 가득 찼을 때 받은 아이템은{" "}
            <Talent n={FULL_BAG_TALENTS} plus />로 대신 받아요.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {ITEM_IDS.map((id) => (
              <li key={id} className="flex gap-2 items-center">
                <span className="inline-flex w-9 h-9 rounded-xl bg-white/10 items-center justify-center shrink-0">
                  <ItemIcon id={id} size={24} />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block">{ITEMS[id].name}</b>
                  <span className="block text-sm text-white/70 truncate">{ITEMS[id].desc}</span>
                </span>
                <Talent n={ITEMS[id].price} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      </div>
    </div>
  );
}

/** 전체 화면 오버레이 상단 고정 헤더 (제목 + × 버튼) */
export function OverlayHeader({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="shrink-0 flex items-center px-5 py-4 border-b border-white/10 bg-[#0b1033]/80">
      <h2 className="font-display text-2xl sm:text-3xl">{children}</h2>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="ml-auto w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-2xl font-bold flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <h3 className="font-display text-xl">{title}</h3>
      <span className="ml-auto text-xs text-white/50 flex items-center gap-1">
        <TalentCoin size={12} /> = {note}
      </span>
    </div>
  );
}

/** 달란트 금액 뱃지: 코인 아이콘 + 숫자 */
export function Talent({ n, plus }: { n: number; plus?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-amber-300/15 text-amber-200 font-display px-2 py-0.5 text-sm leading-none">
      <TalentCoin size={12} />
      {plus ? `+${n}` : n}
    </span>
  );
}

function TalentCoin({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#b45309" strokeWidth="1.5" />
    </svg>
  );
}
