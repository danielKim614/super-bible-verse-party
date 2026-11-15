// 🎲 이벤트 칸 뽑기
import assert from "node:assert/strict";
import { applyEvent, isBoost, replay } from "../../src/game/reducer";
import { DEFAULT_SETTINGS, type GameEvent } from "../../src/game/types";

// 이벤트 칸(🎲): 도착하면 1~3개 연속 절을 뽑고, 성공하면 +event, 뽑힌 절이 외운 절로 기록
{
  const counts = new Set<number>();
  for (let k = 0; k < 30; k++) {
    let t = replay([
      { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: 3, v: 2 } },
    ] as GameEvent[]);
    let sq = 2 + k * 10;
    const e = (type: string, payload: object) => (t = applyEvent(t, { id: sq, seq: sq++, voided: false, type, payload } as GameEvent));
    e("override", { action: "starPositions", stars: [5, 30] });
    e("override", { action: "position", teamId: "A", pos: 12 });
    e("roll", { value: 1, faces: [1] });
    assert.equal(t.teams.A.pos, 101);
    assert.equal(t.phase, "recite");
    const vs = t.ctx.eventVerses!;
    assert.ok(vs.length >= 1 && vs.length <= 3);
    vs.forEach((v, i) => assert.equal(v, vs[0] + i));
    assert.ok(vs[0] >= 1 && vs[vs.length - 1] <= 39);
    counts.add(vs.length);
    const before = t.teams.A.talents;
    e("recite_result", { success: true, seed: 1 });
    assert.equal(t.teams.A.talents, before + t.settings.rewards.event * (isBoost(t) ? 2 : 1));
    for (const v of vs) assert.ok(t.teams.A.recited.includes(v));
  }
  assert.equal(counts.size, 3);
  console.log("✅ event space draws 1~3 consecutive verses");
}

// 이벤트 칸: 아직 아무도 안 외운 절이 더 잘 나온다
{
  let hit = 0;
  const N = 200;
  for (let k = 0; k < N; k++) {
    let t = replay([
      { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: 3, v: 2 } },
    ] as GameEvent[]);
    // 1~29절은 이미 외움, 30~39절은 아직
    t.teams.B.recited = Array.from({ length: 29 }, (_, i) => i + 1);
    let sq = 2 + k * 10;
    const e = (type: string, payload: object) => (t = applyEvent(t, { id: sq, seq: sq++, voided: false, type, payload } as GameEvent));
    e("override", { action: "starPositions", stars: [5, 30] });
    e("override", { action: "position", teamId: "A", pos: 12 });
    e("roll", { value: 1, faces: [1] });
    if (t.ctx.eventVerses!.some((v) => v >= 30)) hit++;
  }
  // 균등하면 약 30%, 가중치 덕분에 훨씬 자주
  assert.ok(hit / N > 0.5, `unrecited verses not favored enough: ${hit}/${N}`);
  console.log("✅ event draw favors unrecited verses:", hit, "/", N);
}
