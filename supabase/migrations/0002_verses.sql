-- 본문(새번역 로마서 8장)을 DB에 저장. 어드민 "본문" 탭에서 입력합니다.
-- Supabase SQL Editor 에서 실행하세요 (0001_init.sql 다음에).

create table if not exists public.verses (
  game_id text not null references public.games(id) on delete cascade,
  verse int not null check (verse between 1 and 39),
  text text not null,
  updated_at timestamptz not null default now(),
  primary key (game_id, verse)
);

alter table public.verses enable row level security;
drop policy if exists verses_read on public.verses;
create policy verses_read on public.verses for select using (true);
grant select on public.verses to anon, authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.verses; exception when duplicate_object then null; end;
end $$;

-- p_verses: {"1": "본문", "2": "본문", ...}
create or replace function public.admin_upsert_verses(p_game text, p_pass text, p_verses jsonb)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare
  v_count int := 0;
  r record;
begin
  perform public.admin_guard(p_game, p_pass);
  for r in select key, value from jsonb_each_text(p_verses) loop
    insert into public.verses (game_id, verse, text, updated_at)
    values (p_game, r.key::int, r.value, now())
    on conflict (game_id, verse) do update set text = excluded.text, updated_at = now();
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

grant execute on function public.admin_upsert_verses(text, text, jsonb) to anon, authenticated;
