-- 로마서 8장 암송 파티 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 실행하세요.
-- 실행 후 맨 아래 "어드민 패스코드 설정"을 꼭 바꿔 주세요.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id text primary key,
  name text not null default '로마서 8장 암송 파티',
  admin_passcode_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  slot int not null,
  name text not null,
  color text not null default '#e5484d',
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists teams_game_idx on public.teams(game_id, slot);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  created_at timestamptz not null default now()
);
create index if not exists members_game_idx on public.members(game_id);

-- 게임 진행은 append-only 이벤트 로그. 상태는 클라이언트가 이벤트를 재생해 계산.
-- Undo/Redo 는 voided 플래그로 처리.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id) on delete cascade,
  seq int not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  voided boolean not null default false,
  created_at timestamptz not null default now(),
  unique (game_id, seq)
);

-- ---------------------------------------------------------------------------
-- RLS: 누구나 읽기 가능, 참가자는 팀 등록(members insert)만 직접 가능.
-- 나머지 쓰기는 모두 패스코드를 확인하는 security definer 함수로만.
-- ---------------------------------------------------------------------------
alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;

drop policy if exists games_read on public.games;
create policy games_read on public.games for select using (true);
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select using (true);
drop policy if exists members_read on public.members;
create policy members_read on public.members for select using (true);
drop policy if exists members_join on public.members;
create policy members_join on public.members for insert
  with check (exists (select 1 from public.teams t where t.id = team_id and t.game_id = members.game_id));
drop policy if exists events_read on public.events;
create policy events_read on public.events for select using (true);

-- Data API 권한 ("Automatically expose new tables" 꺼짐 기준)
grant usage on schema public to anon, authenticated;
grant select (id, name, created_at) on public.games to anon, authenticated;
grant select on public.teams, public.members, public.events to anon, authenticated;
grant insert (game_id, team_id, nickname) on public.members to anon, authenticated;

-- Realtime
do $$
begin
  begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.teams; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------------
-- 어드민 함수
-- ---------------------------------------------------------------------------
create or replace function public.admin_check(p_game text, p_pass text)
returns boolean language sql security definer set search_path = public, extensions stable as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game and g.admin_passcode_hash = extensions.crypt(p_pass, g.admin_passcode_hash)
  );
$$;

create or replace function public.admin_guard(p_game text, p_pass text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.admin_check(p_game, p_pass) then
    raise exception '어드민 패스코드가 올바르지 않습니다' using errcode = '28P01';
  end if;
end $$;

-- 이벤트 추가. p_expected_seq 가 현재 다음 seq 와 다르면 실패 (중복 클릭/동시 입력 방지)
create or replace function public.admin_append_event(
  p_game text, p_pass text, p_type text, p_payload jsonb, p_expected_seq int
) returns public.events language plpgsql security definer set search_path = public, extensions as $$
declare
  v_next int;
  v_row public.events;
begin
  perform public.admin_guard(p_game, p_pass);
  perform pg_advisory_xact_lock(hashtext('sbvp:' || p_game));
  select coalesce(max(seq), 0) + 1 into v_next from public.events where game_id = p_game;
  if p_expected_seq is not null and p_expected_seq <> v_next then
    raise exception '다른 입력이 먼저 반영되었습니다. 화면을 확인 후 다시 시도하세요 (expected %, next %)', p_expected_seq, v_next
      using errcode = '40001';
  end if;
  insert into public.events (game_id, seq, type, payload)
  values (p_game, v_next, p_type, coalesce(p_payload, '{}'::jsonb))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.admin_set_voided(p_game text, p_pass text, p_event_id bigint, p_voided boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(p_game, p_pass);
  update public.events set voided = p_voided where id = p_event_id and game_id = p_game;
end $$;

create or replace function public.admin_reset_game(p_game text, p_pass text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(p_game, p_pass);
  delete from public.events where game_id = p_game;
end $$;

create or replace function public.admin_upsert_team(
  p_game text, p_pass text, p_id uuid, p_slot int, p_name text, p_color text, p_image_url text
) returns public.teams language plpgsql security definer set search_path = public, extensions as $$
declare v_row public.teams;
begin
  perform public.admin_guard(p_game, p_pass);
  if p_id is null then
    insert into public.teams (game_id, slot, name, color, image_url)
    values (p_game, p_slot, p_name, p_color, nullif(p_image_url, ''))
    returning * into v_row;
  else
    update public.teams set slot = p_slot, name = p_name, color = p_color, image_url = nullif(p_image_url, '')
    where id = p_id and game_id = p_game
    returning * into v_row;
  end if;
  return v_row;
end $$;

create or replace function public.admin_delete_team(p_game text, p_pass text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(p_game, p_pass);
  delete from public.teams where id = p_id and game_id = p_game;
end $$;

create or replace function public.admin_delete_member(p_game text, p_pass text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(p_game, p_pass);
  delete from public.members where id = p_id and game_id = p_game;
end $$;

revoke all on function public.admin_guard(text, text) from public, anon, authenticated;
grant execute on function public.admin_check(text, text) to anon, authenticated;
grant execute on function public.admin_append_event(text, text, text, jsonb, int) to anon, authenticated;
grant execute on function public.admin_set_voided(text, text, bigint, boolean) to anon, authenticated;
grant execute on function public.admin_reset_game(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_team(text, text, uuid, int, text, text, text) to anon, authenticated;
grant execute on function public.admin_delete_team(text, text, uuid) to anon, authenticated;
grant execute on function public.admin_delete_member(text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 기본 게임 + 어드민 패스코드 설정  ⚠️ 'change-me' 를 원하는 패스코드로 바꿔서 실행
-- ---------------------------------------------------------------------------
insert into public.games (id, admin_passcode_hash)
values ('main', extensions.crypt('change-me', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- 초기 팀 (이름만. 말 이미지와 색은 어드민에서)
insert into public.teams (game_id, slot, name, color)
select 'main', v.slot, v.name, v.color
from (values
  (1, '기도하는', '#e5484d'),
  (2, '공동육아', '#f76b15'),
  (3, '아둘람',   '#ffc53d'),
  (4, '벧엘',     '#30a46c'),
  (5, '말랑',     '#0090ff'),
  (6, '그따무',   '#8e4ec6'),
  (7, '여호수아', '#d6409f')
) as v(slot, name, color)
where not exists (select 1 from public.teams t where t.game_id = 'main');

-- 패스코드를 나중에 바꿀 때:
-- update public.games set admin_passcode_hash = extensions.crypt('새패스코드', extensions.gen_salt('bf')) where id = 'main';
