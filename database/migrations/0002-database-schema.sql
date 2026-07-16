create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid not null,
  full_name text,
  email text not null,
  phone text,
  location text,
  current_title text,
  experience_level text,
  years_experience integer,
  skills text[] not null default array[]::text[],
  industries text[] not null default array[]::text[],
  work_experience jsonb not null default '[]'::jsonb,
  education jsonb,
  job_titles_seeking text[] not null default array[]::text[],
  remote_preference text,
  preferred_locations text[] not null default array[]::text[],
  salary_expectation text,
  cover_letter_tone text,
  linkedin_url text,
  portfolio_url text,
  work_authorization text,
  resume_pdf_url text,
  resume_pdf_key text,
  is_complete boolean not null default false,
  completion_percentage integer not null default 0,
  missing_fields text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_email_not_blank check (length(btrim(email)) > 0),
  constraint profiles_experience_level_check check (
    experience_level is null
    or experience_level in ('junior', 'mid', 'senior', 'lead')
  ),
  constraint profiles_years_experience_check check (
    years_experience is null
    or years_experience >= 0
  ),
  constraint profiles_work_experience_array_check check (
    jsonb_typeof(work_experience) = 'array'
  ),
  constraint profiles_education_object_check check (
    education is null
    or jsonb_typeof(education) = 'object'
  ),
  constraint profiles_remote_preference_check check (
    remote_preference is null
    or remote_preference in ('remote', 'onsite', 'hybrid', 'any')
  ),
  constraint profiles_cover_letter_tone_check check (
    cover_letter_tone is null
    or cover_letter_tone in ('formal', 'casual', 'enthusiastic')
  ),
  constraint profiles_work_authorization_check check (
    work_authorization is null
    or work_authorization in ('citizen', 'permanent_resident', 'visa_required')
  ),
  constraint profiles_completion_percentage_check check (
    completion_percentage >= 0
    and completion_percentage <= 100
  )
);

create table if not exists public.agent_runs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'running',
  job_title_searched text not null,
  location_searched text,
  jobs_found integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_runs_pkey primary key (id),
  constraint agent_runs_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint agent_runs_status_check check (status in ('running', 'completed', 'failed')),
  constraint agent_runs_job_title_not_blank check (length(btrim(job_title_searched)) > 0),
  constraint agent_runs_jobs_found_check check (jobs_found >= 0)
);

create table if not exists public.jobs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  run_id uuid,
  external_job_id text,
  source text not null default 'search',
  source_url text not null,
  external_apply_url text not null,
  title text not null,
  company text not null,
  location text not null,
  salary text,
  job_type text,
  about_role text not null,
  responsibilities text[] not null default array[]::text[],
  requirements text[] not null default array[]::text[],
  nice_to_have text[] not null default array[]::text[],
  benefits text[] not null default array[]::text[],
  about_company text,
  match_score integer not null,
  match_reason text not null,
  matched_skills text[] not null default array[]::text[],
  missing_skills text[] not null default array[]::text[],
  company_research jsonb,
  found_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_pkey primary key (id),
  constraint jobs_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint jobs_run_id_fkey foreign key (run_id) references public.agent_runs(id) on delete set null,
  constraint jobs_source_check check (source = 'search'),
  constraint jobs_source_url_not_blank check (length(btrim(source_url)) > 0),
  constraint jobs_external_apply_url_not_blank check (length(btrim(external_apply_url)) > 0),
  constraint jobs_title_not_blank check (length(btrim(title)) > 0),
  constraint jobs_company_not_blank check (length(btrim(company)) > 0),
  constraint jobs_location_not_blank check (length(btrim(location)) > 0),
  constraint jobs_about_role_not_blank check (length(btrim(about_role)) > 0),
  constraint jobs_match_score_check check (match_score >= 0 and match_score <= 100),
  constraint jobs_match_reason_not_blank check (length(btrim(match_reason)) > 0),
  constraint jobs_company_research_object_check check (
    company_research is null
    or jsonb_typeof(company_research) = 'object'
  )
);

create table if not exists public.agent_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  run_id uuid,
  job_id uuid,
  level text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_logs_pkey primary key (id),
  constraint agent_logs_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint agent_logs_run_id_fkey foreign key (run_id) references public.agent_runs(id) on delete set null,
  constraint agent_logs_job_id_fkey foreign key (job_id) references public.jobs(id) on delete set null,
  constraint agent_logs_level_check check (level in ('info', 'warning', 'error')),
  constraint agent_logs_message_not_blank check (length(btrim(message)) > 0),
  constraint agent_logs_context_object_check check (jsonb_typeof(context) = 'object')
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists agent_runs_user_started_idx on public.agent_runs (user_id, started_at desc);
create index if not exists agent_runs_user_status_idx on public.agent_runs (user_id, status);
create index if not exists jobs_user_found_idx on public.jobs (user_id, found_at desc);
create index if not exists jobs_user_match_score_idx on public.jobs (user_id, match_score desc);
create index if not exists jobs_user_company_idx on public.jobs (user_id, company);
create index if not exists jobs_user_title_idx on public.jobs (user_id, title);
create unique index if not exists jobs_user_external_job_id_uidx
  on public.jobs (user_id, external_job_id)
  where external_job_id is not null;
create index if not exists agent_logs_user_created_idx on public.agent_logs (user_id, created_at desc);
create index if not exists agent_logs_run_created_idx
  on public.agent_logs (run_id, created_at desc)
  where run_id is not null;
create index if not exists agent_logs_job_created_idx
  on public.agent_logs (job_id, created_at desc)
  where job_id is not null;

alter table public.profiles enable row level security;
alter table public.agent_runs enable row level security;
alter table public.jobs enable row level security;
alter table public.agent_logs enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
for delete
using (id = auth.uid());

drop policy if exists agent_runs_select_own on public.agent_runs;
create policy agent_runs_select_own on public.agent_runs
for select
using (user_id = auth.uid());

drop policy if exists agent_runs_insert_own on public.agent_runs;
create policy agent_runs_insert_own on public.agent_runs
for insert
with check (user_id = auth.uid());

drop policy if exists agent_runs_update_own on public.agent_runs;
create policy agent_runs_update_own on public.agent_runs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists agent_runs_delete_own on public.agent_runs;
create policy agent_runs_delete_own on public.agent_runs
for delete
using (user_id = auth.uid());

drop policy if exists jobs_select_own on public.jobs;
create policy jobs_select_own on public.jobs
for select
using (user_id = auth.uid());

drop policy if exists jobs_insert_own on public.jobs;
create policy jobs_insert_own on public.jobs
for insert
with check (user_id = auth.uid());

drop policy if exists jobs_update_own on public.jobs;
create policy jobs_update_own on public.jobs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists jobs_delete_own on public.jobs;
create policy jobs_delete_own on public.jobs
for delete
using (user_id = auth.uid());

drop policy if exists agent_logs_select_own on public.agent_logs;
create policy agent_logs_select_own on public.agent_logs
for select
using (user_id = auth.uid());

drop policy if exists agent_logs_insert_own on public.agent_logs;
create policy agent_logs_insert_own on public.agent_logs
for insert
with check (user_id = auth.uid());

drop policy if exists agent_logs_update_own on public.agent_logs;
create policy agent_logs_update_own on public.agent_logs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists agent_logs_delete_own on public.agent_logs;
create policy agent_logs_delete_own on public.agent_logs
for delete
using (user_id = auth.uid());
