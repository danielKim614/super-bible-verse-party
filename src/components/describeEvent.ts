import { ITEMS } from "@/game/items";
import type { GameEvent, TeamInfo } from "@/game/types";

export function describeEvent(e: GameEvent, teamById: Record<string, TeamInfo>): string {
  const tn = (id?: string) => (id ? teamById[id]?.name ?? "?" : "");
  switch (e.type) {
    case "start_game":
      return `게임 시작 (${e.payload.teamIds.length}팀)`;
    case "use_item":
      return `아이템 사용: ${ITEMS[e.payload.item]?.name ?? e.payload.item}${e.payload.face ? ` (${e.payload.face} 고정)` : ""}`;
    case "roll":
      return `주사위 ${e.payload.value}`;
    case "pipe_exit":
      return `황금 파이프 → ${e.payload.to}절`;
    case "choose_path":
      return `갈림길: ${e.payload.label ?? `${e.payload.option + 1}번 길`}`;
    case "star_decision":
      return e.payload.buy ? `스타 구매 시도${e.payload.coupon ? " (할인권)" : ""}` : "스타 구매 안 함";
    case "recite_result":
      return `암송 ${e.payload.success ? "성공" : "실패"}`;
    case "shop_buy":
      return `상점 구매: ${ITEMS[e.payload.item]?.name}`;
    case "shop_leave":
      return "상점 나감";
    case "end_turn":
      return "다음 팀으로";
    case "pause":
      return e.payload.paused ? "일시정지" : "재개";
    case "ceremony_next":
      return "시상식 다음 공개";
    case "override": {
      const p = e.payload;
      switch (p.action) {
        case "talents":
          return `[수동] ${tn(p.teamId)} 달란트 ${p.delta > 0 ? "+" : ""}${p.delta}`;
        case "stars":
          return `[수동] ${tn(p.teamId)} 스타 ${p.delta > 0 ? "+" : ""}${p.delta}`;
        case "addItem":
          return `[수동] ${tn(p.teamId)} 아이템 추가: ${ITEMS[p.item]?.name}`;
        case "removeItem":
          return `[수동] ${tn(p.teamId)} 아이템 삭제: ${ITEMS[p.item]?.name}`;
        case "position":
          return `[수동] ${tn(p.teamId)} 위치 → ${p.pos === 0 ? "출발" : `${p.pos}절`}`;
        case "starPositions":
          return `[수동] 스타 위치 → ${p.stars.join(", ")}`;
        case "totalTurns":
          return `[수동] 총 턴 수 → ${p.value}`;
        case "boost":
          return `[수동] 2배 구간 → ${p.on === null ? "자동" : p.on ? "켜기" : "끄기"}`;
        case "skipTurn":
          return "[수동] 현재 팀 건너뛰기";
        case "setCurrent":
          return `[수동] ${p.turn}턴 ${p.teamIndex + 1}번째 팀으로 이동`;
        case "forceRecite":
          return "[수동] 현재 칸에서 다시 암송";
        case "endGame":
          return "[수동] 게임 종료";
      }
    }
  }
  return (e as GameEvent).type;
}
