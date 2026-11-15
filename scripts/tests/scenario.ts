// 한 게임을 처음부터 끝까지 진행하는 시나리오 + 증분 재생
import assert from "node:assert/strict";
import { SPACE_BY_ID } from "../../src/game/board";
import { applyEvent, effectiveRedMode, finalRanking, initialState, isBoost, replay, replayIncremental, type ReplayCache } from "../../src/game/reducer";
import { ITEMS } from "../../src/game/items";
import { DEFAULT_SETTINGS, type GameEvent, type GameEventBody, type GameState } from "../../src/game/types";

let seq = 0;
const log: GameEvent[] = [];
function ev(s: GameState, body: GameEventBody): GameState {
  seq += 1;
  const e = { ...body, id: seq, seq, voided: false } as GameEvent;
  log.push(e);
  return applyEvent(s, e);
}
const reward = (space: number, s: GameState) => s.settings.rewards[SPACE_BY_ID[space].type] * (isBoost(s) ? 2 : 1);

const teams = ["A", "B", "C", "D", "E", "F"];
let s = initialState();
s = ev(s, { type: "start_game", payload: { teamIds: teams, settings: { ...DEFAULT_SETTINGS, starCount: 2, diceCount: 1 }, seed: 42 } });
assert.equal(s.phase, "pre_roll");
assert.equal(s.stars.length, 2);
for (const t of teams) assert.equal(s.teams[t].talents, 10);

// 스타를 경로 밖에 고정
s = ev(s, { type: "override", payload: { action: "starPositions", stars: [21, 38] } });

// A팀: 출발에서 2칸 → 1, 2절(갈림길 칸에 정확히 도착하면 그냥 암송) → 성공
s = ev(s, { type: "roll", payload: { value: 2 } });
assert.equal(s.teams.A.pos, 2);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 1 } });
assert.equal(s.teams.A.talents, 10 + s.settings.rewards.blue);
assert.equal(s.teams.A.challengeSuccess, 0);
s = ev(s, { type: "end_turn", payload: {} });

// B팀: 14에서 5칸 → 15(갈림) → 지름길 → 22, 23, 24, 25 도착(아이템 칸) → 실패
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 14 } });
s = ev(s, { type: "roll", payload: { value: 5 } });
assert.equal(s.phase, "choose_path");
assert.equal(s.teams.B.pos, 15);
s = ev(s, { type: "choose_path", payload: { option: 1 } });
assert.equal(s.teams.B.pos, 25);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: false, seed: 2 } });
assert.equal(s.teams.B.talents, 10);
assert.equal(s.teams.B.items.length, 0); // 실패 시 아이템 없음
s = ev(s, { type: "end_turn", payload: {} });

// C팀: 스타 지나가기 → 구매(암송 없이 바로) → 상점 통과 → 계속 이동
s = ev(s, { type: "override", payload: { action: "talents", teamId: "C", delta: 20 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "C", pos: 20 } });
s = ev(s, { type: "roll", payload: { value: 5 } }); // 21(★), 🎲, 🏪, 28, 29, 30
assert.equal(s.phase, "star_offer");
assert.equal(s.ctx.starAt, 21);
s = ev(s, { type: "star_decision", payload: { buy: true, seed: 3 } });
assert.equal(s.teams.C.stars, 1);
assert.equal(s.teams.C.talents, 10);
assert.ok(!s.stars.includes(21));
assert.equal(s.stars.length, 2);
assert.equal(s.phase, "shop_offer"); // 🎲(102) 다음 상점
assert.equal(s.teams.C.pos, 102);
s = ev(s, { type: "shop_leave", payload: {} });
assert.equal(s.teams.C.pos, 30); // 28, 29, 30 → 30 도착
assert.equal(s.phase, "recite");
const cBefore = s.teams.C.talents;
s = ev(s, { type: "recite_result", payload: { success: true, seed: 4 } });
assert.equal(s.teams.C.talents, cBefore + reward(30, s));
s = ev(s, { type: "end_turn", payload: {} });

// D팀: 1 → 2(갈림) → 아랫길 → 7절(아이템 칸) 도착 → 아이템 획득
s = ev(s, { type: "override", payload: { action: "position", teamId: "D", pos: 1 } });
s = ev(s, { type: "roll", payload: { value: 2 } }); // 2(갈림), 7
assert.equal(s.phase, "choose_path");
s = ev(s, { type: "choose_path", payload: { option: 1 } });
assert.equal(s.teams.D.pos, 7);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 5 } });
assert.equal(s.teams.D.items.length, 1);
s = ev(s, { type: "end_turn", payload: {} });
s = ev(s, { type: "end_turn", payload: {} }); // resolve가 아니면 무시
assert.equal(s.teamIndex, 4);

// E팀: 상점(27→28 사이) 통과 → 구매 → 돈 부족 무시 → 나가기 → 30 도착
s = ev(s, { type: "override", payload: { action: "position", teamId: "E", pos: 27 } });
s = ev(s, { type: "roll", payload: { value: 3 } });
assert.equal(s.phase, "shop_offer");
assert.equal(s.teams.E.pos, 27);
s = ev(s, { type: "shop_buy", payload: { item: "hint" } });
assert.equal(s.teams.E.items[0], "hint");
assert.equal(s.teams.E.talents, 10 - ITEMS.hint.price);
s = ev(s, { type: "shop_buy", payload: { item: "goldenPipe" } });
assert.equal(s.teams.E.items.length, 1);
s = ev(s, { type: "shop_leave", payload: {} });
assert.equal(s.teams.E.pos, 30);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 6 } });
s = ev(s, { type: "end_turn", payload: {} });

// F팀: 스킵 → 2턴 A
s = ev(s, { type: "override", payload: { action: "skipTurn" } });
assert.equal(s.turn, 2);
assert.equal(s.teamIndex, 0);

// 축복 칸(14): A가 13에서 1칸 → 꼴찌에게 +5
s = ev(s, { type: "override", payload: { action: "position", teamId: "A", pos: 13 } });
const beforeBless = Object.fromEntries(teams.map((t) => [t, s.teams[t].talents]));
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.A.pos, 14);
assert.ok(s.ctx.blessTo && s.ctx.blessTo.length > 0);
for (const id of s.ctx.blessTo!) assert.equal(s.teams[id].talents, beforeBless[id] + 5);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 9 } });
s = ev(s, { type: "end_turn", payload: {} });

// 해프닝 칸(19): B가 18에서 1칸
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 18 } });
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.B.pos, 19);
assert.ok(s.ctx.happening?.text);
console.log("happening:", s.ctx.happening?.text);
s = ev(s, { type: "recite_result", payload: { success: false, seed: 10 } });
s = ev(s, { type: "end_turn", payload: {} });

// 다시 A팀 차례로
s = ev(s, { type: "override", payload: { action: "setCurrent", turn: 2, teamIndex: 0 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "A", pos: 8 } });

// Undo 재생: 마지막 이벤트(A 위치 변경) 무효화
const before = replay(log);
assert.deepEqual(before.teams, s.teams);
log[log.length - 1].voided = true;
assert.equal(replay(log).teams.A.pos, 14);
log[log.length - 1].voided = false;

// 어려운 칸: A 8에서 1칸 → 9(빨간 칸) 성공 → 빨간 칸 보상, 도전 +1
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.A.pos, 9);
assert.ok(effectiveRedMode(s, 9));
const beforeShield = s.teams.A.talents;
const challengeBefore = s.teams.A.challengeSuccess;
const mult = isBoost(s) ? 2 : 1;
s = ev(s, { type: "recite_result", payload: { success: true, seed: 7 } });
assert.equal(s.teams.A.talents, beforeShield + s.settings.rewards.red * mult);
assert.equal(s.teams.A.challengeSuccess, challengeBefore + 1);
s = ev(s, { type: "end_turn", payload: {} });

// 출발점 통과: B 39에서 2칸 → 1, 2 (바퀴 +1, 상점 없음)
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 39 } });
const lapsBefore = s.teams.B.laps;
s = ev(s, { type: "roll", payload: { value: 2 } });
assert.equal(s.teams.B.pos, 2);
assert.equal(s.phase, "recite");
assert.equal(s.teams.B.laps, lapsBefore + 1);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 11 } });
s = ev(s, { type: "end_turn", payload: {} });

// 종반 2배 & 종료
s = ev(s, { type: "override", payload: { action: "setCurrent", turn: 8, teamIndex: 1 } });
s = ev(s, { type: "override", payload: { action: "boost", on: null } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 0 } });
s = ev(s, { type: "roll", payload: { value: 1 } }); // 1절 파란 → 3×2
s = ev(s, { type: "recite_result", payload: { success: true, seed: 8 } });
assert.equal(s.ctx.payout, 6);
s = ev(s, { type: "override", payload: { action: "endGame" } });
assert.equal(s.phase, "ended");
assert.equal(s.ceremony!.awards.length, 3);
for (let i = 0; i < 5; i++) s = ev(s, { type: "ceremony_next", payload: {} });
assert.equal(s.ceremony!.step, s.ceremony!.awards.length + 2);
// 더 눌러도 그대로
assert.equal(applyEvent(s, { id: 9999, seq: 9999, voided: false, type: "ceremony_next", payload: {} } as GameEvent).ceremony!.step, s.ceremony!.step);
const rank = finalRanking(s);
assert.equal(rank.length, 6);
console.log("ranking", rank);
console.log("awards", s.ceremony!.awards.map((a) => [a.title, a.winners]));
console.log("✅ reducer tests passed");

// 증분 재생: 이벤트를 하나씩 늘리거나 중간을 무효화해도 처음부터 계산한 결과와 같다
{
  let cache: ReplayCache | null = null;
  const evs = log.map((e) => ({ ...e }));
  for (let n = 1; n <= evs.length; n++) {
    const part = evs.slice(0, n);
    cache = replayIncremental(cache, part);
    assert.deepEqual(cache.state, replay(part));
  }
  // 중간 무효화(되돌리기) → 처음부터 다시
  evs[Math.floor(evs.length / 2)].voided = true;
  cache = replayIncremental(cache, evs);
  assert.deepEqual(cache.state, replay(evs));
  // 다시 살리기(다시 실행)
  evs[Math.floor(evs.length / 2)].voided = false;
  cache = replayIncremental(cache, evs);
  assert.deepEqual(cache.state, replay(evs));
  console.log("✅ incremental replay matches full replay over", evs.length, "events");
}
