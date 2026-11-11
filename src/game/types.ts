import type { ItemId } from "./items";
import type { SpaceType } from "./board";

export interface Settings {
  totalTurns: number;
  startTalents: number;
  starPrice: number;
  couponStarPrice: number;
  starCount: number;
  diceCount: number; // 기본 주사위 개수
  finalBoostTurns: number; // 마지막 N턴 달란트 2배
  rewards: Record<SpaceType, number>;
  inventoryLimit: number;
  shopMoveAfter: number; // 상점에 이만큼 팀이 다녀가면 다른 칸으로 날아감 (0이면 고정)
  itemRefund: number; // 종료 시 남은 아이템 1개당 환급
  bonusStars: { recite: boolean; talent: boolean; challenge: boolean };
}

export const DEFAULT_SETTINGS: Settings = {
  totalTurns: 8,
  startTalents: 10,
  starPrice: 20,
  couponStarPrice: 10,
  starCount: 2,
  diceCount: 2,
  finalBoostTurns: 3,
  rewards: { blue: 3, red: 5, event: 6, item: 3, happening: 3, bless: 3 },
  inventoryLimit: 3,
  shopMoveAfter: 3,
  itemRefund: 1,
  bonusStars: { recite: true, talent: true, challenge: true },
};

/** 팀 표시 정보(이름·색·이미지)는 DB teams 테이블에서 옵니다. */
export interface TeamInfo {
  id: string;
  slot: number;
  name: string;
  color: string;
  image_url: string | null;
}

export interface MemberInfo {
  id: string;
  team_id: string;
  nickname: string;
  created_at?: string;
}

// ---------------- 이벤트 ----------------
export type OverrideAction =
  | { action: "talents"; teamId: string; delta: number; note?: string }
  | { action: "stars"; teamId: string; delta: number; note?: string }
  | { action: "addItem"; teamId: string; item: ItemId }
  | { action: "removeItem"; teamId: string; item: ItemId }
  | { action: "position"; teamId: string; pos: number }
  | { action: "starPositions"; stars: number[] }
  | { action: "totalTurns"; value: number }
  | { action: "boost"; on: boolean | null }
  | { action: "skipTurn" }
  | { action: "setCurrent"; turn: number; teamIndex: number }
  | { action: "forceRecite" }
  | { action: "endGame" };

export type GameEventBody =
  | { type: "start_game"; payload: { teamIds: string[]; settings: Settings; seed: number } }
  | { type: "use_item"; payload: { item: ItemId; face?: number; seed?: number } } // face: 선택 다이스로 고정할 눈
  | { type: "roll"; payload: { value: number; faces?: number[] } } // value: 이동 칸 수(합계), faces: 각 주사위 눈
  | { type: "choose_path"; payload: { option: number; label?: string } }
  | { type: "pipe_exit"; payload: { to: number } } // 황금 파이프: 나올 칸
  | { type: "star_decision"; payload: { buy: boolean; coupon?: boolean; seed?: number } }
  | { type: "recite_result"; payload: { success: boolean; seed: number } }
  | { type: "shop_buy"; payload: { item: ItemId } }
  | { type: "shop_leave"; payload: Record<string, never> }
  | { type: "end_turn"; payload: Record<string, never> }
  | { type: "pause"; payload: { paused: boolean } }
  | { type: "ceremony_next"; payload: Record<string, never> }
  | { type: "override"; payload: OverrideAction & { seed?: number } };

export type GameEventType = GameEventBody["type"];

export type GameEvent = GameEventBody & {
  id: number; // DB id
  seq: number;
  voided: boolean;
  created_at?: string;
};

// ---------------- 상태 ----------------
export type Phase =
  | "setup"
  | "pre_roll"
  | "choose_path"
  | "pipe_choose" // 황금 파이프에 들어가 나올 칸을 고르는 중
  | "shop_offer"
  | "star_offer"
  | "star_recite"
  | "recite"
  | "resolve"
  | "ended";

export interface TeamState {
  id: string;
  pos: number; // 0 = T
  talents: number;
  stars: number;
  bonusStars: number;
  items: ItemId[];
  reciteSuccess: number;
  challengeSuccess: number;
  laps: number;
  recited: number[];
}

export type HappeningKind = "stars" | "rain" | "golden" | "gift";

export interface TurnCtx {
  startSeq?: number; // 이 팀 턴이 시작된 이벤트 seq
  moveItem?: ItemId;
  reciteItem?: ItemId;
  rollMode: "normal" | "triple" | "fixed";
  fixedFace?: number; // 선택 다이스로 고정한 눈
  roll?: number;
  faces?: number[]; // 실제 나온 주사위 눈 (연출용)
  remaining: number;
  forkChoice?: number;
  path: number[]; // 이번 턴에 지나간 칸 (애니메이션용)
  teleport?: boolean;
  shopVisited?: boolean; // 이번 턴 상점(출발점) 통과 처리됨
  starAt?: number; // 스타 제안 중인 칸
  starLanding?: boolean; // 도착 칸 스타 (구매 의사를 먼저 묻고 암송)
  couponUsed?: boolean;
  doubleTalentOn?: boolean;
  hintUsed?: boolean;
  landed?: number;
  happening?: { kind: HappeningKind; text: string };
  blessTo?: string[]; // 축복 받은 팀들 (공동 꼴찌면 여럿)
  reciteResult?: boolean;
  payout?: number;
  gainedItem?: ItemId | "full";
  starBought?: boolean;
  starBoughtAt?: number; // 스타를 산 칸 (연출용)
  starReciteResult?: boolean;
}

export interface LedgerEntry {
  seq: number;
  teamId: string;
  delta: number;
  balance: number;
  reason: string;
  manual?: boolean;
}

export interface FeedEntry {
  seq: number;
  teamId?: string;
  kind: "payout" | "star" | "item" | "fail" | "info" | "boost" | "cost" | "happening" | "bless";
  text: string;
  amount?: number;
}

export interface Award {
  key: "recite" | "talent" | "challenge";
  title: string;
  desc: string;
  values: Record<string, number>;
  winners: string[];
}

export interface Ceremony {
  step: number; // 0: 환급 공개, 1..n: 보너스 스타 공개, n+1: 최종 순위
  refunds: Record<string, number>;
  awards: Award[];
}

export interface GameState {
  started: boolean;
  phase: Phase;
  settings: Settings;
  teamIds: string[];
  teams: Record<string, TeamState>;
  turn: number; // 1-based 라운드
  teamIndex: number;
  stars: number[];
  ctx: TurnCtx;
  paused: boolean;
  boostOverride: boolean | null;
  goldenRound: number | null; // 해프닝 "황금 라운드"가 적용되는 턴
  ledger: LedgerEntry[];
  feed: FeedEntry[];
  ceremony: Ceremony | null;
  lastSeq: number;
  moveSeq: number; // 마지막으로 말이 움직인 이벤트 seq
  shopAt: number; // 상점이 있는 칸 (이 칸으로 들어갈 때 열림)
  shopVisits: number; // 지금 위치에서 상점을 지나간 팀 수
}
