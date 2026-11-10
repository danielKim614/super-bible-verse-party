// 로마서 8장 본문은 DB(verses 테이블)에 저장되며, 어드민 "본문" 탭에서 입력합니다.
// 여기에는 본문을 다루는 도우미만 둡니다.

export type VerseMap = Record<number, string>;

export function verseText(verses: VerseMap, v: number): string {
  return verses[v]?.trim() ?? "";
}

export function firstWord(verses: VerseMap, v: number): string {
  return verseText(verses, v).split(/\s+/)[0] ?? "";
}

/**
 * 빈칸 채우기: 어절의 약 40%를 가림 (최소 3개). 결정적.
 * 첫 어절은 남기고, 긴 어절을 우선 가리되 한쪽에 몰리지 않게 앞·뒤 절반에서 고르게 고른다.
 */
export function blanked(verses: VerseMap, v: number): string {
  const words = verseText(verses, v).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const count = Math.min(words.length - 1, Math.max(3, Math.round(words.length * 0.4)));
  const cands = words.map((w, i) => ({ i, len: w.replace(/[^\p{L}\p{N}]/gu, "").length })).filter((x) => x.i > 0);
  const byLen = (arr: typeof cands) => [...arr].sort((a, b) => b.len - a.len || a.i - b.i);
  const mid = Math.ceil(words.length / 2);
  const front = byLen(cands.filter((x) => x.i < mid));
  const back = byLen(cands.filter((x) => x.i >= mid));
  const picked: number[] = [];
  while (picked.length < count && (front.length || back.length)) {
    const from = (picked.length % 2 === 0 ? front : back).length ? (picked.length % 2 === 0 ? front : back) : front.length ? front : back;
    picked.push(from.shift()!.i);
  }
  const idx = picked;
  return words.map((w, i) => (idx.includes(i) ? "＿".repeat(Math.max(2, Math.min(5, w.length))) : w)).join(" ");
}

/**
 * 붙여넣은 본문을 절별로 파싱.
 * "12   그러므로 ..." 처럼 줄 앞에 절 번호가 오는 형식. 각주 번호("1)")와 소제목 줄은 제거.
 */
export function parseVerses(raw: string): VerseMap {
  const out: VerseMap = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.trim().match(/^(\d{1,2})[.:]?\s+(.*)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 1 || n > 39) continue;
    const text = m[2]
      .replace(/\d+\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out[n] = text;
  }
  return out;
}

export function countVerses(verses: VerseMap): number {
  let n = 0;
  for (let v = 1; v <= 39; v++) if (verses[v]?.trim()) n++;
  return n;
}
