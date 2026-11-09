"use client";

import { useEffect, useMemo, useState } from "react";
import { Board } from "@/components/Board";
import { TeamAvatar } from "@/components/TeamAvatar";
import { describeEvent } from "@/components/describeEvent";
import { phaseHeadline, teamName, verseCard } from "@/components/describe";
import { SPACES, SPACE_LABEL } from "@/game/board";
import { ITEMS, ITEM_IDS, type ItemId } from "@/game/items";
import {
  canAffordStar,
  currentTeamId,
  isBoost,
  payoutText,
  replay,
  rollRange,
  starPriceFor,
  usableItems,
} from "@/game/reducer";
import { newSeed } from "@/game/rng";
import { DEFAULT_SETTINGS, type GameEvent, type Settings, type TeamInfo } from "@/game/types";
import { useAdmin, useGame, type GameData } from "@/lib/useGame";

type Admin = ReturnType<typeof useAdmin>;
type Tab = "control" | "teams" | "override" | "log" | "settings";

const btn = "rounded-xl px-4 py-2 font-bold shadow-sm active:scale-[0.97] transition disabled:opacity-40 disabled:pointer-events-none";

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
            ["override", "강제 개입"],
            ["log", "달란트 장부·로그"],
            ["settings", "설정"],
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
        {tab === "override" && <OverrideTab game={game} admin={admin} />}
        {tab === "log" && <LogTab game={game} />}
        {tab === "settings" && <SettingsTab game={game} admin={admin} />}
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

// ---------------------------------------------------------------------------
function talentDiff(game: GameData, toggled: GameEvent, voided: boolean) {
  const after = replay(game.events.map((e) => (e.id === toggled.id ? { ...e, voided } : e)));
  const lines: string[] = [];
  const ids = new Set([...Object.keys(after.teams), ...Object.keys(game.state.teams)]);
  for (const id of ids) {
    const d = (after.teams[id]?.talents ?? 0) - (game.state.teams[id]?.talents ?? 0);
    if (d !== 0) lines.push(`• ${teamName(game.teamById, id)}: 실물 ${Math.abs(d)}달란트 ${d < 0 ? "회수" : "지급"} (${payoutText(d)})`);
  }
  return lines;
}

function UndoRedo({ game, admin }: { game: GameData; admin: Admin }) {
  const last = admin.lastActive;
  const redo = admin.redoable;
  return (
    <>
      <button
        className={`${btn} bg-amber-500 text-black`}
        disabled={!last || admin.busy}
        title={last ? describeEvent(last, game.teamById) : ""}
        onClick={() => {
          if (!last) return;
          const lines = talentDiff(game, last, true);
          const msg = `마지막 입력을 되돌릴까요?\n\n"${describeEvent(last, game.teamById)}"${lines.length ? `\n\n⚠️ 실물 달란트 조정 필요:\n${lines.join("\n")}` : ""}`;
          if (confirm(msg)) admin.undo();
        }}
      >
        ↶ 되돌리기
      </button>
      <button
        className={`${btn} bg-slate-600`}
        disabled={!redo || admin.busy}
        title={redo ? describeEvent(redo, game.teamById) : ""}
        onClick={() => {
          if (!redo) return;
          const lines = talentDiff(game, redo, false);
          const msg = `다시 실행할까요?\n\n"${describeEvent(redo, game.teamById)}"${lines.length ? `\n\n⚠️ 실물 달란트 조정 필요:\n${lines.join("\n")}` : ""}`;
          if (confirm(msg)) admin.redo();
        }}
      >
        ↷ 다시
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// 진행
// ---------------------------------------------------------------------------
function ControlTab({ game, admin, goSettings }: { game: GameData; admin: Admin; goSettings: () => void }) {
  const { state, teamById } = game;
  if (!state.started) return <PreStart game={game} admin={admin} goSettings={goSettings} />;
  if (state.phase === "ended") return <CeremonyControl game={game} admin={admin} />;

  const tid = currentTeamId(state)!;
  const team = state.teams[tid];
  const info = teamById[tid];
  const ctx = state.ctx;
  const turnLedger = state.ledger.filter((l) => l.seq > (ctx.startSeq ?? 0) && l.teamId === tid);

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl p-3 border-4" style={{ borderColor: info?.color }}>
          <TeamAvatar team={info} size={56} />
          <div>
            <div className="font-display text-3xl" style={{ color: info?.color }}>
              {info?.name}
            </div>
            <div className="text-sm text-slate-500">
              위치 {team.pos === 0 ? "출발" : `${team.pos}절`} · ⭐{team.stars} · 🪙{team.talents} · 아이템{" "}
              {team.items.length ? team.items.map((i) => ITEMS[i].name).join(", ") : "없음"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-3">
          <div className="text-xs text-sky-700 font-bold">다음에 할 일</div>
          <div className="font-display text-2xl">{phaseHeadline(state, teamById)}</div>
        </div>

        {state.paused ? (
          <div className="rounded-2xl bg-slate-200 p-6 text-center font-display text-2xl">일시정지 중 — 상단의 재개를 누르세요</div>
        ) : (
          <PhaseControls game={game} admin={admin} />
        )}

        {turnLedger.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3">
            <div className="text-xs font-bold text-amber-800">💰 MC 실물 달란트 안내 (이번 턴)</div>
            {turnLedger.map((l, i) => (
              <div key={i} className="font-display text-2xl">
                {l.delta > 0 ? "지급" : "회수"} {Math.abs(l.delta)}달란트 <span className="text-lg text-slate-600">({payoutText(l.delta)}) · {l.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-2xl overflow-hidden border">
        <Board state={state} teamById={teamById} compact />
      </div>
    </div>
  );
}

function PhaseControls({ game, admin }: { game: GameData; admin: Admin }) {
  const { state } = game;
  const tid = currentTeamId(state)!;
  const team = state.teams[tid];
  const ctx = state.ctx;
  const items = usableItems(state);
  const busy = admin.busy;
  const send = admin.send;

  const itemButtons = items.length > 0 && (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-slate-500">아이템 사용:</span>
      {items.map((it) =>
        it === "selectDice" ? (
          <span key={it} className="flex gap-1">
            <button className={`${btn} bg-purple-100`} disabled={busy} onClick={() => send({ type: "use_item", payload: { item: it, choice: "low", seed: newSeed() } })}>
              {ITEMS[it].icon} 선택 다이스 낮음(1~3)
            </button>
            <button className={`${btn} bg-purple-100`} disabled={busy} onClick={() => send({ type: "use_item", payload: { item: it, choice: "high", seed: newSeed() } })}>
              {ITEMS[it].icon} 선택 다이스 높음(4~6)
            </button>
          </span>
        ) : (
          <button
            key={it}
            className={`${btn} bg-purple-100`}
            disabled={busy}
            onClick={() => {
              if ((it === "warpPipe" || it === "goldenPipe") && !confirm(`${ITEMS[it].name}을(를) 사용할까요?`)) return;
              send({ type: "use_item", payload: { item: it, seed: newSeed() } });
            }}
          >
            {ITEMS[it].icon} {ITEMS[it].name}
          </button>
        ),
      )}
    </div>
  );

  switch (state.phase) {
    case "pre_roll": {
      const [lo, hi] = rollRange(state);
      const faces = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      return (
        <div className="flex flex-col gap-3">
          {itemButtons}
          <div className="text-sm text-slate-500">
            {ctx.rollMode === "double" ? "주사위 2개 합계 입력" : ctx.rollMode === "low" || ctx.rollMode === "high" ? "나온 눈 그대로 입력 (자동 변환)" : "나온 눈 입력"}
          </div>
          <div className="grid grid-cols-6 gap-2">
            {faces.map((f) => (
              <button key={f} className={`${btn} bg-slate-900 text-white font-display text-4xl py-5`} disabled={busy} onClick={() => send({ type: "roll", payload: { value: f } })}>
                {f}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "choose_path":
      return (
        <div className="grid grid-cols-2 gap-3">
          <button className={`${btn} bg-stone-300 font-display text-2xl py-6`} disabled={busy} onClick={() => send({ type: "choose_path", payload: { path: "center" } })}>
            지름길
            <br />
            <span className="text-base">18~25 (짧고 어려움)</span>
          </button>
          <button className={`${btn} bg-sky-200 font-display text-2xl py-6`} disabled={busy} onClick={() => send({ type: "choose_path", payload: { path: "left" } })}>
            우회로
            <br />
            <span className="text-base">26~39 (길고 넉넉함)</span>
          </button>
        </div>
      );
    case "star_offer": {
      const normal = starPriceFor(state, false);
      const coupon = starPriceFor(state, true);
      const hasCoupon = team.items.includes("starCoupon");
      return (
        <div className="flex flex-col gap-3">
          <div className="text-slate-600">
            {ctx.starLanding ? `도착 칸(${ctx.starAt}절)에 스타가 있어요. 암송을 이미 성공했으니 바로 구매할 수 있어요.` : `${ctx.starAt}절의 스타를 지나갑니다. 구매하려면 이 절을 암송해야 해요.`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={`${btn} bg-yellow-400 font-display text-2xl py-4`} disabled={busy || team.talents < normal} onClick={() => send({ type: "star_decision", payload: { buy: true, seed: newSeed() } })}>
              ⭐ 살게요 ({normal})
            </button>
            {hasCoupon && (
              <button className={`${btn} bg-yellow-200 font-display text-2xl py-4`} disabled={busy || team.talents < coupon} onClick={() => send({ type: "star_decision", payload: { buy: true, coupon: true, seed: newSeed() } })}>
                🎟️ 할인권으로 ({coupon})
              </button>
            )}
            <button className={`${btn} bg-slate-200 font-display text-2xl py-4`} disabled={busy} onClick={() => send({ type: "star_decision", payload: { buy: false } })}>
              안 살래요
            </button>
          </div>
          {!canAffordStar(state, team) && <div className="text-red-600 text-sm">달란트가 부족합니다</div>}
        </div>
      );
    }
    case "star_recite":
    case "recite": {
      const space = state.phase === "recite" ? ctx.landed! : ctx.starAt!;
      const card = verseCard(state, space);
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-3xl">{card.ref}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm">{card.typeLabel}</span>
              {state.phase === "star_recite" && <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-sm">⭐ 스타 구매용 암송</span>}
              {ctx.doubleTalentOn && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-sm">✖️2</span>}
              {ctx.hintUsed && <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-sm">💡 힌트권 사용</span>}
            </div>
            <div className="text-slate-600 mt-1">암송 방식: <b>{card.modeLabel}</b></div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-lg leading-relaxed bg-slate-50 rounded-xl p-3">
              {card.fullText || "(본문 미입력 — src/game/verses.ts 에 새번역 본문을 넣어 주세요)"}
            </pre>
          </div>
          {itemButtons}
          <div className="grid grid-cols-2 gap-3">
            <button className={`${btn} bg-green-500 text-white font-display text-4xl py-6`} disabled={busy} onClick={() => send({ type: "recite_result", payload: { success: true, seed: newSeed() } })}>
              ⭕ 성공
            </button>
            <button className={`${btn} bg-slate-400 text-white font-display text-4xl py-6`} disabled={busy} onClick={() => send({ type: "recite_result", payload: { success: false, seed: newSeed() } })}>
              ❌ 실패
            </button>
          </div>
        </div>
      );
    }
    case "shop_offer":
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-3">
            <div className="font-display text-xl mb-1">🏪 출발점 상점 (보유 {team.items.length}/{state.settings.inventoryLimit}, 🪙{team.talents})</div>
            <div className="text-sm text-slate-500 mb-2">원하는 만큼 산 뒤 “출발”을 누르면 남은 칸을 계속 이동합니다. (남은 {ctx.remaining}칸)</div>
            <div className="flex flex-wrap gap-2">
              {ITEM_IDS.map((id) => {
                const d = ITEMS[id];
                const ok = team.talents >= d.price && team.items.length < state.settings.inventoryLimit;
                return (
                  <button key={id} className={`${btn} bg-white border`} disabled={busy || !ok} onClick={() => send({ type: "shop_buy", payload: { item: id } })} title={d.desc}>
                    {d.icon} {d.name} · {d.price}
                  </button>
                );
              })}
            </div>
          </div>
          <button className={`${btn} bg-sky-600 text-white font-display text-3xl py-5`} disabled={busy} onClick={() => send({ type: "shop_leave", payload: {} })}>
            🏪 상점에서 출발 ▶
          </button>
        </div>
      );
    case "resolve": {
      return (
        <div className="flex flex-col gap-3">
          {ctx.gainedItem === "full" && <div className="text-amber-700">아이템 가방이 가득 차서 아이템을 받지 못했어요.</div>}
          <button className={`${btn} bg-sky-600 text-white font-display text-3xl py-5`} disabled={busy} onClick={() => send({ type: "end_turn", payload: {} })}>
            다음 팀으로 ▶
          </button>
        </div>
      );
    }
  }
  return null;
}

function PreStart({ game, admin, goSettings }: { game: GameData; admin: Admin; goSettings: () => void }) {
  const settings = useSettingsDraft();
  const teams = game.teams;
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-display text-3xl">게임 시작 전 준비</h2>
      <ol className="list-decimal pl-5 text-slate-600 space-y-1">
        <li>“팀·참가자” 탭에서 팀 이름과 말 이미지 등록</li>
        <li>참가자들은 메인 스크린 QR로 접속해 팀 선택</li>
        <li>“설정” 탭에서 턴 수 확인</li>
      </ol>
      <div className="rounded-2xl bg-slate-50 p-3">
        <div className="font-bold mb-2">참가 팀 ({teams.length})</div>
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <span key={t.id} className="flex items-center gap-1 rounded-full bg-white px-2 py-1 border">
              <TeamAvatar team={t} size={24} /> {t.name} · {game.members.filter((m) => m.team_id === t.id).length}명
            </span>
          ))}
        </div>
      </div>
      <div className="text-sm text-slate-500">
        설정: {settings.totalTurns}턴 · 시작 {settings.startTalents}달란트 · 스타 {settings.starCount}개/{settings.starPrice}달란트 ·{" "}
        <button className="underline" onClick={goSettings}>
          변경
        </button>
      </div>
      <button
        className={`${btn} bg-green-500 text-white font-display text-3xl py-5`}
        disabled={admin.busy || teams.length < 2}
        onClick={() => {
          if (!confirm(`${teams.length}팀으로 게임을 시작할까요? (팀 순서 = 슬롯 순서)`)) return;
          admin.send({ type: "start_game", payload: { teamIds: teams.map((t) => t.id), settings, seed: newSeed() } });
        }}
      >
        🎲 게임 시작
      </button>
    </div>
  );
}

function CeremonyControl({ game, admin }: { game: GameData; admin: Admin }) {
  const { state, teamById } = game;
  const c = state.ceremony!;
  const total = c.awards.length + 1;
  const label = c.step === 0 ? "환급 확인 후 → 첫 번째 보너스 스타 공개" : c.step < c.awards.length ? `다음 보너스 스타 공개 (${c.step + 1}/${c.awards.length})` : c.step === c.awards.length ? "최종 순위 공개" : "시상식 완료";
  const refunds = Object.entries(c.refunds).filter(([, v]) => v > 0);
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-display text-3xl">🏆 시상식 진행</h2>
      {c.step === 0 && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3">
          <div className="text-xs font-bold text-amber-800">💰 MC 실물 달란트 안내 — 남은 아이템 환급</div>
          {refunds.length === 0 && <div>환급 없음</div>}
          {refunds.map(([id, v]) => (
            <div key={id} className="font-display text-xl">
              {teamName(teamById, id)}: 지급 {v} ({payoutText(v)})
            </div>
          ))}
        </div>
      )}
      <button className={`${btn} bg-yellow-400 font-display text-3xl py-5`} disabled={admin.busy || c.step >= total} onClick={() => admin.send({ type: "ceremony_next", payload: {} })}>
        {label} ▶
      </button>
      <div className="text-sm text-slate-500">
        진행 {c.step}/{total}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 팀·참가자
// ---------------------------------------------------------------------------
const PALETTE = ["#e5484d", "#f76b15", "#ffc53d", "#30a46c", "#0090ff", "#8e4ec6", "#d6409f", "#12a594"];

function TeamsTab({ game, admin }: { game: GameData; admin: Admin }) {
  const [draft, setDraft] = useState<Partial<TeamInfo> | null>(null);
  const teams = game.teams;
  return (
    <div className="flex flex-col gap-4">
      {game.state.started && <div className="rounded-xl bg-amber-50 p-2 text-sm text-amber-800">게임 중에는 이름·이미지만 바꾸세요. 팀 추가/삭제는 진행 중인 게임에 반영되지 않습니다.</div>}
      <ul className="flex flex-col gap-2">
        {teams.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl border px-3 py-2">
            <span className="w-6 text-center text-slate-400">{t.slot}</span>
            <TeamAvatar team={t} size={44} />
            <span className="font-display text-xl" style={{ color: t.color }}>
              {t.name}
            </span>
            <span className="flex flex-wrap gap-1 text-sm">
              {game.members
                .filter((m) => m.team_id === t.id)
                .map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2">
                    {m.nickname}
                    <button className="text-red-500" onClick={() => confirm(`${m.nickname} 님을 삭제할까요?`) && admin.deleteMember(m.id)}>
                      ×
                    </button>
                  </span>
                ))}
            </span>
            <span className="ml-auto flex gap-3 text-sm whitespace-nowrap">
              <button className="underline" onClick={() => setDraft(t)}>
                수정
              </button>
              <button className="underline text-red-600" onClick={() => confirm(`${t.name} 팀을 삭제할까요?`) && admin.deleteTeam(t.id)}>
                삭제
              </button>
            </span>
          </li>
        ))}
      </ul>
      {!draft && (
        <button className={`${btn} bg-slate-900 text-white self-start`} onClick={() => setDraft({ slot: teams.length + 1, name: "", color: PALETTE[teams.length % PALETTE.length], image_url: "" })}>
          + 팀 추가
        </button>
      )}
      {draft && (
        <TeamForm
          draft={draft}
          onCancel={() => setDraft(null)}
          onSave={async (t) => {
            await admin.upsertTeam(t);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}

/** 이미지 파일을 정사각형 160px 데이터 URL로 축소 */
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const g = c.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    img.src = url;
  });
}

function TeamForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<TeamInfo>;
  onCancel: () => void;
  onSave: (t: { id?: string; slot: number; name: string; color: string; image_url: string | null }) => void;
}) {
  const [v, setV] = useState(draft);
  const [err, setErr] = useState<string | null>(null);
  const preview: TeamInfo = { id: "", slot: v.slot ?? 1, name: v.name || "?", color: v.color ?? "#888", image_url: v.image_url || null };
  return (
    <form
      className="rounded-2xl border-2 p-4 flex flex-wrap items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.name?.trim()) return setErr("팀 이름을 입력하세요");
        onSave({ id: v.id, slot: v.slot ?? 1, name: v.name.trim(), color: v.color || "#888", image_url: v.image_url?.trim() || null });
      }}
    >
      <label className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-500">
        <TeamAvatar team={preview} size={72} />
        말 이미지
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              setV({ ...v, image_url: await fileToAvatar(f) });
              setErr(null);
            } catch (e2) {
              setErr(e2 instanceof Error ? e2.message : String(e2));
            }
          }}
        />
      </label>
      <label className="flex flex-col text-sm flex-1 min-w-[160px]">
        팀 이름
        <input
          autoFocus
          value={v.name ?? ""}
          onChange={(e) => {
            setV({ ...v, name: e.target.value });
            setErr(null);
          }}
          className="rounded-lg border px-3 py-2 text-lg"
        />
      </label>
      <label className="flex flex-col text-sm">
        색
        <input type="color" value={v.color ?? "#888888"} onChange={(e) => setV({ ...v, color: e.target.value })} className="w-12 h-10 rounded-lg border" />
      </label>
      <label className="flex flex-col text-sm">
        순서
        <input type="number" min={1} value={v.slot ?? 1} onChange={(e) => setV({ ...v, slot: Number(e.target.value) })} className="w-16 rounded-lg border px-2 py-2" />
      </label>
      <div className="flex gap-2">
        <button className={`${btn} bg-slate-900 text-white`}>저장</button>
        <button type="button" className={`${btn} bg-slate-200`} onClick={onCancel}>
          취소
        </button>
      </div>
      {err && <p className="text-sm text-red-600 w-full">{err}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// 강제 개입
// ---------------------------------------------------------------------------
function OverrideTab({ game, admin }: { game: GameData; admin: Admin }) {
  const { state, teamById } = game;
  const [teamId, setTeamId] = useState<string>("");
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState("");
  const [item, setItem] = useState<ItemId>("doubleDice");
  const [pos, setPos] = useState(1);
  const [stars, setStars] = useState("");
  const [turns, setTurns] = useState(state.settings.totalTurns);
  const [cur, setCur] = useState({ turn: state.turn, idx: state.teamIndex });
  const send = admin.send;

  useEffect(() => {
    if (!teamId && state.teamIds[0]) setTeamId(state.teamIds[0]);
  }, [teamId, state.teamIds]);
  useEffect(() => setStars(state.stars.join(", ")), [state.stars]);

  if (!state.started) return <p className="text-slate-500">게임 시작 후 사용할 수 있어요.</p>;
  const t = state.teams[teamId];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-2xl">팀별 조정</h3>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg border px-2 py-2">
          {state.teamIds.map((id) => (
            <option key={id} value={id}>
              {teamName(teamById, id)}
            </option>
          ))}
        </select>
        {t && (
          <div className="text-sm text-slate-600">
            위치 {t.pos === 0 ? "출발" : `${t.pos}절`} · ⭐{t.stars} · 🪙{t.talents} · {t.items.map((i) => ITEMS[i].name).join(", ") || "아이템 없음"}
          </div>
        )}
        <Row label="달란트">
          <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="w-24 rounded-lg border px-2 py-1" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="사유 (선택)" className="flex-1 rounded-lg border px-2 py-1" />
          <button className={`${btn} bg-amber-400`} disabled={!delta || admin.busy} onClick={() => { send({ type: "override", payload: { action: "talents", teamId, delta, note } }); setDelta(0); setNote(""); }}>
            적용
          </button>
        </Row>
        <Row label="스타">
          <button className={`${btn} bg-yellow-200`} onClick={() => send({ type: "override", payload: { action: "stars", teamId, delta: 1 } })}>+1</button>
          <button className={`${btn} bg-yellow-100`} onClick={() => send({ type: "override", payload: { action: "stars", teamId, delta: -1 } })}>−1</button>
        </Row>
        <Row label="아이템">
          <select value={item} onChange={(e) => setItem(e.target.value as ItemId)} className="rounded-lg border px-2 py-1">
            {ITEM_IDS.map((id) => (
              <option key={id} value={id}>
                {ITEMS[id].name}
              </option>
            ))}
          </select>
          <button className={`${btn} bg-purple-100`} onClick={() => send({ type: "override", payload: { action: "addItem", teamId, item } })}>추가</button>
          <button className={`${btn} bg-purple-50`} disabled={!t?.items.includes(item)} onClick={() => send({ type: "override", payload: { action: "removeItem", teamId, item } })}>삭제</button>
        </Row>
        <Row label="위치">
          <select value={pos} onChange={(e) => setPos(Number(e.target.value))} className="rounded-lg border px-2 py-1">
            <option value={0}>출발</option>
            {SPACES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}절 ({SPACE_LABEL[s.type]})
              </option>
            ))}
          </select>
          <button className={`${btn} bg-sky-100`} onClick={() => send({ type: "override", payload: { action: "position", teamId, pos } })}>이동</button>
        </Row>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-2xl">게임 전체</h3>
        <Row label="스타 위치">
          <input value={stars} onChange={(e) => setStars(e.target.value)} className="flex-1 rounded-lg border px-2 py-1" placeholder="예: 12, 30" />
          <button
            className={`${btn} bg-yellow-200`}
            onClick={() =>
              send({ type: "override", payload: { action: "starPositions", stars: stars.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 39) } })
            }
          >
            적용
          </button>
        </Row>
        <Row label="총 턴 수">
          <input type="number" min={1} value={turns} onChange={(e) => setTurns(Number(e.target.value))} className="w-20 rounded-lg border px-2 py-1" />
          <button className={`${btn} bg-slate-200`} onClick={() => send({ type: "override", payload: { action: "totalTurns", value: turns } })}>적용</button>
        </Row>
        <Row label="2배 구간">
          {([
            [null, "자동"],
            [true, "켜기"],
            [false, "끄기"],
          ] as [boolean | null, string][]).map(([v, l]) => (
            <button key={l} className={`${btn} ${state.boostOverride === v ? "bg-red-500 text-white" : "bg-slate-100"}`} onClick={() => send({ type: "override", payload: { action: "boost", on: v } })}>
              {l}
            </button>
          ))}
        </Row>
        <Row label="현재 차례">
          <input type="number" min={1} value={cur.turn} onChange={(e) => setCur({ ...cur, turn: Number(e.target.value) })} className="w-16 rounded-lg border px-2 py-1" />
          턴
          <select value={cur.idx} onChange={(e) => setCur({ ...cur, idx: Number(e.target.value) })} className="rounded-lg border px-2 py-1">
            {state.teamIds.map((id, i) => (
              <option key={id} value={i}>
                {teamName(teamById, id)}
              </option>
            ))}
          </select>
          <button className={`${btn} bg-slate-200`} onClick={() => confirm("이 팀 차례로 이동할까요? (현재 턴 진행은 취소됨)") && send({ type: "override", payload: { action: "setCurrent", turn: cur.turn, teamIndex: cur.idx } })}>
            이동
          </button>
        </Row>
        <div className="flex flex-wrap gap-2">
          <button className={`${btn} bg-slate-200`} onClick={() => confirm("현재 팀을 건너뛸까요?") && send({ type: "override", payload: { action: "skipTurn" } })}>
            ⏭ 현재 팀 건너뛰기
          </button>
          <button className={`${btn} bg-slate-200`} onClick={() => send({ type: "override", payload: { action: "forceRecite" } })}>
            🔁 현재 칸에서 다시 암송
          </button>
          <button className={`${btn} bg-red-100 text-red-700`} onClick={() => confirm("게임을 지금 종료하고 시상식으로 갈까요?") && send({ type: "override", payload: { action: "endGame" } })}>
            🏁 게임 종료
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-sm text-slate-500">{label}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 장부·로그
// ---------------------------------------------------------------------------
const CHECK_KEY = "sbvp:cashCheck";

function LogTab({ game }: { game: GameData }) {
  const { state, teamById, events } = game;
  const [checked, setChecked] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(CHECK_KEY) || "{}"));
    } catch {}
  }, []);
  const mark = (id: string) => {
    const next = { ...checked, [id]: state.teams[id].talents };
    setChecked(next);
    localStorage.setItem(CHECK_KEY, JSON.stringify(next));
  };
  const ledger = useMemo(() => [...state.ledger].reverse(), [state.ledger]);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.seq - a.seq), [events]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section>
        <h3 className="font-display text-2xl mb-2">팀별 잔액 · 실물 대조</h3>
        <div className="flex flex-col gap-1 mb-4">
          {state.teamIds.map((id) => {
            const ok = checked[id] === state.teams[id].talents;
            return (
              <div key={id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <TeamAvatar team={teamById[id]} size={28} />
                <span className="flex-1">{teamName(teamById, id)}</span>
                <span className="font-display text-xl">🪙{state.teams[id].talents}</span>
                <button className={`${btn} py-1 ${ok ? "bg-green-500 text-white" : "bg-white border"}`} onClick={() => mark(id)}>
                  {ok ? "✓ 실물 일치" : "실물 확인"}
                </button>
              </div>
            );
          })}
        </div>
        <h3 className="font-display text-2xl mb-2">달란트 장부</h3>
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-left">
            <tr>
              <th>#</th>
              <th>팀</th>
              <th>변동</th>
              <th>잔액</th>
              <th>사유</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((l, i) => (
              <tr key={i} className={`border-t ${l.manual ? "bg-amber-50" : ""}`}>
                <td className="text-slate-400">{l.seq}</td>
                <td>{teamName(teamById, l.teamId)}</td>
                <td className={l.delta > 0 ? "text-green-600" : "text-red-600"}>
                  {l.delta > 0 ? "+" : ""}
                  {l.delta}
                </td>
                <td>{l.balance}</td>
                <td>
                  {l.manual && <span className="rounded bg-amber-300 px-1 text-xs mr-1">수동</span>}
                  {l.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="font-display text-2xl mb-2">입력 기록</h3>
        <ul className="text-sm flex flex-col gap-0.5">
          {sortedEvents.map((e) => (
            <li key={e.id} className={`flex gap-2 ${e.voided ? "line-through text-slate-400" : ""}`}>
              <span className="w-8 text-slate-400">{e.seq}</span>
              <span className="flex-1">{describeEvent(e, teamById)}</span>
              <span className="text-slate-400">{e.created_at ? new Date(e.created_at).toLocaleTimeString("ko-KR") : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 설정
// ---------------------------------------------------------------------------
const SETTINGS_KEY = "sbvp:settingsDraft";

function useSettingsDraft(): Settings {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setS({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {}
  }, []);
  return s;
}

function SettingsTab({ game, admin }: { game: GameData; admin: Admin }) {
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
      {num("종반 2배 턴 수", "finalBoostTurns", 0)}
      {num("아이템 보유 한도", "inventoryLimit", 1)}
      {num("남은 아이템 환급(개당)", "itemRefund", 0)}
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
        <button
          className={`${btn} bg-red-600 text-white mt-2`}
          disabled={admin.busy || game.events.length === 0}
          onClick={() => {
            const word = prompt('정말 초기화하려면 "초기화"라고 입력하세요');
            if (word === "초기화") admin.resetGame();
          }}
        >
          게임 기록 초기화
        </button>
      </div>
    </div>
  );
}

