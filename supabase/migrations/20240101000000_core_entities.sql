-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector" schema public; -- For question embeddings later

-- ENUMS
create type user_role as enum ('student', 'curator', 'admin');
create type question_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'deactivated');
create type question_difficulty as enum ('easy', 'medium', 'hard');
create type exam_type as enum ('UPSC_GS1', 'UPSC_CSAT', 'MPSC_PRELIMS');
create type match_status as enum ('waiting', 'active', 'completed', 'abandoned');
create type audit_action as enum ('create', 'update', 'delete', 'approve', 'reject', 'deactivate');

-- 1. USERS (extends auth.users)
create table public.users (
  id uuid primary key, -- references auth.users(id) in real supabase, but mocked for pure local testing if not using actual auth.users linked
  username text unique not null check (char_length(username) >= 3),
  email text unique not null,
  role user_role default 'student' not null,
  exam_preference exam_type,
  avatar_state text default 'Neutral/Focused' not null,
  current_streak integer default 0 not null check (current_streak >= 0),
  max_streak integer default 0 not null check (max_streak >= 0),
  monthly_score numeric default 0 not null,
  total_score numeric default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create index idx_users_username on public.users (username);

-- 2. NOTIFICATION PREFERENCES
create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  email_daily_reminder boolean default true not null,
  push_daily_reminder boolean default true not null,
  email_match_invites boolean default true not null,
  push_match_invites boolean default true not null,
  updated_at timestamp with time zone default now() not null
);

-- 3. QUESTIONS
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  exam exam_type not null,
  subject text not null,
  topic text not null,
  language text default 'en' not null,
  difficulty question_difficulty default 'medium' not null,
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'object'),
  correct_option text not null,
  explanation text,
  elimination_tips text,
  source_reference text,
  generation_metadata jsonb,
  status question_status default 'pending_review' not null,
  created_by uuid references public.users(id) on delete set null,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create index idx_questions_exam_subject on public.questions (exam, subject);
create index idx_questions_status on public.questions (status);

-- 4. QUESTION SOURCES
create table public.question_sources (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  source_name text not null, -- e.g., 'PIB', 'The Hindu'
  source_url text,
  publication_date date,
  created_at timestamp with time zone default now() not null
);
create index idx_question_sources_qid on public.question_sources (question_id);

-- 5. QUESTION EMBEDDINGS
create table public.question_embeddings (
  question_id uuid primary key references public.questions(id) on delete cascade,
  embedding vector(768), -- Gemini standard size
  model_version text,
  created_at timestamp with time zone default now() not null
);
-- We won't create the HNSW index yet as vector extension might need specific setup per provider

-- 6. QUESTION VERSIONS
create table public.question_versions (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  version_number integer not null,
  question_data jsonb not null, -- The entire question row snapshot
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now() not null,
  unique (question_id, version_number)
);

-- 7. CURATOR AUDIT LOGS
create table public.curator_audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.users(id) on delete set null not null,
  action audit_action not null,
  entity_type text not null, -- e.g., 'question', 'user'
  entity_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamp with time zone default now() not null
);
create index idx_audit_logs_entity on public.curator_audit_logs (entity_type, entity_id);

-- 8. QUIZ SESSIONS
create table public.quiz_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  exam exam_type not null,
  started_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  score numeric default 0,
  is_completed boolean default false not null
);

-- 9. DAILY ATTEMPTS
create table public.daily_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  exam exam_type not null,
  attempt_date date not null default current_date,
  net_score numeric default 0 not null,
  correct_count integer default 0 not null,
  incorrect_count integer default 0 not null,
  timeout_count integer default 0 not null,
  is_completed boolean default false not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (user_id, exam, attempt_date) -- Prevents duplicate daily attempts per exam
);
create index idx_daily_attempts_user on public.daily_attempts (user_id, attempt_date);

-- 10. USER TOPIC STATS
create table public.user_topic_stats (
  user_id uuid references public.users(id) on delete cascade not null,
  exam exam_type not null,
  subject text not null,
  topic text not null,
  questions_attempted integer default 0 not null,
  questions_correct integer default 0 not null,
  accuracy numeric generated always as (
    case when questions_attempted = 0 then 0 
    else (questions_correct::numeric / questions_attempted) * 100 end
  ) stored,
  last_attempted_at timestamp with time zone default now() not null,
  primary key (user_id, exam, subject, topic)
);

-- 11. MONTHLY LEADERBOARDS
create table public.monthly_leaderboards (
  id uuid default uuid_generate_v4() primary key,
  month date not null, -- First day of the month
  exam exam_type not null,
  user_id uuid references public.users(id) on delete cascade not null,
  score numeric not null,
  rank integer,
  updated_at timestamp with time zone default now() not null,
  unique (month, exam, user_id)
);

-- 12. CUSTOM MATCHES (1v1)
create table public.custom_matches (
  id uuid default uuid_generate_v4() primary key,
  room_code text unique not null check (char_length(room_code) >= 4),
  host_id uuid references public.users(id) not null,
  guest_id uuid references public.users(id),
  exam exam_type not null,
  status match_status default 'waiting' not null,
  host_score numeric default 0 not null,
  guest_score numeric default 0 not null,
  winner_id uuid references public.users(id),
  created_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  check (host_id != guest_id)
);

-- 13. MATCH ROUNDS
create table public.match_rounds (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.custom_matches(id) on delete cascade not null,
  question_id uuid references public.questions(id) not null,
  round_number integer not null check (round_number > 0),
  host_answer text,
  host_time_ms integer,
  host_score numeric default 0,
  guest_answer text,
  guest_time_ms integer,
  guest_score numeric default 0,
  created_at timestamp with time zone default now() not null,
  unique (match_id, round_number)
);

-- UPDATED_AT TRIGGER FUNCTION
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ATTACH TRIGGERS
create trigger handle_users_updated_at before update on public.users for each row execute procedure public.handle_updated_at();
create trigger handle_questions_updated_at before update on public.questions for each row execute procedure public.handle_updated_at();
create trigger handle_daily_attempts_updated_at before update on public.daily_attempts for each row execute procedure public.handle_updated_at();
create trigger handle_notification_prefs_updated_at before update on public.notification_preferences for each row execute procedure public.handle_updated_at();

-- BASIC RLS
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.daily_attempts enable row level security;
alter table public.custom_matches enable row level security;

create policy "Read own profile" on public.users for select using (true);
create policy "Read approved questions" on public.questions for select using (status = 'approved');
create policy "Manage own attempts" on public.daily_attempts for all using (true);
create policy "Read own matches" on public.custom_matches for select using (true);
