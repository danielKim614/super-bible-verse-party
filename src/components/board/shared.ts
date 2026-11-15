
/** 보드 그림·연출이 함께 쓰는 값과 좌표 도우미 */
import { SHOP_AT, SHOP_POS, SPACE_BY_ID, T_POS, type RouteId } from "@/game/board";

// 네온 톤: [채움, 그림자/글로우]
export const TYPE_FILL: Record<string, [string, string]> = {
  blue: ["#4da3ff", "#1d6fe0"],
  red: ["#ff5c7a", "#d1294b"],
  event: ["#3ee07a", "#17a84f"],
  item: ["#c084fc", "#8b3fe0"],
  happening: ["#2dd4bf", "#0d9488"],
  bless: ["#f472b6", "#be185d"],
};

export const ROUTE_IDS: RouteId[] = ["a1", "a2", "c1", "b1", "b2", "c2", "d1", "d2", "c3"];
// 샛길(갈림길의 안쪽 길)은 주황빛 은하수
export const HARD_ROUTES: RouteId[] = ["a2", "b2", "d2"];

export function posXY(pos: number) {
  if (pos === 0) return T_POS;
  const s = SPACE_BY_ID[pos];
  return s ? { x: s.x, y: s.y } : T_POS;
}

/** 출발 표시: 모든 말이 출발을 떠나면 한 번 반짝이며 사라짐 (Undo 등으로 다시 돌아오면 다시 보임) */
export const START_VANISH_MS = 1000;
export const DICE_MS = 1300;

export const STAR_FX_MS = 2400;

/** 스타 구매 직후 연출: 그 칸 위에서 별이 빠르게 돌며 빛나다 사라짐 */
export const STAR_SPAWN_MS = 2200;
/** 산 별이 사라진 뒤 새 별이 나타나기까지 잠깐 쉬는 시간 (화면은 계속 어둡게) */
export const STAR_GAP_MS = 1000;

export const WARP_MS = { both: 3700, enter: 1950, exit: 2050 };

export const PIPE_TOP = -26; // 칸 중심 기준 파이프 입구 높이
export const PIPE_BOTTOM = 30;

/** 말 꼬리 길이: 꼬리 끝이 말이 서 있는 칸을 가리킨다 */
export const TOKEN_TAIL = 9;

export const PLANET_R = 20;
// 상점선은 칸에서 이만큼 떨어져 떠 있다 (빛줄기 방향)
export const SHOP_DX = SPACE_BY_ID[SHOP_AT].x - SHOP_POS.x;
export const SHOP_DY = SPACE_BY_ID[SHOP_AT].y - SHOP_POS.y;
export const SHOP_FLY_MS = 2600;
/** 날아가기 전에 제자리에서 덜덜 떠는 시간 */
export const SHOP_SHAKE_MS = 1300;

export const SHOP_ALERT_W = 270;
