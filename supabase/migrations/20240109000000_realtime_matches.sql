-- Enable realtime for matches and rounds
alter publication supabase_realtime add table public.custom_matches;
alter publication supabase_realtime add table public.match_rounds;

-- Add RLS policies for match_rounds
alter table public.match_rounds enable row level security;

create policy "Read own match rounds" on public.match_rounds
  for select using (
    exists (
      select 1 from public.custom_matches m 
      where m.id = match_id 
      and (m.host_id = auth.uid() or m.guest_id = auth.uid())
    )
  );

create policy "Update own match rounds" on public.match_rounds
  for update using (
    exists (
      select 1 from public.custom_matches m 
      where m.id = match_id 
      and (m.host_id = auth.uid() or m.guest_id = auth.uid())
    )
  );
