"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * key가 "방금" 바뀌었는지 렌더 중에 바로 알려 준다 (null이면 false).
 * 효과(effect)로 상태를 바꾸면 한 렌더 늦어서, 그 사이 다른 연출이 먼저 시작되는 문제를 막을 때 쓴다.
 */
export function useJustChanged(key: string | null): boolean {
  const seen = useRef(key);
  useEffect(() => {
    seen.current = key;
  }, [key]);
  return key !== null && key !== seen.current;
}

/**
 * key가 화면을 연 뒤 새로 생기면(ready일 때) 정해진 시간 동안 연출 정보를 보여 준다.
 * - 화면을 새로 열었을 때 이미 있던 key는 다시 보여 주지 않는다
 * - 되돌리기 등으로 key가 바뀌면 바로 닫는다
 * - pending: key는 생겼지만 아직 연출이 시작되기 전(이동 중 등)
 */
export function useTimedReveal<T extends { key: string }>(
  key: string | null,
  ready: boolean,
  make: (key: string) => T,
  durationMs: (info: T) => number,
): { active: T | null; pending: boolean } {
  const seen = useRef(key);
  const [active, setActive] = useState<T | null>(null);
  // 최신 make/duration을 효과에서 쓰도록 (렌더마다 바뀌는 함수라 의존성에 넣지 않음)
  const fns = useRef({ make, durationMs });
  useLayoutEffect(() => {
    fns.current = { make, durationMs };
  });
  useEffect(() => {
    if (!key || !ready || seen.current === key) return;
    seen.current = key;
    const info = fns.current.make(key);
    setActive(info);
    const t = setTimeout(() => setActive((a) => (a?.key === key ? null : a)), fns.current.durationMs(info));
    return () => clearTimeout(t);
  }, [key, ready]);
  useEffect(() => {
    if (active && active.key !== key) setActive(null);
  }, [active, key]);
  return { active, pending: !active && !!key && seen.current !== key };
}
