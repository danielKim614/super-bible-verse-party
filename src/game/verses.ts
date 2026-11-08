// 로마서 8장 본문 (새번역)
// ⚠️ 저작권상 본문은 운영자가 직접 입력합니다. 각 절의 빈 문자열을 본문으로 채워 주세요.
//    본문이 비어 있어도 게임은 동작하며, 화면에는 장절과 암송 방식만 표시됩니다.
export const VERSES: Record<number, string> = {
  1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "",
  11: "", 12: "", 13: "", 14: "", 15: "", 16: "", 17: "", 18: "", 19: "", 20: "",
  21: "", 22: "", 23: "", 24: "", 25: "", 26: "", 27: "", 28: "", 29: "", 30: "",
  31: "", 32: "", 33: "", 34: "", 35: "", 36: "", 37: "", 38: "", 39: "",
};

export function verseText(v: number): string {
  return VERSES[v]?.trim() ?? "";
}

export function firstWord(v: number): string {
  return verseText(v).split(/\s+/)[0] ?? "";
}

/** 빈칸 채우기: 가장 긴 어절 2~3개를 가림 (결정적) */
export function blanked(v: number): string {
  const words = verseText(v).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const count = words.length >= 12 ? 3 : 2;
  const idx = words
    .map((w, i) => ({ i, len: w.replace(/[^\p{L}\p{N}]/gu, "").length }))
    .filter((x) => x.i > 0)
    .sort((a, b) => b.len - a.len || a.i - b.i)
    .slice(0, count)
    .map((x) => x.i);
  return words.map((w, i) => (idx.includes(i) ? "＿".repeat(Math.max(2, Math.min(5, w.length))) : w)).join(" ");
}
