"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameEvent, GameEventBody, MemberInfo, TeamInfo } from "@/game/types";
import type { VerseMap } from "@/game/verses";

export interface Snapshot {
  events: GameEvent[];
  teams: TeamInfo[];
  members: MemberInfo[];
  verses: VerseMap;
}

export interface TeamInput {
  id?: string;
  slot: number;
  name: string;
  color: string;
  image_url: string | null;
}

export interface Backend {
  mode: "supabase" | "local";
  load(): Promise<Snapshot>;
  /** 이전 스냅샷 기준으로 바뀐 부분만 받아 새 스냅샷을 돌려줌 (변경 없으면 같은 객체) */
  sync(prev: Snapshot): Promise<Snapshot>;
  subscribe(onChange: () => void): () => void;
  verifyAdmin(pass: string): Promise<boolean>;
  appendEvent(pass: string, body: GameEventBody, expectedSeq: number): Promise<void>;
  setVoided(pass: string, eventId: number, voided: boolean): Promise<void>;
  resetGame(pass: string): Promise<void>;
  upsertTeam(pass: string, team: TeamInput): Promise<void>;
  deleteTeam(pass: string, id: string): Promise<void>;
  joinTeam(teamId: string, nickname: string): Promise<MemberInfo>;
  deleteMember(pass: string, id: string): Promise<void>;
  upsertVerses(pass: string, verses: VerseMap): Promise<void>;
}

export const GAME_ID = process.env.NEXT_PUBLIC_GAME_ID || "main";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
class SupabaseBackend implements Backend {
  mode = "supabase" as const;
  private sb: SupabaseClient;
  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });
  }

  async load(): Promise<Snapshot> {
    const [ev, tm, mb, vs] = await Promise.all([
      this.sb.from("events").select("id,seq,type,payload,voided,created_at").eq("game_id", GAME_ID).order("seq"),
      this.sb.from("teams").select("id,slot,name,color,image_url").eq("game_id", GAME_ID).order("slot"),
      this.sb.from("members").select("id,team_id,nickname,created_at").eq("game_id", GAME_ID).order("created_at"),
      this.sb.from("verses").select("verse,text").eq("game_id", GAME_ID),
    ]);
    const err = ev.error || tm.error || mb.error;
    if (err) throw new Error(err.message);
    const verses: VerseMap = {};
    for (const r of (vs.data ?? []) as { verse: number; text: string }[]) verses[r.verse] = r.text;
    return {
      events: (ev.data ?? []) as unknown as GameEvent[],
      teams: (tm.data ?? []) as TeamInfo[],
      members: (mb.data ?? []) as MemberInfo[],
      verses,
    };
  }

  private lastVersion: string | null = null;

  async sync(prev: Snapshot): Promise<Snapshot> {
    const { data, error } = await this.sb.rpc("game_version", { p_game: GAME_ID });
    if (error) {
      // 함수가 아직 없으면(마이그레이션 전) 전체 로드로 대체
      return this.load();
    }
    const v = data as { e: number; v: number; t: string; m: string; s: string };
    const key = JSON.stringify(v);
    if (this.lastVersion === key && this.lastSnap === prev) return prev;
    const maxSeq = Math.max(0, ...prev.events.map((x) => x.seq));
    const voidedCount = prev.events.filter((x) => x.voided).length;
    const prevV = this.lastVersion ? (JSON.parse(this.lastVersion) as typeof v) : null;

    let events = prev.events;
    if (v.e > maxSeq) {
      const { data: rows, error: e2 } = await this.sb
        .from("events")
        .select("id,seq,type,payload,voided,created_at")
        .eq("game_id", GAME_ID)
        .gt("seq", maxSeq)
        .order("seq");
      if (e2) throw new Error(e2.message);
      events = [...events, ...((rows ?? []) as unknown as GameEvent[])];
    } else if (v.e < maxSeq) {
      // 초기화됨
      return this.load();
    }
    if (v.v !== voidedCount || (v.e > maxSeq && v.v !== events.filter((x) => x.voided).length)) {
      const { data: flags, error: e3 } = await this.sb.from("events").select("id,voided").eq("game_id", GAME_ID);
      if (e3) throw new Error(e3.message);
      const map = new Map((flags ?? []).map((f: { id: number; voided: boolean }) => [f.id, f.voided]));
      events = events.map((x) => (map.has(x.id) && map.get(x.id) !== x.voided ? { ...x, voided: map.get(x.id)! } : x));
    }

    let teams = prev.teams;
    if (!prevV || prevV.t !== v.t) {
      const { data: tm, error: e4 } = await this.sb.from("teams").select("id,slot,name,color,image_url").eq("game_id", GAME_ID).order("slot");
      if (e4) throw new Error(e4.message);
      teams = (tm ?? []) as TeamInfo[];
    }
    let members = prev.members;
    if (!prevV || prevV.m !== v.m) {
      const { data: mb, error: e5 } = await this.sb.from("members").select("id,team_id,nickname,created_at").eq("game_id", GAME_ID).order("created_at");
      if (e5) throw new Error(e5.message);
      members = (mb ?? []) as MemberInfo[];
    }
    let verses = prev.verses;
    if (!prevV || prevV.s !== v.s) {
      const { data: vs, error: e6 } = await this.sb.from("verses").select("verse,text").eq("game_id", GAME_ID);
      if (e6) throw new Error(e6.message);
      verses = {};
      for (const r of (vs ?? []) as { verse: number; text: string }[]) verses[r.verse] = r.text;
    }
    this.lastVersion = key;
    const next = { events, teams, members, verses };
    this.lastSnap = next;
    return next;
  }
  private lastSnap: Snapshot | null = null;

  subscribe(onChange: () => void) {
    const ch = this.sb
      .channel(`game-${GAME_ID}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `game_id=eq.${GAME_ID}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${GAME_ID}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `game_id=eq.${GAME_ID}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "verses", filter: `game_id=eq.${GAME_ID}` }, onChange)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onChange();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("realtime:", status);
      });
    // 실시간이 끊기거나 폰이 절전에서 깨어나도 따라잡도록: 주기 폴링 + 화면 복귀 시 새로고침
    const iv = setInterval(onChange, 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onChange);
    window.addEventListener("online", onChange);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onChange);
      window.removeEventListener("online", onChange);
      this.sb.removeChannel(ch);
    };
  }

  private async rpc(fn: string, args: Record<string, unknown>) {
    const { data, error } = await this.sb.rpc(fn, { p_game: GAME_ID, ...args });
    if (error) throw new Error(error.message);
    return data;
  }

  async verifyAdmin(pass: string) {
    return Boolean(await this.rpc("admin_check", { p_pass: pass }));
  }
  async appendEvent(pass: string, body: GameEventBody, expectedSeq: number) {
    await this.rpc("admin_append_event", { p_pass: pass, p_type: body.type, p_payload: body.payload, p_expected_seq: expectedSeq });
  }
  async setVoided(pass: string, eventId: number, voided: boolean) {
    await this.rpc("admin_set_voided", { p_pass: pass, p_event_id: eventId, p_voided: voided });
  }
  async resetGame(pass: string) {
    await this.rpc("admin_reset_game", { p_pass: pass });
  }
  async upsertTeam(pass: string, t: TeamInput) {
    await this.rpc("admin_upsert_team", {
      p_pass: pass,
      p_id: t.id ?? null,
      p_slot: t.slot,
      p_name: t.name,
      p_color: t.color,
      p_image_url: t.image_url ?? "",
    });
  }
  async deleteTeam(pass: string, id: string) {
    await this.rpc("admin_delete_team", { p_pass: pass, p_id: id });
  }
  async joinTeam(teamId: string, nickname: string) {
    const { data, error } = await this.sb
      .from("members")
      .insert({ game_id: GAME_ID, team_id: teamId, nickname })
      .select("id,team_id,nickname,created_at")
      .single();
    if (error) throw new Error(error.message);
    return data as MemberInfo;
  }
  async deleteMember(pass: string, id: string) {
    await this.rpc("admin_delete_member", { p_pass: pass, p_id: id });
  }
  async upsertVerses(pass: string, verses: VerseMap) {
    await this.rpc("admin_upsert_verses", { p_pass: pass, p_verses: verses });
  }
}

// ---------------------------------------------------------------------------
// 로컬 데모 (Supabase 없이 같은 브라우저의 탭끼리 동기화)
// ---------------------------------------------------------------------------
const LOCAL_PASS = process.env.NEXT_PUBLIC_DEMO_PASSCODE || "demo";

class LocalBackend implements Backend {
  mode = "local" as const;
  private key = `sbvp:${GAME_ID}`;
  private ch: BroadcastChannel | null = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(this.key) : null;

  private read(): Snapshot & { nextId: number } {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { events: [], teams: [], members: [], verses: {}, nextId: 1 };
  }
  private write(d: Snapshot & { nextId: number }) {
    localStorage.setItem(this.key, JSON.stringify(d));
    this.ch?.postMessage("changed");
  }
  private guard(pass: string) {
    if (pass !== LOCAL_PASS) throw new Error(`데모 모드 패스코드는 "${LOCAL_PASS}" 입니다`);
  }

  async load() {
    const { events, teams, members, verses } = this.read();
    return { events, teams: [...teams].sort((a, b) => a.slot - b.slot), members, verses: verses ?? {} };
  }
  async sync() {
    return this.load();
  }
  subscribe(onChange: () => void) {
    const h = () => onChange();
    this.ch?.addEventListener("message", h);
    window.addEventListener("storage", h);
    window.addEventListener("focus", h);
    const iv = setInterval(h, 3000);
    return () => {
      clearInterval(iv);
      this.ch?.removeEventListener("message", h);
      window.removeEventListener("storage", h);
      window.removeEventListener("focus", h);
    };
  }
  async verifyAdmin(pass: string) {
    return pass === LOCAL_PASS;
  }
  async appendEvent(pass: string, body: GameEventBody, expectedSeq: number) {
    this.guard(pass);
    const d = this.read();
    const next = Math.max(0, ...d.events.map((e) => e.seq)) + 1;
    if (expectedSeq !== next) throw new Error("다른 입력이 먼저 반영되었습니다. 다시 시도하세요");
    d.events.push({ ...body, id: d.nextId++, seq: next, voided: false, created_at: new Date().toISOString() } as GameEvent);
    this.write(d);
  }
  async setVoided(pass: string, eventId: number, voided: boolean) {
    this.guard(pass);
    const d = this.read();
    const e = d.events.find((x) => x.id === eventId);
    if (e) e.voided = voided;
    this.write(d);
  }
  async resetGame(pass: string) {
    this.guard(pass);
    const d = this.read();
    d.events = [];
    this.write(d);
  }
  async upsertTeam(pass: string, t: TeamInput) {
    this.guard(pass);
    const d = this.read();
    if (t.id) {
      const i = d.teams.findIndex((x) => x.id === t.id);
      if (i >= 0) d.teams[i] = { ...d.teams[i], ...t, id: t.id };
    } else {
      d.teams.push({ ...t, id: crypto.randomUUID() });
    }
    this.write(d);
  }
  async deleteTeam(pass: string, id: string) {
    this.guard(pass);
    const d = this.read();
    d.teams = d.teams.filter((x) => x.id !== id);
    d.members = d.members.filter((m) => m.team_id !== id);
    this.write(d);
  }
  async joinTeam(teamId: string, nickname: string) {
    const d = this.read();
    const m: MemberInfo = { id: crypto.randomUUID(), team_id: teamId, nickname, created_at: new Date().toISOString() };
    d.members.push(m);
    this.write(d);
    return m;
  }
  async deleteMember(pass: string, id: string) {
    this.guard(pass);
    const d = this.read();
    d.members = d.members.filter((x) => x.id !== id);
    this.write(d);
  }
  async upsertVerses(pass: string, verses: VerseMap) {
    this.guard(pass);
    const d = this.read();
    d.verses = { ...(d.verses ?? {}), ...verses };
    this.write(d);
  }
}

let instance: Backend | null = null;
export function getBackend(): Backend {
  if (instance) return instance;
  const forceDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
  if (forceDemo) sessionStorage.setItem("sbvp:demo", "1");
  const demo = forceDemo || (typeof window !== "undefined" && sessionStorage.getItem("sbvp:demo") === "1");
  instance = !demo && SB_URL && SB_KEY ? new SupabaseBackend(SB_URL, SB_KEY) : new LocalBackend();
  return instance;
}
