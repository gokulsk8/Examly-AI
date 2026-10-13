create table if not exists public.question_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assessment_type text not null,
  subject text not null,
  subject_code text not null default '',
  paper jsonb not null,
  paper_sets jsonb not null default '[]'::jsonb,
  exam_date date not null,
  exam_time text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint question_papers_sets_are_array check (jsonb_typeof(paper_sets) = 'array')
);

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.question_papers (id) on delete cascade,
  question text not null,
  answer text not null default '',
  subject text not null default '',
  subject_code text not null default '',
  curriculum text not null default '',
  grade_level text not null default '',
  topic text not null default '',
  marks integer not null check (marks between 1 and 100),
  source_type text not null check (source_type in ('generated', 'uploaded')),
  source_name text not null default '',
  exam_set text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_nonempty_question check (length(trim(question)) > 0)
);

create index if not exists question_papers_created_at_idx
  on public.question_papers (created_at desc);
create index if not exists question_bank_subject_topic_idx
  on public.question_bank (subject, topic);
create index if not exists question_bank_paper_id_idx
  on public.question_bank (paper_id);

alter table public.question_papers enable row level security;
alter table public.question_bank enable row level security;

revoke all on public.question_papers, public.question_bank from anon, public;
grant usage on schema public to authenticated;
grant select, insert, delete on public.question_papers to authenticated;
grant select, insert, update, delete on public.question_bank to authenticated;

drop policy if exists "Authenticated members can read shared papers" on public.question_papers;
create policy "Authenticated members can read shared papers"
  on public.question_papers for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Members can create papers for their account" on public.question_papers;
create policy "Members can create papers for their account"
  on public.question_papers for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Authenticated members can delete shared papers" on public.question_papers;
create policy "Authenticated members can delete shared papers"
  on public.question_papers for delete to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "Authenticated members can read the shared question bank" on public.question_bank;
create policy "Authenticated members can read the shared question bank"
  on public.question_bank for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Members can add questions for their account" on public.question_bank;
create policy "Members can add questions for their account"
  on public.question_bank for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Authenticated members can edit shared questions" on public.question_bank;
create policy "Authenticated members can edit shared questions"
  on public.question_bank for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "Authenticated members can delete shared questions" on public.question_bank;
create policy "Authenticated members can delete shared questions"
  on public.question_bank for delete to authenticated
  using (created_by = (select auth.uid()));

create or replace function public.set_question_bank_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists question_bank_updated_at on public.question_bank;
create trigger question_bank_updated_at
  before update on public.question_bank
  for each row execute function public.set_question_bank_updated_at();

notify pgrst, 'reload schema';
