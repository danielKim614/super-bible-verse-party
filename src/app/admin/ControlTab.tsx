"use client";

/** 진행 탭: 되돌리기/다시, 단계별 입력, 게임 시작 전 준비, 시상식 진행, 주사위 입력 */
import { askConfirm } from "@/components/ConfirmDialog";
import { useState } from "react";
import { Board } from "@/components/Board";
import { TeamAvatar } from "@/components/TeamAvatar";
import { ItemIcon } from "@/components/ItemIcon";
import { describeEvent } from "@/components/describeEvent";
import { phaseHeadline, teamName, verseCard } from "@/components/describe";
import { FORKS, SPACES, spaceName } from "@/game/board";
import { ITEMS, ITEM_IDS } from "@/game/items";
import { canAffordStar, currentTeamId, payoutText, FULL_BAG_TALENTS, replay, diceCount, starPriceFor, usableItems } from "@/game/reducer";
import { newSeed } from "@/game/rng";
import { type GameEvent, type TeamInfo, type TurnCtx } from "@/game/types";
import { type GameData } from "@/lib/useGame";
import { type Admin, btn } from "./ui";
import { useSettingsDraft } from "./SettingsTab";

// ---------------------------------------------------------------------------
export function talentDiff(game: GameData, toggled: GameEvent, voided: boolean) {
  const after = replay(game.events.map((e) => (e.id === toggled.id ? { ...e, voided } : e)));
  const lines: string[] = [];
  const ids = new Set([...Object.keys(after.teams), ...Object.keys(game.state.teams)]);
  for (const id of ids) {
    const d = (after.teams[id]?.talents ?? 0) - (game.state.teams[id]?.talents ?? 0);
    if (d !== 0) lines.push(`• ${teamName(game.teamById, id)}: 실물 ${Math.abs(d)}달란트 ${d < 0 ? "회수" : "지급"} (${payoutText(d)})`);
  }
  return lines;
}

export function UndoRedo({ game, admin }: { game: GameData; admin: Admin }) {
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
          void askConfirm(msg, { okLabel: "되돌리기" }).then((ok) => { if (ok) void admin.undo(); });
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
          void askConfirm(msg, { okLabel: "다시 실행" }).then((ok) => { if (ok) void admin.redo(); });
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
export function ControlTab({ game, admin, goSettings }: { game: GameData; admin: Admin; goSettings: () => void }) {
  const { state, teamById } = game;
  if (!state.started) return <PreStart game={game} admin={admin} goSettings={goSettings} />;
  if (state.phase === "ended") return <CeremonyControl game={game} admin={admin} />;

  const tid = currentTeamId(state)!;
  const team = state.teams[tid];
  const info = teamById[tid];
  const ctx = state.ctx;
  const turnLedger = state.ledger.filter((l) => l.seq > (ctx.startSeq ?? 0));

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
              위치 {spaceName(team.pos)} · ⭐{team.stars} · 달란트 {team.talents} · 아이템{" "}
              {team.items.length ? team.items.map((i) => ITEMS[i]?.name ?? i).join(", ") : "없음"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-3">
          <div className="text-xs text-sky-700 font-bold">다음에 할 일</div>
          <div className="font-display text-2xl">{phaseHeadline(state, teamById)}</div>
        </div>

        {state.paused ? (
          <div className="rounded-2xl bg-slate-200 p-6 text-center font-display text-2xl">일시정지 중. 상단의 재개를 누르세요</div>
        ) : (
          <PhaseControls game={game} admin={admin} />
        )}

        {turnLedger.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3">
            <div className="text-xs font-bold text-amber-800">💰 MC 실물 달란트 안내 (이번 턴)</div>
            {turnLedger.map((l, i) => (
              <div key={i} className="font-display text-2xl">
                {l.teamId !== tid && <span className="text-lg mr-1" style={{ color: teamById[l.teamId]?.color }}>{teamName(teamById, l.teamId)}</span>}
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

export function PhaseControls({ game, admin }: { game: GameData; admin: Admin }) {
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
          <span key={it} className="flex items-center gap-1 rounded-xl bg-purple-50 pl-2 pr-1 py-1">
            <ItemIcon id={it} size={20} className="inline align-middle" />
            <span className="text-sm font-bold mr-1">선택 다이스 고정 눈:</span>
            {[1, 2, 3, 4, 5, 6].map((f) => (
              <button
                key={f}
                className={`${btn} bg-purple-100 px-3 py-1 font-display text-lg`}
                disabled={busy}
                onClick={() => send({ type: "use_item", payload: { item: it, face: f, seed: newSeed() } })}
              >
                {f}
              </button>
            ))}
          </span>
        ) : (
          <button
            key={it}
            className={`${btn} bg-purple-100`}
            disabled={busy}
            onClick={() => {
              const go = () => send({ type: "use_item", payload: { item: it, seed: newSeed() } });
              if (it === "warpPipe" || it === "goldenPipe") void askConfirm(`${ITEMS[it].name}을(를) 사용할까요?`, { okLabel: "사용" }).then((ok) => { if (ok) go(); });
              else go();
            }}
          >
            <ItemIcon id={it} size={20} className="inline mr-1 align-middle" />
            {ITEMS[it].name}
          </button>
        ),
      )}
    </div>
  );

  switch (state.phase) {
    case "pre_roll":
      return (
        <div className="flex flex-col gap-3">
          {itemButtons}
          <DiceInput key={`${ctx.startSeq}-${ctx.rollMode}`} n={diceCount(state)} mode={ctx.rollMode} fixedFace={ctx.fixedFace} busy={busy} onDone={(faces) => send({ type: "roll", payload: { value: faces.reduce((a, b) => a + b, 0), faces } })} />
        </div>
      );
    case "pipe_choose":
      return (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-slate-500">
            황금 파이프: 나올 칸을 누르세요 <span className="text-amber-600">★ = 스타가 있는 칸</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {SPACES.map((sp) => (
              <button
                key={sp.id}
                className={`${btn} px-0 py-2 font-display text-lg ${state.stars.includes(sp.id) ? "bg-amber-300" : "bg-slate-100"}`}
                disabled={busy || sp.id === team.pos}
                onClick={() => void askConfirm(`${spaceName(sp.id)}으로 나갈까요?`).then((ok) => { if (ok) void (send({ type: "pipe_exit", payload: { to: sp.id } })); })}
              >
                {state.stars.includes(sp.id) ? "★" : ""}
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      );
    case "choose_path":
      return (
        <div className="grid grid-cols-2 gap-3">
          {(FORKS[team.pos] ?? []).map((f, i) => (
            <button
              key={f.to}
              className={`${btn} ${i === 0 ? "bg-sky-200" : "bg-amber-200"} font-display text-2xl py-6`}
              disabled={busy}
              onClick={() => send({ type: "choose_path", payload: { option: i, label: f.label } })}
            >
              {f.label}로 갈래요
              <br />
              <span className="text-base">
                {f.to}절부터
              </span>
            </button>
          ))}
        </div>
      );
    case "star_offer": {
      const normal = starPriceFor(state, false);
      const coupon = starPriceFor(state, true);
      const hasCoupon = team.items.includes("starCoupon");
      return (
        <div className="flex flex-col gap-3">
          <div className="text-slate-600">
            {ctx.starLanding ? `도착 칸(${spaceName(ctx.starAt ?? 0)})에 스타가 있어요. 사면 바로 스타를 얻고, 사든 안 사든 이어서 이 칸 암송을 해요.` : `${spaceName(ctx.starAt ?? 0)}의 스타를 지나갑니다. 사면 바로 스타를 얻고 남은 칸을 계속 가요.`}
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
    case "recite": {
      const space = ctx.landed!;
      const card = verseCard(state, space, game.verses);
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-3xl">{card.ref}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm">{card.typeLabel}</span>
              {ctx.doubleTalentOn && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-sm">✖️2</span>}
              {ctx.hintUsed && <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-sm">💡 힌트권 사용</span>}
            </div>
            <div className="text-slate-600 mt-1">암송 방식: <b>{card.modeLabel}</b></div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-lg leading-relaxed bg-slate-50 rounded-xl p-3">
              {card.fullText || "(본문 미입력: “본문” 탭에서 새번역 본문을 넣어 주세요)"}
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
            <div className="font-display text-xl mb-1">🏪 상점 (보유 {team.items.length}/{state.settings.inventoryLimit}, 달란트 {team.talents})</div>
            <div className="text-sm text-slate-500 mb-2">원하는 만큼 산 뒤 “나가기”를 누르면 남은 칸을 계속 이동합니다. (남은 {ctx.remaining}칸)</div>
            <div className="flex flex-wrap gap-2">
              {ITEM_IDS.map((id) => {
                const d = ITEMS[id];
                const owned = team.items.includes(id);
                const ok = !owned && team.talents >= d.price && team.items.length < state.settings.inventoryLimit;
                return (
                  <button key={id} className={`${btn} bg-white border`} disabled={busy || !ok} onClick={() => send({ type: "shop_buy", payload: { item: id } })} title={owned ? "이미 가지고 있어요" : d.desc}>
                    <ItemIcon id={id} size={20} className="inline mr-1 align-middle" />
                    {d.name} · {owned ? "보유 중" : `가격: ${d.price} 달란트`}
                  </button>
                );
              })}
            </div>
          </div>
          <button className={`${btn} bg-sky-600 text-white font-display text-3xl py-5`} disabled={busy} onClick={() => send({ type: "shop_leave", payload: {} })}>
            🏪 상점 나가기 ▶
          </button>
        </div>
      );
    case "resolve": {
      return (
        <div className="flex flex-col gap-3">
          {ctx.gainedItem === "full" && <div className="text-amber-700">가방이 가득 찼거나 받을 수 있는 새 아이템이 없어서 아이템 대신 +{FULL_BAG_TALENTS} 달란트를 받았어요.</div>}
          <button className={`${btn} bg-sky-600 text-white font-display text-3xl py-5`} disabled={busy} onClick={() => send({ type: "end_turn", payload: {} })}>
            다음 팀으로 ▶
          </button>
        </div>
      );
    }
  }
  return null;
}

export function PreStart({ game, admin, goSettings }: { game: GameData; admin: Admin; goSettings: () => void }) {
  const settings = useSettingsDraft();
  const teams = game.teams;
  // 진행 순서: 운영자가 직접 정함. 저장된 순서에 없는 팀은 뒤에 붙고, 삭제된 팀은 빠진다.
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const ordered = [
    ...orderIds.map((id) => teams.find((t) => t.id === id)).filter((t): t is TeamInfo => !!t),
    ...teams.filter((t) => !orderIds.includes(t.id)),
  ];
  const move = (i: number, d: -1 | 1) => {
    const ids = ordered.map((t) => t.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setOrderIds(ids);
  };
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-display text-3xl">게임 시작 전 준비</h2>
      <ol className="list-decimal pl-5 text-slate-600 space-y-1">
        <li>“팀·참가자” 탭에서 팀 이름과 말 이미지 등록</li>
        <li>참가자들은 메인 스크린 QR로 접속해 팀 선택</li>
        <li>“설정” 탭에서 턴 수 확인</li>
      </ol>
      <div className="rounded-2xl bg-slate-50 p-3">
        <div className="font-bold mb-2">
          진행 순서 ({teams.length}팀) <span className="font-normal text-sm text-slate-500">▲▼로 순서를 정하세요</span>
        </div>
        <ol className="flex flex-col gap-1.5">
          {ordered.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 border">
              <span className="w-7 text-center font-display text-xl text-slate-500">{i + 1}</span>
              <TeamAvatar team={t} size={28} />
              <span className="flex-1 font-bold">{t.name}</span>
              <span className="text-sm text-slate-500">{game.members.filter((m) => m.team_id === t.id).length}명</span>
              <button className={`${btn} bg-slate-100 px-3 py-1`} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${t.name} 위로`}>
                ▲
              </button>
              <button className={`${btn} bg-slate-100 px-3 py-1`} disabled={i === ordered.length - 1} onClick={() => move(i, 1)} aria-label={`${t.name} 아래로`}>
                ▼
              </button>
            </li>
          ))}
        </ol>
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
          void askConfirm(`${teams.length}팀으로 게임을 시작할까요?\n순서: ${ordered.map((t) => t.name).join(" → ")}`, { okLabel: "시작" }).then(
            (ok) => {
              if (ok) void admin.send({ type: "start_game", payload: { teamIds: ordered.map((t) => t.id), settings, seed: newSeed(), v: 2 } });
            },
          );
        }}
      >
        🎲 게임 시작
      </button>
    </div>
  );
}

export function CeremonyControl({ game, admin }: { game: GameData; admin: Admin }) {
  const { state, teamById } = game;
  const c = state.ceremony!;
  // 0: 게임 종료(커튼) → 1: 환급 → 2..n+1: 보너스 스타 → n+2: 최종 순위
  const n = c.awards.length;
  const total = n + 2;
  const label =
    c.step === 0
      ? "커튼 열고 시상식 시작 (환급 안내)"
      : c.step === 1
        ? n > 0
          ? "환급 확인 후 → 첫 번째 보너스 스타 공개"
          : "최종 순위 공개 (두구두구 5초)"
        : c.step < n + 1
          ? `다음 보너스 스타 공개 (${c.step}/${n})`
          : c.step === n + 1
            ? "최종 순위 공개 (두구두구 5초)"
            : "시상식 완료";
  const refunds = Object.entries(c.refunds).filter(([, v]) => v > 0);
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-display text-3xl">🏆 시상식 진행</h2>
      {c.step === 0 && <div className="text-slate-600">메인 화면에 커튼이 쳐지고 “게임 종료” 화면이 나와 있어요. 준비되면 아래 버튼으로 시상식을 시작하세요.</div>}
      {c.step <= 1 && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3">
          <div className="text-xs font-bold text-amber-800">💰 MC 실물 달란트 안내: 남은 아이템 환급</div>
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

/** 주사위 눈 입력: 주사위마다 1~6 중 하나를 차례로 누르면 마지막 눈에서 자동 전송 */
export function DiceInput({ n, mode, fixedFace, busy, onDone }: { n: number; mode: TurnCtx["rollMode"]; fixedFace?: number; busy: boolean; onDone: (faces: number[]) => void }) {
  const [faces, setFaces] = useState<number[]>([]);
  const idx = faces.length;
  const pick = (f: number) => {
    const next = [...faces, f];
    if (next.length >= n) {
      onDone(next);
      setFaces([]);
    } else setFaces(next);
  };
  const fixed = mode === "fixed" ? fixedFace : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>
          {fixed !== undefined && <b className="text-purple-700">선택 다이스 {fixed} 고정 · </b>}
          {n > 0 ? (
            <>
              굴린 주사위 {n}개 · <b className="text-slate-800">{idx + 1}번째 눈</b>을 누르세요
            </>
          ) : (
            "굴릴 주사위가 없어요"
          )}
        </span>
        <span className="ml-auto flex gap-1">
          {fixed !== undefined && (
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg font-display text-xl bg-amber-400 text-slate-900">{fixed}</span>
          )}
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={`inline-flex w-9 h-9 items-center justify-center rounded-lg font-display text-xl ${faces[i] !== undefined ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"}`}>
              {faces[i] !== undefined ? faces[i] : "?"}
            </span>
          ))}
        </span>
        {faces.length > 0 && (
          <button className="underline" onClick={() => setFaces([])}>
            다시
          </button>
        )}
      </div>
      {n > 0 ? (
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <button key={f} className={`${btn} bg-slate-900 text-white font-display text-4xl py-5`} disabled={busy} onClick={() => pick(f)}>
              {f}
            </button>
          ))}
        </div>
      ) : (
        <button className={`${btn} bg-slate-900 text-white font-display text-3xl py-5`} disabled={busy} onClick={() => onDone([])}>
          {fixed}칸 이동 ▶
        </button>
      )}
    </div>
  );
}
