"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { replay } from "@/game/reducer";
import type { GameEvent, GameEventBody, GameState, MemberInfo, TeamInfo } from "@/game/types";
import { getBackend, type Backend, type TeamInput } from "./backend";
import type { VerseMap } from "@/game/verses";

export interface GameData {
  backend: Backend | null;
  events: GameEvent[];
  teams: TeamInfo[];
  members: MemberInfo[];
  verses: VerseMap;
  state: GameState;
  teamById: Record<string, TeamInfo>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGame(): GameData {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [verses, setVerses] = useState<VerseMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (b: Backend) => {
    try {
      const snap = await b.load();
      setEvents(snap.events);
      setTeams(snap.teams);
      setMembers(snap.members);
      setVerses(snap.verses);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const b = getBackend();
    setBackend(b);
    load(b);
    const unsub = b.subscribe(() => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => load(b), 60);
    });
    return () => {
      unsub();
      if (pending.current) clearTimeout(pending.current);
    };
  }, [load]);

  const state = useMemo(() => replay(events), [events]);
  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const refresh = useCallback(() => {
    if (backend) load(backend);
  }, [backend, load]);

  return { backend, events, teams, members, verses, state, teamById, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// 어드민 동작
// ---------------------------------------------------------------------------
const PASS_KEY = "sbvp:adminPass";

export function useAdmin(game: GameData) {
  const [pass, setPass] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPass(sessionStorage.getItem(PASS_KEY));
  }, []);

  const login = useCallback(
    async (p: string) => {
      if (!game.backend) return false;
      const ok = await game.backend.verifyAdmin(p);
      if (ok) {
        sessionStorage.setItem(PASS_KEY, p);
        setPass(p);
      }
      return ok;
    },
    [game.backend],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(PASS_KEY);
    setPass(null);
  }, []);

  const run = useCallback(
    async (fn: (b: Backend, p: string) => Promise<unknown>) => {
      if (!game.backend || !pass) return;
      setBusy(true);
      setError(null);
      try {
        await fn(game.backend, pass);
        game.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        game.refresh();
      } finally {
        setBusy(false);
      }
    },
    [game, pass],
  );

  const nextSeq = Math.max(0, ...game.events.map((e) => e.seq)) + 1;

  const send = useCallback(
    (body: GameEventBody) => run((b, p) => b.appendEvent(p, body, nextSeq)),
    [run, nextSeq],
  );

  const active = game.events.filter((e) => !e.voided).sort((a, b) => a.seq - b.seq);
  const lastActive = active[active.length - 1];
  const redoable = game.events
    .filter((e) => e.voided && (!lastActive || e.seq > lastActive.seq))
    .sort((a, b) => a.seq - b.seq)[0];

  const undo = useCallback(() => {
    if (lastActive) return run((b, p) => b.setVoided(p, lastActive.id, true));
  }, [run, lastActive]);
  const redo = useCallback(() => {
    if (redoable) return run((b, p) => b.setVoided(p, redoable.id, false));
  }, [run, redoable]);

  return {
    pass,
    login,
    logout,
    busy,
    error,
    clearError: () => setError(null),
    send,
    undo,
    redo,
    lastActive,
    redoable,
    resetGame: () => run((b, p) => b.resetGame(p)),
    upsertTeam: (t: TeamInput) => run((b, p) => b.upsertTeam(p, t)),
    deleteTeam: (id: string) => run((b, p) => b.deleteTeam(p, id)),
    deleteMember: (id: string) => run((b, p) => b.deleteMember(p, id)),
    upsertVerses: (v: VerseMap) => run((b, p) => b.upsertVerses(p, v)),
  };
}
