/* eslint-disable @next/next/no-img-element */
import type { TeamInfo } from "@/game/types";

/** 팀 표시. 보드의 말과 같은 둥근 네모 모양(칸은 동그라미)이라 팀과 칸이 헷갈리지 않는다 */
export function TeamAvatar({ team, size = 40 }: { team?: TeamInfo; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center overflow-hidden shrink-0 border-[3px] border-white shadow"
      style={{ width: size, height: size, background: team?.color ?? "#999", borderRadius: size * 0.3 }}
    >
      {team?.image_url ? (
        <img src={team.image_url} alt={team.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-white" style={{ fontSize: size * 0.45 }}>
          {(team?.name ?? "?").slice(0, 1)}
        </span>
      )}
    </span>
  );
}
