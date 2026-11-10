"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/Board";
import { Scoreboard } from "@/components/Scoreboard";
import { ActionCard } from "@/components/ActionCard";
import { FeedToasts } from "@/components/FeedToasts";
import { Ceremony } from "@/components/Ceremony";
import { TeamAvatar } from "@/components/TeamAvatar";
import { ITEMS } from "@/game/items";
import { ItemIcon } from "@/components/ItemIcon";
import { HelpButton } from "@/components/HelpOverlay";
import { isBoost } from "@/game/reducer";
import { useGame } from "@/lib/useGame";

const ME_KEY = "sbvp:me";

interface Me {
  memberId: string;
  teamId: string;
  nickname: string;
}

export default function JoinPage() {
  const game = useGame();
  const { state, teams, teamById } = game;
  const [me, setMe] = useState<Me | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ME_KEY);
      if (raw) setMe(JSON.parse(raw));
    } catch {}
  }, []);

  // 등록된 팀이 삭제됐으면 다시 고르게
  useEffect(() => {
    if (me && !game.loading && teams.length && !teamById[me.teamId]) {
      localStorage.removeItem(ME_KEY);
      setMe(null);
    }
  }, [me, game.loading, teams.length, teamById]);

  async function join() {
    if (!picked || !game.backend) return;
    const name = nickname.trim();
    if (!name) {
      setErr("이름을 입력해 주세요");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const m = await game.backend.joinTeam(picked, name);
      const v = { memberId: m.id, teamId: picked, nickname: name };
      localStorage.setItem(ME_KEY, JSON.stringify(v));
      setMe(v);
      game.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (game.loading) return <main className="min-h-full bg-[#0b1033]"><Center>불러오는 중…</Center></main>;

  // ------------------------- 팀 선택 -------------------------
  if (!me) {
    return (
      <main className="min-h-full bg-[#0b1033] text-white p-5">
        <h1 className="font-display text-3xl text-center"><span className="text-yellow-300">★</span> 로마서 8장 암송 파티</h1>
        <p className="text-center text-white/60 mt-1">우리 팀을 골라 주세요</p>
        {teams.length === 0 && <p className="text-center mt-8 text-white/50">아직 팀이 등록되지 않았어요. 잠시 후 다시 열어 주세요.</p>}
        <div className="grid grid-cols-2 gap-3 mt-5">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPicked(t.id);
                setErr(null);
              }}
              className={`glass p-4 flex flex-col items-center gap-2 transition border-2 ${
                picked === t.id ? "scale-[1.03]" : "border-transparent"
              }`}
              style={{ borderColor: picked === t.id ? t.color : undefined }}
            >
              <TeamAvatar team={t} size={72} />
              <span className="font-display text-2xl" style={{ color: t.color }}>
                {t.name}
              </span>
              <span className="text-sm text-white/50">{game.members.filter((m) => m.team_id === t.id).length}명 참가</span>
            </button>
          ))}
        </div>
        {picked && (
          <div className="mt-5 glass p-4 flex flex-col gap-3">
            <label className="font-display text-xl">내 이름</label>
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setErr(null);
              }}
              maxLength={30}
              placeholder="예: 김다니엘"
              className="rounded-2xl bg-white text-slate-900 px-4 py-3 text-lg"
            />
            {err && <p className="text-sm text-rose-300">{err}</p>}
            <button
              onClick={join}
              disabled={busy}
              className="rounded-2xl py-3 font-display text-2xl text-white disabled:opacity-50"
              style={{ background: teamById[picked]?.color }}
            >
              {busy ? "등록 중…" : `${teamById[picked]?.name} 팀으로 참가!`}
            </button>
          </div>
        )}
      </main>
    );
  }

  // ------------------------- 관전 -------------------------
  const myTeam = teamById[me.teamId];
  const myState = state.teams[me.teamId];

  return (
    <main className="min-h-full bg-[#0b1033] text-white pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-[#0b1033]/85 backdrop-blur border-b border-white/10">
        <TeamAvatar team={myTeam} size={36} />
        <div className="min-w-0">
          <div className="font-display text-lg leading-tight truncate" style={{ color: myTeam?.color }}>
            {myTeam?.name}
          </div>
          <div className="text-xs text-white/50 truncate">{me.nickname}</div>
        </div>
        {state.started && state.phase !== "ended" && (
          <div className="ml-auto font-display text-lg">
            {state.turn}/{state.settings.totalTurns}턴 {isBoost(state) && <span className="text-red-500">🔥2배</span>}
          </div>
        )}
        <button
          className="ml-2 text-xs text-white/40 underline"
          onClick={() => {
            if (confirm("팀을 다시 고를까요?")) {
              localStorage.removeItem(ME_KEY);
              setMe(null);
              setPicked(null);
            }
          }}
        >
          팀 변경
        </button>
      </header>

      {!state.started ? (
        <Center>
          <div className="text-5xl mb-3">⏳</div>
          곧 게임이 시작돼요!
        </Center>
      ) : state.phase === "ended" ? (
        <div className="p-3">
          <Ceremony state={state} teamById={teamById} big={false} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {myState && (
            <div className="glass p-3 flex items-center justify-around font-display text-2xl">
              <span>⭐ {myState.stars}</span>
              <span className="text-amber-200">🪙 {myState.talents}</span>
              <span className="flex gap-1.5">
                {myState.items.length === 0 && <span className="text-sm text-white/40">아이템 없음</span>}
                {myState.items.map((i, k) => (
                  <span key={k} className="inline-flex flex-col items-center w-12">
                    <span className="inline-flex w-9 h-9 rounded-xl bg-white/15 items-center justify-center">
                      <ItemIcon id={i} size={24} />
                    </span>
                    <span className="text-[10px] text-white/70 leading-tight truncate w-full text-center">{ITEMS[i].name}</span>
                  </span>
                ))}
              </span>
            </div>
          )}
          <ActionCard state={state} teamById={teamById} verses={game.verses} size="sm" />
          <div className="relative rounded-3xl overflow-hidden shadow-lg ring-1 ring-white/10">
            <Board state={state} teamById={teamById} highlightTeam={me.teamId} compact />
            <div className="absolute top-2 left-0 right-0 flex justify-center">
              <FeedToasts state={state} teamById={teamById} big={false} />
            </div>
          </div>
          <Scoreboard state={state} teamById={teamById} highlightTeam={me.teamId} compact />
        </div>
      )}

      {state.paused && <div className="fixed bottom-4 left-4 right-4 rounded-2xl bg-black/70 text-white text-center py-3 font-display text-xl">잠시만요 ⏸</div>}
      <HelpButton settings={state.settings} className="fixed bottom-5 right-5 w-14 h-14 text-3xl z-40" />
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex flex-col items-center justify-center text-center font-display text-2xl text-white/80 p-6">{children}</div>;
}
