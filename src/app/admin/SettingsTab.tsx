"use client";

/** 설정 탭 (저장된 설정 초안, 위험 구역의 기록 초기화 포함) */
import { useEffect, useState } from "react";
import { SPACE_LABEL } from "@/game/board";
import { DEFAULT_SETTINGS, type Settings } from "@/game/types";
import { type GameData } from "@/lib/useGame";
import { type Admin, btn } from "./ui";

// ---------------------------------------------------------------------------
// 설정
// ---------------------------------------------------------------------------
export const SETTINGS_KEY = "sbvp:settingsDraft";
export const SETTINGS_VER_KEY = "sbvp:settingsDraft:v2";

export function useSettingsDraft(): Settings {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>;
        // 환급 기본값이 1 → 3으로 바뀌기 전에 저장된 설정이면 새 기본값으로 올려 준다 (한 번만)
        if (!localStorage.getItem(SETTINGS_VER_KEY) && saved.itemRefund === 1) saved.itemRefund = DEFAULT_SETTINGS.itemRefund;
        setS({ ...DEFAULT_SETTINGS, ...saved });
      }
    } catch {}
  }, []);
  return s;
}

export function SettingsTab({ game, admin }: { game: GameData; admin: Admin }) {
  const started = game.state.started;
  const draft = useSettingsDraft();
  const [s, setS] = useState<Settings>(draft);
  const [saved, setSaved] = useState(false);
  useEffect(() => setS(started ? game.state.settings : draft), [draft, started, game.state.settings]);

  const num = (label: string, key: keyof Settings, min = 0) => (
    <label className="flex items-center gap-2">
      <span className="w-44 text-sm text-slate-600">{label}</span>
      <input
        type="number"
        min={min}
        disabled={started}
        value={s[key] as number}
        onChange={(e) => {
          setS({ ...s, [key]: Number(e.target.value) });
          setSaved(false);
        }}
        className="w-24 rounded-lg border px-2 py-1"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-3 max-w-xl">
      {started && <div className="rounded-xl bg-amber-50 p-2 text-sm text-amber-800">게임 진행 중에는 설정을 바꿀 수 없어요. 총 턴 수는 “강제 개입”에서 바꿀 수 있습니다.</div>}
      {num("총 턴 수", "totalTurns", 1)}
      {num("시작 달란트", "startTalents")}
      {num("스타 가격", "starPrice", 1)}
      {num("할인권 스타 가격", "couponStarPrice", 0)}
      {num("보드 위 스타 개수", "starCount", 1)}
      {num("기본 주사위 개수", "diceCount", 1)}
      {num("종반 2배 턴 수", "finalBoostTurns", 0)}
      {num("아이템 보유 한도", "inventoryLimit", 1)}
      {num("남은 아이템 환급(개당)", "itemRefund", 0)}
      {num("상점 이동까지 방문 팀 수 (0=고정)", "shopMoveAfter", 0)}
      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(s.rewards) as (keyof Settings["rewards"])[]).map((k) => (
          <label key={k} className="text-sm">
            {SPACE_LABEL[k]}
            <input
              type="number"
              disabled={started}
              value={s.rewards[k]}
              onChange={(e) => {
                setS({ ...s, rewards: { ...s.rewards, [k]: Number(e.target.value) } });
                setSaved(false);
              }}
              className="w-full rounded-lg border px-2 py-1"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {(
          [
            ["recite", "암송 스타"],
            ["talent", "달란트 스타"],
            ["challenge", "도전 스타"],
          ] as [keyof Settings["bonusStars"], string][]
        ).map(([k, l]) => (
          <label key={k} className="flex items-center gap-1">
            <input
              type="checkbox"
              disabled={started}
              checked={s.bonusStars[k]}
              onChange={(e) => {
                setS({ ...s, bonusStars: { ...s.bonusStars, [k]: e.target.checked } });
                setSaved(false);
              }}
            />
            {l}
          </label>
        ))}
      </div>
      {!started && (
        <div className="flex items-center gap-3">
          <button
            className={`${btn} bg-slate-900 text-white`}
            onClick={() => {
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
              localStorage.setItem(SETTINGS_VER_KEY, "1");
              setSaved(true);
            }}
          >
            저장
          </button>
          <button
            className={`${btn} bg-slate-200`}
            onClick={() => {
              setS(DEFAULT_SETTINGS);
              setSaved(false);
            }}
          >
            기본값
          </button>
          {saved && <span className="text-green-600 text-sm">저장됨 (이 브라우저)</span>}
        </div>
      )}
      <hr className="my-3" />
      <div>
        <h3 className="font-display text-xl text-red-600">위험 구역</h3>
        <p className="text-sm text-slate-500">모든 진행 기록을 지우고 게임 시작 전으로 돌아갑니다. 팀·참가자는 유지됩니다.</p>
        <ResetButton busy={admin.busy} disabled={game.events.length === 0} onReset={() => admin.resetGame()} />
      </div>
    </div>
  );
}

/** 초기화: 브라우저 입력창(prompt) 대신 화면 안에서 두 번 눌러 확인 (대화상자가 차단돼도 동작) */
export function ResetButton({ busy, disabled, onReset }: { busy: boolean; disabled: boolean; onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  if (disabled) return <p className="mt-2 text-sm text-slate-400">지울 진행 기록이 없어요.</p>;
  if (!armed)
    return (
      <button className={`${btn} bg-red-600 text-white mt-2`} disabled={busy} onClick={() => setArmed(true)}>
        게임 기록 초기화
      </button>
    );
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-sm text-red-700 font-bold">정말 모든 진행 기록을 지울까요? 되돌릴 수 없어요.</span>
      <button
        className={`${btn} bg-red-600 text-white`}
        disabled={busy}
        onClick={() => {
          setArmed(false);
          onReset();
        }}
      >
        네, 초기화
      </button>
      <button className={`${btn} bg-slate-200`} onClick={() => setArmed(false)}>
        취소
      </button>
    </div>
  );
}
