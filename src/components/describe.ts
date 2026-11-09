import { EVENT_MODE_LABEL, RED_MODE_LABEL, SPACE_BY_ID, SPACE_LABEL } from "@/game/board";
import { currentTeamId, effectiveType, starPriceFor } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";
import { blanked, firstWord, verseText, type VerseMap } from "@/game/verses";

export function teamName(teamById: Record<string, TeamInfo>, id?: string) {
  if (!id) return "";
  return teamById[id]?.name ?? "알 수 없는 팀";
}

export function teamColor(teamById: Record<string, TeamInfo>, id?: string) {
  return (id && teamById[id]?.color) || "#888";
}

export interface VerseCardInfo {
  ref: string;
  space: number;
  typeLabel: string;
  type: string;
  modeLabel: string;
  prompt: string | null; // 화면에 보여줄 힌트(빈칸/첫 단어)
  fullText: string; // 어드민 판정용 전체 본문
}

export function verseCard(s: GameState, space: number, verses: VerseMap): VerseCardInfo {
  const sp = SPACE_BY_ID[space];
  const eff = effectiveType(s, space);
  let modeLabel = "장절을 보고 그대로 암송";
  let prompt: string | null = null;
  let ref = `로마서 8:${space}`;
  if (eff === "red" && sp.redMode) {
    modeLabel = RED_MODE_LABEL[sp.redMode];
    if (sp.redMode === "blank") prompt = blanked(verses, space) || null;
    if (sp.redMode === "firstWord") prompt = firstWord(verses, space) ? `${firstWord(verses, space)} …` : null;
  }
  if (eff === "event" && sp.eventMode) {
    modeLabel = EVENT_MODE_LABEL[sp.eventMode];
    if (sp.eventMode === "threeVerses") {
      const a = Math.max(1, space - 1);
      const b = Math.min(39, space + 1);
      ref = `로마서 8:${a}~${b}`;
    }
  }
  let fullText = verseText(verses, space);
  if (eff === "event" && sp.eventMode === "threeVerses") {
    fullText = [space - 1, space, space + 1]
      .filter((v) => v >= 1 && v <= 39)
      .map((v) => `${v} ${verseText(verses, v)}`)
      .join("\n");
  }
  const typeLabel = sp.type === "red" && eff === "blue" ? "빨간 칸 (방패 → 파란 칸 규칙)" : SPACE_LABEL[sp.type];
  return { ref, space, typeLabel, type: sp.type, modeLabel, prompt, fullText };
}

/** 지금 무엇을 해야 하는지 한 줄 설명 */
export function phaseHeadline(s: GameState, teamById: Record<string, TeamInfo>): string {
  const tid = currentTeamId(s);
  const name = teamName(teamById, tid);
  const ctx = s.ctx;
  switch (s.phase) {
    case "setup":
      return "게임 준비 중";
    case "pre_roll":
      if (ctx.rollMode === "double") return `${name} — 주사위 2개를 굴려 주세요`;
      if (ctx.rollMode === "low") return `${name} — 선택 다이스(낮음 1~3)를 굴려 주세요`;
      if (ctx.rollMode === "high") return `${name} — 선택 다이스(높음 4~6)를 굴려 주세요`;
      return `${name} — 주사위를 굴려 주세요`;
    case "choose_path":
      return `${name} — 갈림길! 어느 길로?`;
    case "shop_offer":
      return `${name} — 🏪 출발점 상점! 아이템을 살까요?`;
    case "star_offer": {
      const team = tid ? s.teams[tid] : undefined;
      const coupon = team?.items.includes("starCoupon");
      const price = starPriceFor(s, false);
      return `${name} — ⭐ 스타를 살까요? (${price}달란트${coupon ? `, 할인권 ${starPriceFor(s, true)}` : ""})`;
    }
    case "star_recite":
      return `${name} — 스타를 사려면 8:${ctx.starAt}절을 암송하세요`;
    case "recite":
      return `${name} — 8:${ctx.landed}절 암송!`;
    case "resolve":
      if (ctx.reciteResult) return `${name} — 암송 성공!`;
      return `${name} — 아쉽지만 실패`;
    case "ended":
      return "게임 종료! 시상식";
  }
}
