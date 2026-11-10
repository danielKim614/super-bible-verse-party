-- 가벼운 변경 감지용 함수. 클라이언트는 4초마다 이것만 호출하고, 바뀐 부분만 다시 받습니다.
-- Supabase SQL Editor 에서 실행하세요 (0002 다음에).

create or replace function public.game_version(p_game text)
returns jsonb language sql security definer set search_path = public, extensions stable as $$
  select jsonb_build_object(
    'e', coalesce((select max(seq) from public.events where game_id = p_game), 0),
    'v', coalesce((select count(*) from public.events where game_id = p_game and voided), 0),
    't', coalesce((select md5(string_agg(id::text || slot || name || color || coalesce(image_url, ''), ',' order by slot, id))
                   from public.teams where game_id = p_game), ''),
    'm', coalesce((select md5(string_agg(id::text || team_id::text || nickname, ',' order by created_at, id))
                   from public.members where game_id = p_game), ''),
    's', coalesce((select md5(string_agg(verse || ':' || md5(text), ',' order by verse))
                   from public.verses where game_id = p_game), '')
  );
$$;

grant execute on function public.game_version(text) to anon, authenticated;
