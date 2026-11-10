-- 보안·성능 보강. Supabase SQL Editor 에서 실행하세요 (0003 다음에). 여러 번 실행해도 안전합니다.

-- ---------------------------------------------------------------------------
-- 1) 패스코드 무차별 대입 완화: 틀리면 0.5초 지연
-- ---------------------------------------------------------------------------
create or replace function public.admin_check(p_game text, p_pass text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1 from public.games g
    where g.id = p_game and g.admin_passcode_hash = extensions.crypt(p_pass, g.admin_passcode_hash)
  ) into v_ok;
  if not v_ok then
    perform pg_sleep(0.5);
  end if;
  return v_ok;
end $$;

-- 패스코드 변경(해시 강도도 함께 올림). SQL Editor 에서만 실행할 수 있습니다:
--   select public.admin_change_passcode('main', '현재 패스코드', '새 패스코드(12자 이상 권장)');
create or replace function public.admin_change_passcode(p_game text, p_pass text, p_new text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(p_game, p_pass);
  if char_length(p_new) < 8 then
    raise exception '새 패스코드는 8자 이상이어야 합니다';
  end if;
  update public.games set admin_passcode_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where id = p_game;
end $$;
revoke all on function public.admin_change_passcode(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) 참가 등록 스팸 방지: 게임당 참가자 300명까지
-- ---------------------------------------------------------------------------
create or replace function public.members_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.members where game_id = new.game_id) >= 300 then
    raise exception '참가 인원이 가득 찼어요. 운영자에게 문의해 주세요';
  end if;
  return new;
end $$;
drop trigger if exists members_cap on public.members;
create trigger members_cap before insert on public.members
  for each row execute function public.members_cap();

-- ---------------------------------------------------------------------------
-- 3) 변경 감지를 가볍게: 팀 이미지 본문 대신 수정 시각으로 해시
-- ---------------------------------------------------------------------------
alter table public.teams add column if not exists updated_at timestamptz not null default now();

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
    update public.teams
    set slot = p_slot, name = p_name, color = p_color, image_url = nullif(p_image_url, ''), updated_at = now()
    where id = p_id and game_id = p_game
    returning * into v_row;
  end if;
  return v_row;
end $$;

create or replace function public.game_version(p_game text)
returns jsonb language sql security definer set search_path = public, extensions stable as $$
  select jsonb_build_object(
    'e', coalesce((select max(seq) from public.events where game_id = p_game), 0),
    'v', coalesce((select count(*) from public.events where game_id = p_game and voided), 0),
    't', coalesce((select md5(string_agg(id::text || slot || updated_at::text, ',' order by slot, id))
                   from public.teams where game_id = p_game), ''),
    'm', coalesce((select count(*)::text || ':' || coalesce(max(created_at)::text, '')
                   from public.members where game_id = p_game), ''),
    's', coalesce((select md5(string_agg(verse || ':' || updated_at::text, ',' order by verse))
                   from public.verses where game_id = p_game), '')
  );
$$;
