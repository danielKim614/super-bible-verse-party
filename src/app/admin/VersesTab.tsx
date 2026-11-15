"use client";

/** 본문 탭 */
import { useMemo, useState } from "react";
import { type GameData } from "@/lib/useGame";
import { countVerses, parseVerses } from "@/game/verses";
import { type Admin, btn } from "./ui";

// ---------------------------------------------------------------------------
// 본문
// ---------------------------------------------------------------------------
export function VersesTab({ game, admin }: { game: GameData; admin: Admin }) {
  const [raw, setRaw] = useState("");
  const parsed = useMemo(() => parseVerses(raw), [raw]);
  const parsedCount = countVerses(parsed);
  const savedCount = countVerses(game.verses);
  const missing = Array.from({ length: 39 }, (_, i) => i + 1).filter((v) => !game.verses[v]?.trim());
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-2xl">본문 붙여넣기</h3>
        <p className="text-sm text-slate-500">
          새번역 로마서 8장을 그대로 붙여 넣으세요. 줄 앞의 절 번호로 나누고, 각주 번호(예: 1))와 소제목은 자동으로 제거합니다. 일부 절만 붙여 넣어도 그 절만 갱신돼요.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={14}
          placeholder={"1   그러므로 그리스도 예수 안에 있는 사람들은 ...\n2   그것은, ..."}
          className="rounded-xl border px-3 py-2 font-sans text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            className={`${btn} bg-slate-900 text-white`}
            disabled={admin.busy || parsedCount === 0}
            onClick={async () => {
              await admin.upsertVerses(parsed);
              setRaw("");
            }}
          >
            {parsedCount}절 저장
          </button>
          <span className="text-sm text-slate-500">저장됨 {savedCount}/39</span>
        </div>
        {missing.length > 0 && <p className="text-sm text-amber-700">비어 있는 절: {missing.join(", ")}</p>}
      </section>
      <section className="max-h-[70vh] overflow-auto">
        <h3 className="font-display text-2xl mb-2">저장된 본문</h3>
        <ol className="flex flex-col gap-1 text-sm">
          {Array.from({ length: 39 }, (_, i) => i + 1).map((v) => (
            <li key={v} className={`flex gap-2 ${game.verses[v] ? "" : "text-slate-400"}`}>
              <span className="w-6 text-right shrink-0 text-slate-400">{v}</span>
              <span className="flex-1">{game.verses[v] || "—"}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
