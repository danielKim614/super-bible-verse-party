export type ItemId =
  | "doubleDice"
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
  doubleDice: { id: "doubleDice", name: "더블 다이스", kind: "move", price: 5, icon: "🎲🎲", desc: "주사위 2개를 굴려 합산 (2~12)" },
  selectDice: { id: "selectDice", name: "선택 다이스", kind: "move", price: 5, icon: "🎯", desc: "낮음(1~3) 또는 높음(4~6)을 골라 굴림" },
  warpPipe: { id: "warpPipe", name: "워프 파이프", kind: "move", price: 5, icon: "🌀", desc: "랜덤한 다른 팀 위치로 이동" },
  goldenPipe: { id: "goldenPipe", name: "황금 파이프", kind: "move", price: 15, icon: "⭐", desc: "가장 가까운 스타 칸으로 바로 이동" },
  shield: { id: "shield", name: "방패", kind: "recite", price: 5, icon: "🛡️", desc: "빨간 칸을 파란 칸 규칙으로 암송" },
  doubleTalent: { id: "doubleTalent", name: "달란트 2배권", kind: "recite", price: 8, icon: "✖️2", desc: "이번 암송 성공 보상 2배" },
  hint: { id: "hint", name: "힌트권", kind: "recite", price: 5, icon: "💡", desc: "막힌 지점의 다음 단어 1회" },
  starCoupon: { id: "starCoupon", name: "스타 할인권", kind: "purchase", price: 10, icon: "🎟️", desc: "스타를 10달란트에 구매" },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const RANDOM_ITEM_POOL: ItemId[] = ["doubleDice", "selectDice", "warpPipe", "shield", "doubleTalent", "hint", "starCoupon", "doubleDice", "shield", "hint", "goldenPipe"];
