-- Migration: Add user_question_log for individual question tracking

create table public.user_question_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  is_correct boolean not null,
  score numeric not null,
  time_taken_ms integer,
  created_at timestamp with time zone default now() not null,
  unique (user_id, question_id)
);
create index idx_user_question_log_user on public.user_question_log (user_id);

alter table public.user_question_log enable row level security;
create policy "Manage own logs" on public.user_question_log for all using (true);
