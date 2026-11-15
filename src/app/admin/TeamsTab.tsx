"use client";

/** 팀·참가자 탭 */
import { askConfirm } from "@/components/ConfirmDialog";
import { useState } from "react";
import { TeamAvatar } from "@/components/TeamAvatar";
import { type TeamInfo } from "@/game/types";
import { type GameData } from "@/lib/useGame";
import { type Admin, btn } from "./ui";

// ---------------------------------------------------------------------------
// 팀·참가자
// ---------------------------------------------------------------------------
export const PALETTE = ["#e5484d", "#f76b15", "#ffc53d", "#30a46c", "#0090ff", "#8e4ec6", "#d6409f", "#12a594"];

export function TeamsTab({ game, admin }: { game: GameData; admin: Admin }) {
  const [draft, setDraft] = useState<Partial<TeamInfo> | null>(null);
  const teams = game.teams;
  return (
    <div className="flex flex-col gap-4">
      {game.state.started && <div className="rounded-xl bg-amber-50 p-2 text-sm text-amber-800">게임 중에는 이름·이미지만 바꾸세요. 팀 추가/삭제는 진행 중인 게임에 반영되지 않습니다.</div>}
      <ul className="flex flex-col gap-2">
        {teams.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl border px-3 py-2">
            <span className="w-6 text-center text-slate-400">{t.slot}</span>
            <TeamAvatar team={t} size={44} />
            <span className="font-display text-xl" style={{ color: t.color }}>
              {t.name}
            </span>
            <span className="flex flex-wrap gap-1 text-sm">
              {game.members
                .filter((m) => m.team_id === t.id)
                .map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2">
                    {m.nickname}
                    <button className="text-red-500" onClick={() => void askConfirm(`${m.nickname} 님을 삭제할까요?`, { okLabel: "삭제", danger: true }).then((ok) => { if (ok) void (admin.deleteMember(m.id)); })}>
                      ×
                    </button>
                  </span>
                ))}
            </span>
            <span className="ml-auto flex gap-3 text-sm whitespace-nowrap">
              <button className="underline" onClick={() => setDraft(t)}>
                수정
              </button>
              <button className="underline text-red-600" onClick={() => void askConfirm(`${t.name} 팀을 삭제할까요?`, { okLabel: "삭제", danger: true }).then((ok) => { if (ok) void (admin.deleteTeam(t.id)); })}>
                삭제
              </button>
            </span>
          </li>
        ))}
      </ul>
      {!draft && (
        <button className={`${btn} bg-slate-900 text-white self-start`} onClick={() => setDraft({ slot: teams.length + 1, name: "", color: PALETTE[teams.length % PALETTE.length], image_url: "" })}>
          + 팀 추가
        </button>
      )}
      {draft && (
        <TeamForm
          draft={draft}
          onCancel={() => setDraft(null)}
          onSave={async (t) => {
            await admin.upsertTeam(t);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}

/** 이미지 파일을 정사각형 160px 데이터 URL로 축소 */
export function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const g = c.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    img.src = url;
  });
}

export function TeamForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<TeamInfo>;
  onCancel: () => void;
  onSave: (t: { id?: string; slot: number; name: string; color: string; image_url: string | null }) => void;
}) {
  const [v, setV] = useState(draft);
  const [err, setErr] = useState<string | null>(null);
  const preview: TeamInfo = { id: "", slot: v.slot ?? 1, name: v.name || "?", color: v.color ?? "#888", image_url: v.image_url || null };
  return (
    <form
      className="rounded-2xl border-2 p-4 flex flex-wrap items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.name?.trim()) return setErr("팀 이름을 입력하세요");
        onSave({ id: v.id, slot: v.slot ?? 1, name: v.name.trim(), color: v.color || "#888", image_url: v.image_url?.trim() || null });
      }}
    >
      <label className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-500">
        <TeamAvatar team={preview} size={72} />
        말 이미지
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              setV({ ...v, image_url: await fileToAvatar(f) });
              setErr(null);
            } catch (e2) {
              setErr(e2 instanceof Error ? e2.message : String(e2));
            }
          }}
        />
      </label>
      <label className="flex flex-col text-sm flex-1 min-w-[160px]">
        팀 이름
        <input
          autoFocus
          value={v.name ?? ""}
          onChange={(e) => {
            setV({ ...v, name: e.target.value });
            setErr(null);
          }}
          className="rounded-lg border px-3 py-2 text-lg"
        />
      </label>
      <label className="flex flex-col text-sm">
        색
        <input type="color" value={v.color ?? "#888888"} onChange={(e) => setV({ ...v, color: e.target.value })} className="w-12 h-10 rounded-lg border" />
      </label>
      <label className="flex flex-col text-sm">
        순서
        <input type="number" min={1} value={v.slot ?? 1} onChange={(e) => setV({ ...v, slot: Number(e.target.value) })} className="w-16 rounded-lg border px-2 py-2" />
      </label>
      <div className="flex gap-2">
        <button className={`${btn} bg-slate-900 text-white`}>저장</button>
        <button type="button" className={`${btn} bg-slate-200`} onClick={onCancel}>
          취소
        </button>
      </div>
      {err && <p className="text-sm text-red-600 w-full">{err}</p>}
    </form>
  );
}
