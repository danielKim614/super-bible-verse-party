/* eslint-disable @next/next/no-img-element */
import type { TeamInfo } from "@/game/types";

export function TeamAvatar({ team, size = 40 }: { team?: TeamInfo; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border-[3px] border-white shadow"
      style={{ width: size, height: size, background: team?.color ?? "#999" }}
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
