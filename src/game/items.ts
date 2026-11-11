export type ItemId =
  | "tripleDice"
  | "selectDice"
  | "warpPipe"
  | "goldenPipe"
  | "doubleTalent"
  | "hint"
  | "starCoupon";

export type ItemKind = "move" | "recite" | "purchase";

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  price: number;
  desc: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  tripleDice: { id: "tripleDice", name: "트리플 다이스", kind: "move", price: 5, desc: "주사위 3개 합산 (3~18)" },
  selectDice: { id: "selectDice", name: "선택 다이스", kind: "move", price: 5, desc: "두 주사위 중 하나의 눈을 직접 정해요" },
  warpPipe: { id: "warpPipe", name: "워프 파이프", kind: "move", price: 5, desc: "다른 팀 위치로 랜덤 이동" },
  goldenPipe: { id: "goldenPipe", name: "황금 파이프", kind: "move", price: 15, desc: "원하는 칸으로 이동" },
  doubleTalent: { id: "doubleTalent", name: "달란트 2배권", kind: "recite", price: 5, desc: "이번 턴 암송 보상 2배 (굴리기 전 사용)" },
  hint: { id: "hint", name: "힌트권", kind: "recite", price: 2, desc: "막힌 다음 단어 힌트 1회" },
  starCoupon: { id: "starCoupon", name: "스타 할인권", kind: "purchase", price: 5, desc: "스타를 10달란트에 구매" },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const RANDOM_ITEM_POOL: ItemId[] = ["tripleDice", "selectDice", "warpPipe", "doubleTalent", "hint", "starCoupon", "tripleDice", "selectDice", "hint", "goldenPipe"];
