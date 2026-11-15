"use client";

import { useState } from "react";
import { ManualTab } from "./ManualTab";
import { isBoost } from "@/game/reducer";
import { useAdmin, useGame, type GameData } from "@/lib/useGame";
import { type Admin, btn } from "./ui";
import { UndoRedo, ControlTab } from "./ControlTab";
import { TeamsTab } from "./TeamsTab";
import { VersesTab } from "./VersesTab";
import { OverrideTab } from "./OverrideTab";
import { LogTab } from "./LogTab";
import { SettingsTab } from "./SettingsTab";

type Tab = "control" | "teams" | "verses" | "override" | "log" | "settings" | "manual";

export default function AdminPage() {
  const game = useGame();
  const admin = useAdmin(game);
  const [tab, setTab] = useState<Tab>("control");

  if (!admin.pass) return <Login admin={admin} game={game} />;

  const { state } = game;

  return (
    <main className="min-h-full bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-20 bg-slate-900 text-white px-4 py-2 flex flex-wrap items-center gap-2">
        <span className="font-display text-xl">🎛️ 어드민</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${game.backend?.mode === "local" ? "bg-yellow-400 text-black" : "bg-emerald-500"}`}>
          {game.backend?.mode === "local" ? "로컬 데모" : "Supabase"}
        </span>
        {state.started && state.phase !== "ended" && (
          <span className="text-sm">
            {state.turn}/{state.settings.totalTurns}턴 {isBoost(state) && "🔥2배"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <UndoRedo game={game} admin={admin} />
          {state.started && (
            <button className={`${btn} ${state.paused ? "bg-green-500" : "bg-slate-600"}`} disabled={admin.busy} onClick={() => admin.send({ type: "pause", payload: { paused: !state.paused } })}>
              {state.paused ? "▶ 재개" : "⏸ 일시정지"}
            </button>
          )}
          <button className="text-xs underline opacity-70" onClick={admin.logout}>
            로그아웃
          </button>
        </div>
      </header>

      {(admin.error || game.error) && (
        <div className="bg-red-100 text-red-800 px-4 py-2 flex items-center gap-2">
          ⚠️ {admin.error || game.error}
          <button className="ml-auto underline text-sm" onClick={admin.clearError}>
            닫기
          </button>
        </div>
      )}

      <nav className="flex gap-1 px-4 pt-3">
        {(
          [
            ["control", "진행"],
            ["teams", "팀·참가자"],
            ["verses", "본문"],
            ["override", "강제 개입"],
            ["log", "달란트 장부·로그"],
            ["settings", "설정"],
            ["manual", "설명서"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-t-xl px-4 py-2 font-bold ${tab === k ? "bg-white" : "bg-slate-200 text-slate-500"}`}>
            {l}
          </button>
        ))}
      </nav>
      <div className="bg-white mx-4 mb-4 rounded-b-2xl rounded-tr-2xl p-4 shadow-sm">
        {tab === "control" && <ControlTab game={game} admin={admin} goSettings={() => setTab("settings")} />}
        {tab === "teams" && <TeamsTab game={game} admin={admin} />}
        {tab === "verses" && <VersesTab game={game} admin={admin} />}
        {tab === "override" && <OverrideTab game={game} admin={admin} />}
        {tab === "log" && <LogTab game={game} />}
        {tab === "settings" && <SettingsTab game={game} admin={admin} />}
        {tab === "manual" && <ManualTab settings={game.state.settings} />}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
function Login({ admin, game }: { admin: Admin; game: GameData }) {
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <main className="min-h-full flex items-center justify-center bg-slate-100 text-slate-800 p-6">
      <form
        className="bg-white rounded-3xl shadow p-6 w-full max-w-sm flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!p) return setErr("패스코드를 입력하세요");
          try {
            const ok = await admin.login(p);
            if (!ok) setErr("패스코드가 올바르지 않습니다");
          } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : String(e2));
          }
        }}
      >
        <h1 className="font-display text-3xl">🎛️ 어드민 로그인</h1>
        {game.backend?.mode === "local" && <p className="text-sm text-amber-700">로컬 데모 모드입니다. 기본 패스코드: demo</p>}
        <input type="password" value={p} onChange={(e) => { setP(e.target.value); setErr(null); }} className="rounded-xl border-2 px-3 py-2" placeholder="패스코드" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className={`${btn} bg-slate-900 text-white`}>입장</button>
      </form>
    </main>
  );
}
