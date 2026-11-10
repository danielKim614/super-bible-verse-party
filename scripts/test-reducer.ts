// 리듀서 시나리오 테스트: npm run test:reducer
// 보드: 1~3 → 갈림(3) → 4~7 / 8~11 → 12~16 → 갈림(16) → 17~23 / 24~28 → 🏪 → 29~30 → 갈림(30) → 31~35 / 36~39 → 출발
import assert from "node:assert/strict";
import { SPACE_BY_ID } from "../src/game/board";
import { applyEvent, effectiveRedMode, finalRanking, initialState, isBoost, replay } from "../src/game/reducer";
import { DEFAULT_SETTINGS, type GameEvent, type GameEventBody, type GameState } from "../src/game/types";

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
s = ev(s, { type: "start_game", payload: { teamIds: teams, settings: { ...DEFAULT_SETTINGS, starCount: 2 }, seed: 42 } });
assert.equal(s.phase, "pre_roll");
assert.equal(s.stars.length, 2);
for (const t of teams) assert.equal(s.teams[t].talents, 10);

// 스타를 경로 밖에 고정
s = ev(s, { type: "override", payload: { action: "starPositions", stars: [22, 38] } });

// A팀: 3칸 → 3절(빨간 칸, 갈림길 칸) 도착 → 성공 +5
s = ev(s, { type: "roll", payload: { value: 3 } });
assert.equal(s.teams.A.pos, 3);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 1 } });
assert.equal(s.teams.A.talents, 10 + s.settings.rewards.red);
assert.equal(s.teams.A.challengeSuccess, 1);
s = ev(s, { type: "end_turn", payload: {} });

// B팀: 14에서 4칸 → 16(갈림) → 지름길 → 24, 25 도착(아이템 칸) → 실패
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 14 } });
s = ev(s, { type: "roll", payload: { value: 4 } });
assert.equal(s.phase, "choose_path");
assert.equal(s.teams.B.pos, 16);
s = ev(s, { type: "choose_path", payload: { option: 1 } });
assert.equal(s.teams.B.pos, 25);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: false, seed: 2 } });
assert.equal(s.teams.B.talents, 10);
assert.equal(s.teams.B.items.length, 0); // 실패 시 아이템 없음
s = ev(s, { type: "end_turn", payload: {} });

// C팀: 스타 지나가기 → 구매 → 암송 성공 → 상점 통과 → 계속 이동
s = ev(s, { type: "override", payload: { action: "talents", teamId: "C", delta: 20 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "C", pos: 20 } });
s = ev(s, { type: "roll", payload: { value: 5 } }); // 21, 22(★), 23, 🏪, 29, 30
assert.equal(s.phase, "star_offer");
assert.equal(s.ctx.starAt, 22);
s = ev(s, { type: "star_decision", payload: { buy: true } });
assert.equal(s.phase, "star_recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 3 } });
assert.equal(s.teams.C.stars, 1);
assert.equal(s.teams.C.talents, 10);
assert.ok(!s.stars.includes(22));
assert.equal(s.stars.length, 2);
assert.equal(s.phase, "shop_offer"); // 23 다음 상점
assert.equal(s.teams.C.pos, 23);
s = ev(s, { type: "shop_leave", payload: {} });
assert.equal(s.teams.C.pos, 30); // 29, 30 → 30 도착
assert.equal(s.phase, "recite");
const cBefore = s.teams.C.talents;
s = ev(s, { type: "recite_result", payload: { success: true, seed: 4 } });
assert.equal(s.teams.C.talents, cBefore + reward(30, s));
s = ev(s, { type: "end_turn", payload: {} });

// D팀: 출발 → 3(갈림) → 윗길 → 7절(아이템 칸) 도착 → 아이템 획득
s = ev(s, { type: "override", payload: { action: "position", teamId: "D", pos: 2 } });
s = ev(s, { type: "roll", payload: { value: 5 } }); // 3(갈림),4,5,6,7
assert.equal(s.phase, "choose_path");
s = ev(s, { type: "choose_path", payload: { option: 0 } });
assert.equal(s.teams.D.pos, 7);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 5 } });
assert.equal(s.teams.D.items.length, 1);
s = ev(s, { type: "end_turn", payload: {} });
s = ev(s, { type: "end_turn", payload: {} }); // resolve가 아니면 무시
assert.equal(s.teamIndex, 4);

// E팀: 상점(28→29 사이) 통과 → 구매 → 돈 부족 무시 → 나가기 → 30 도착
s = ev(s, { type: "override", payload: { action: "position", teamId: "E", pos: 28 } });
s = ev(s, { type: "roll", payload: { value: 2 } });
assert.equal(s.phase, "shop_offer");
assert.equal(s.teams.E.pos, 28);
s = ev(s, { type: "shop_buy", payload: { item: "shield" } });
assert.equal(s.teams.E.items[0], "shield");
assert.equal(s.teams.E.talents, 5);
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
assert.ok(s.ctx.blessTo);
assert.equal(s.teams[s.ctx.blessTo!].talents, beforeBless[s.ctx.blessTo!] + 5);
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

// 방패: A 8에서 1칸 → 9(빨간 칸, 첫 단어) → 방패 → 빈칸 채우기 방식, 보상은 빨간 칸 그대로
s = ev(s, { type: "override", payload: { action: "addItem", teamId: "A", item: "shield" } });
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.A.pos, 9);
s = ev(s, { type: "use_item", payload: { item: "shield" } });
assert.equal(s.teams.A.items.includes("shield"), false);
assert.equal(effectiveRedMode(s, 9), "blank");
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
for (let i = 0; i < 4; i++) s = ev(s, { type: "ceremony_next", payload: {} });
const rank = finalRanking(s);
assert.equal(rank.length, 6);
console.log("ranking", rank);
console.log("awards", s.ceremony!.awards.map((a) => [a.title, a.winners]));
console.log("✅ reducer tests passed");
