export type ItemId =
  | "tripleDice"
  | "selectDice"
  | "warpPipe"
  | "goldenPipe"
  | "shield"
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
  icon: string; // 화면용 짧은 기호
}

export const ITEMS: Record<ItemId, ItemDef> = {
  tripleDice: { id: "tripleDice", name: "트리플 다이스", kind: "move", price: 5, icon: "🎲🎲🎲", desc: "주사위 3개 합산 (3~18)" },
  selectDice: { id: "selectDice", name: "선택 다이스", kind: "move", price: 5, icon: "🎯", desc: "모든 눈을 낮음(1~3)·높음(4~6)으로" },
  warpPipe: { id: "warpPipe", name: "워프 파이프", kind: "move", price: 5, icon: "🌀", desc: "다른 팀 위치로 랜덤 이동" },
  goldenPipe: { id: "goldenPipe", name: "황금 파이프", kind: "move", price: 15, icon: "⭐", desc: "가장 가까운 스타로 이동" },
  shield: { id: "shield", name: "방패", kind: "recite", price: 2, icon: "🛡️", desc: "어려운 칸을 빈칸 채우기로" },
  doubleTalent: { id: "doubleTalent", name: "달란트 2배권", kind: "recite", price: 5, icon: "✖️2", desc: "이번 암송 보상 2배" },
  hint: { id: "hint", name: "힌트권", kind: "recite", price: 2, icon: "💡", desc: "막힌 다음 단어 힌트 1회" },
  starCoupon: { id: "starCoupon", name: "스타 할인권", kind: "purchase", price: 5, icon: "🎟️", desc: "스타를 10달란트에 구매" },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const RANDOM_ITEM_POOL: ItemId[] = ["tripleDice", "selectDice", "warpPipe", "shield", "doubleTalent", "hint", "starCoupon", "tripleDice", "shield", "hint", "goldenPipe"];
