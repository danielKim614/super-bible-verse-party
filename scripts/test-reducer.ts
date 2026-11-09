// 리듀서 시나리오 테스트: npm run test:reducer
import assert from "node:assert/strict";
import { applyEvent, finalRanking, initialState, isBoost, replay } from "../src/game/reducer";
import { DEFAULT_SETTINGS, type GameEvent, type GameEventBody, type GameState } from "../src/game/types";

let seq = 0;
const log: GameEvent[] = [];
function ev(s: GameState, body: GameEventBody): GameState {
  seq += 1;
  const e = { ...body, id: seq, seq, voided: false } as GameEvent;
  log.push(e);
  return applyEvent(s, e);
}

const teams = ["A", "B", "C", "D", "E", "F"];
let s = initialState();
s = ev(s, { type: "start_game", payload: { teamIds: teams, settings: { ...DEFAULT_SETTINGS, starCount: 2 }, seed: 42 } });
assert.equal(s.phase, "pre_roll");
assert.equal(s.stars.length, 2);
assert.ok(s.stars.every((x) => x >= 1 && x <= 39));
for (const t of teams) assert.equal(s.teams[t].talents, 10);

// 별이 경로에 없도록 고정 후 A팀 3칸
s = ev(s, { type: "override", payload: { action: "starPositions", stars: [30, 38] } });
s = ev(s, { type: "roll", payload: { value: 3 } });
assert.equal(s.teams.A.pos, 3);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 1 } }); // 3절 = 빨간 칸 → +6
assert.equal(s.teams.A.talents, 16);
assert.equal(s.teams.A.challengeSuccess, 1);
assert.equal(s.phase, "resolve");
s = ev(s, { type: "end_turn", payload: {} });
assert.equal(s.teamIndex, 1);

// B팀: 위치를 15로 옮기고 4칸 → 17에서 갈림길
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 15 } });
s = ev(s, { type: "roll", payload: { value: 4 } });
assert.equal(s.phase, "choose_path");
assert.equal(s.teams.B.pos, 17);
s = ev(s, { type: "choose_path", payload: { option: 1 } });
assert.equal(s.teams.B.pos, 27);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: false, seed: 2 } });
assert.equal(s.teams.B.talents, 10);
s = ev(s, { type: "end_turn", payload: {} });

// C팀: 스타 지나가기 → 구매 → 암송 성공 → 계속 이동
s = ev(s, { type: "override", payload: { action: "talents", teamId: "C", delta: 20 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "C", pos: 28 } });
s = ev(s, { type: "roll", payload: { value: 4 } }); // 29, 30(★) 지나 31, 32
assert.equal(s.phase, "star_offer");
assert.equal(s.ctx.starAt, 30);
s = ev(s, { type: "star_decision", payload: { buy: true } });
assert.equal(s.phase, "star_recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 3 } });
assert.equal(s.teams.C.stars, 1);
assert.equal(s.teams.C.talents, 10);
assert.equal(s.teams.C.pos, 32);
assert.equal(s.stars.length, 2);
assert.ok(!s.stars.includes(30));
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 4 } });
assert.equal(s.teams.C.talents, 13); // 32절 파란 칸 +3
s = ev(s, { type: "end_turn", payload: {} });

// D팀: 아이템 칸(5) 도착 → 아이템 획득, 더블 다이스 사용 다음 턴
s = ev(s, { type: "override", payload: { action: "starPositions", stars: [20, 38] } });
s = ev(s, { type: "roll", payload: { value: 5 } });
assert.equal(s.phase, "choose_path"); // 4절 갈림길
s = ev(s, { type: "choose_path", payload: { option: 0 } }); // 윗길 → 5절(아이템 칸)
assert.equal(s.teams.D.pos, 5);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 5 } });
assert.equal(s.teams.D.items.length, 1);
s = ev(s, { type: "end_turn", payload: {} });
s = ev(s, { type: "end_turn", payload: {} }); // resolve가 아니면 무시되어야 함
assert.equal(s.teamIndex, 4);

// E팀: 출발점(상점) 통과 → 구매 → 계속 이동
s = ev(s, { type: "override", payload: { action: "position", teamId: "E", pos: 39 } });
s = ev(s, { type: "roll", payload: { value: 2 } });
assert.equal(s.phase, "shop_offer");
assert.equal(s.teams.E.pos, 39);
s = ev(s, { type: "shop_buy", payload: { item: "shield" } });
assert.equal(s.teams.E.items[0], "shield");
assert.equal(s.teams.E.talents, 5);
s = ev(s, { type: "shop_buy", payload: { item: "goldenPipe" } }); // 돈 부족 → 무시
assert.equal(s.teams.E.items.length, 1);
s = ev(s, { type: "shop_leave", payload: {} });
assert.equal(s.teams.E.pos, 2);
assert.equal(s.phase, "recite");
assert.equal(s.teams.E.laps, 1);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 6 } });
s = ev(s, { type: "end_turn", payload: {} });

// F팀: 스킵
s = ev(s, { type: "override", payload: { action: "skipTurn" } });
assert.equal(s.turn, 2);
assert.equal(s.teamIndex, 0);

// 축복 칸: F팀(꼴찌)이 아닌 팀이 15절에 멈추면 꼴찌에게 +5
s = ev(s, { type: "override", payload: { action: "position", teamId: "A", pos: 14 } });
const beforeBless = { ...Object.fromEntries(teams.map((t) => [t, s.teams[t].talents])) };
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.A.pos, 15);
assert.ok(s.ctx.blessTo);
assert.equal(s.teams[s.ctx.blessTo!].talents, beforeBless[s.ctx.blessTo!] + 5);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 9 } });
s = ev(s, { type: "end_turn", payload: {} });
// 해프닝 칸: 24절
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 23 } });
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.B.pos, 24);
assert.ok(s.ctx.happening?.text);
console.log("happening:", s.ctx.happening?.text);
s = ev(s, { type: "recite_result", payload: { success: false, seed: 10 } });
s = ev(s, { type: "end_turn", payload: {} });
// 다시 A팀 차례로 되돌려 놓기
s = ev(s, { type: "override", payload: { action: "setCurrent", turn: 2, teamIndex: 0 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "A", pos: 3 } }); // 3→4(갈림)→5,6,7

// Undo 재생: 마지막 이벤트(A 위치 변경) 무효화
const before = replay(log);
assert.deepEqual(before.teams, s.teams);
log[log.length - 1].voided = true;
const undone = replay(log);
assert.equal(undone.teams.A.pos, 15);
log[log.length - 1].voided = false;

// 방패: A팀 빨간 칸(7) 도착 → 방패 → 파란 칸 보상
s = ev(s, { type: "override", payload: { action: "addItem", teamId: "A", item: "shield" } });
s = ev(s, { type: "roll", payload: { value: 4 } });
assert.equal(s.phase, "choose_path"); // 4절 갈림길
assert.equal(s.teams.A.pos, 4);
s = ev(s, { type: "choose_path", payload: { option: 0 } });
assert.equal(s.teams.A.pos, 7);
s = ev(s, { type: "use_item", payload: { item: "shield" } });
const beforeShield = s.teams.A.talents;
const mult = isBoost(s) ? 2 : 1; // 해프닝 "황금 라운드"가 걸렸을 수 있음
s = ev(s, { type: "recite_result", payload: { success: true, seed: 7 } });
assert.equal(s.teams.A.talents, beforeShield + 3 * mult); // 방패 → 파란 칸 보상
s = ev(s, { type: "end_turn", payload: {} });

// 종반 2배 & 종료
s = ev(s, { type: "override", payload: { action: "setCurrent", turn: 8, teamIndex: 1 } });
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
