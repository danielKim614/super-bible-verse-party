"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 브라우저 기본 confirm() 대신 쓰는 화면 안 확인 창.
 * (크롬에서 "이 페이지의 추가 대화상자 차단"을 누르면 confirm()이 묻지도 않고 '취소'가 되어 버튼이 안 눌리는 것처럼 보임)
 */
type Request = { id: number; message: string; okLabel: string; danger: boolean; resolve: (ok: boolean) => void };

let listener: ((r: Request) => void) | null = null;
let nextId = 1;

export function askConfirm(message: string, opts: { okLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const req: Request = { id: nextId++, message, okLabel: opts.okLabel ?? "확인", danger: !!opts.danger, resolve };
    if (listener) listener(req);
    else resolve(window.confirm(message));
  });
}

/** 앱 맨 바깥(layout)에 한 번 둔다 */
export function ConfirmHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    listener = (r) => setQueue((q) => [...q, r]);
    return () => {
      listener = null;
    };
  }, []);
  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id]);
  if (!cur) return null;
  function answer(ok: boolean) {
    cur!.resolve(ok);
    setQueue((q) => q.slice(1));
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5" role="dialog" aria-modal="true" onClick={() => answer(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white text-slate-800 shadow-2xl p-5 animate-pop" onClick={(e) => e.stopPropagation()}>
        <p className="whitespace-pre-line text-base leading-relaxed">{cur.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200" onClick={() => answer(false)}>
            취소
          </button>
          <button
            ref={okRef}
            type="button"
            className={`rounded-xl px-5 py-2 font-bold text-white ${cur.danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-700"}`}
            onClick={() => answer(true)}
          >
            {cur.okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
