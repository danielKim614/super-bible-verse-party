// 보드·스타 배치·워프 파이프
import assert from "node:assert/strict";
import { SPACE_BY_ID, nextSpace } from "../../src/game/board";
import { applyEvent, placeStar, replay } from "../../src/game/reducer";
import { rng } from "../../src/game/rng";
import { DEFAULT_SETTINGS, type GameEvent } from "../../src/game/types";

const teams = ["A", "B", "C", "D", "E", "F"];

// 스타는 말이 서 있는 칸에 생기지 않는다
{
  const base = replay([{ seq: 1, type: "start_game", payload: { teamIds: teams, settings: { ...DEFAULT_SETTINGS, starCount: 2 }, seed: 1 } } as never]);
  for (let seed = 1; seed <= 300; seed++) {
    const t = structuredClone(base);
    const occupied = [5, 9, 12, 20, 33];
    t.teamIds.forEach((id, i) => (t.teams[id].pos = occupied[i % occupied.length]));
    t.stars = [];
    placeStar(t, rng(seed));
    placeStar(t, rng(seed + 1000));
    for (const st of t.stars) assert.ok(!occupied.includes(st), `seed ${seed}: star on occupied ${st}`);
  }
}
console.log("✅ star placement avoids occupied spaces");

// 왼쪽길(31~34)·안쪽길(35~38)은 39에서 합류, 39 다음은 출발을 지나 1
assert.equal(nextSpace(34), 39);
assert.equal(nextSpace(38), 39);
assert.equal(nextSpace(39), 1);
console.log("✅ 39 merge ok");

// 워프 파이프: 지금 칸을 뺀 아무 칸으로 (다른 팀이 없는 칸도 포함)
{
  const dests = new Set<number>();
  for (let k = 0; k < 60; k++) {
    let t = replay([
      { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS }, seed: 9 } },
    ] as GameEvent[]);
    let sq = 2;
    const e = (type: string, payload: object) => (t = applyEvent(t, { id: sq, seq: sq++, voided: false, type, payload } as GameEvent));
    e("override", { action: "position", teamId: "A", pos: 12 });
    e("override", { action: "addItem", teamId: "A", item: "warpPipe" });
    e("use_item", { item: "warpPipe", seed: 1000 + k });
    assert.notEqual(t.teams.A.pos, 12);
    assert.ok(SPACE_BY_ID[t.teams.A.pos]);
    assert.ok(!t.teams.A.items.includes("warpPipe"));
    dests.add(t.teams.A.pos);
  }
  assert.ok(dests.size > 10, `warp destinations too few: ${dests.size}`);
  console.log("✅ warp pipe goes to any other space:", dests.size, "different spaces");
}
