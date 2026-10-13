create or replace function public.is_workspace_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'workspace_role' = 'admin', false);
$$;

revoke all on function public.is_workspace_admin() from public;
grant execute on function public.is_workspace_admin() to authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_papers'
      and column_name = 'status'
  ) then
    alter table public.question_papers
      add column status text not null default 'pending_review';
    update public.question_papers
    set status = 'approved';
  end if;
end;
$$;

alter table public.question_papers
  drop constraint if exists question_papers_status_check;
update public.question_papers
set status = 'approved'
where status is null or status = 'completed';
alter table public.question_papers
  alter column status set default 'pending_review',
  alter column status set not null;
alter table public.question_papers
  add constraint question_papers_status_check
  check (status in ('draft', 'pending_review', 'approved', 'rejected', 'completed', 'archived'));

create index if not exists question_papers_status_created_at_idx
  on public.question_papers (status, created_at desc);

create table if not exists public.paper_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  subject text not null default '',
  course text not null default '',
  assessment_type text not null default '',
  configuration jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  is_archived boolean not null default false,
  is_default boolean not null default false,
  usage_count bigint not null default 0 check (usage_count >= 0),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paper_templates_configuration_is_object
    check (jsonb_typeof(configuration) = 'object')
);

create unique index if not exists paper_templates_one_default_idx
  on public.paper_templates (is_default)
  where is_default and not is_archived;
create index if not exists paper_templates_published_idx
  on public.paper_templates (subject, assessment_type)
  where is_published and not is_archived;

create or replace function public.set_default_paper_template(template_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_workspace_admin() then
    raise exception 'Administrator access is required to change the default template.';
  end if;

  update public.paper_templates
  set is_default = false, updated_by = auth.uid()
  where is_default and not is_archived and id <> template_id;

  update public.paper_templates
  set is_default = true, updated_by = auth.uid()
  where id = template_id and not is_archived;

  if not found then
    raise exception 'The selected template does not exist or is archived.';
  end if;
end;
$$;

revoke all on function public.set_default_paper_template(uuid) from public;
grant execute on function public.set_default_paper_template(uuid) to authenticated;

alter table public.paper_templates enable row level security;
revoke all on public.paper_templates from anon, public;
grant select, insert, update, delete on public.paper_templates to authenticated;
grant update on public.question_papers to authenticated;

drop policy if exists "Authenticated members can read shared papers" on public.question_papers;
drop policy if exists "Members can create papers for their account" on public.question_papers;
drop policy if exists "Authenticated members can delete shared papers" on public.question_papers;
drop policy if exists "Faculty and admins can read authorized papers" on public.question_papers;
create policy "Faculty and admins can read authorized papers"
  on public.question_papers for select to authenticated
  using (
    created_by = (select auth.uid())
    or status = 'approved'
    or (select public.is_workspace_admin())
  );

drop policy if exists "Faculty and admins can create owned papers" on public.question_papers;
create policy "Faculty and admins can create owned papers"
  on public.question_papers for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'pending_review');

drop policy if exists "Faculty and admins can update authorized papers" on public.question_papers;
create policy "Faculty and admins can update authorized papers"
  on public.question_papers for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_workspace_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_workspace_admin()));

drop policy if exists "Faculty and admins can delete authorized papers" on public.question_papers;
create policy "Faculty and admins can delete authorized papers"
  on public.question_papers for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_workspace_admin()));

drop policy if exists "Authenticated members can read the shared question bank" on public.question_bank;
drop policy if exists "Members can add questions for their account" on public.question_bank;
drop policy if exists "Authenticated members can edit shared questions" on public.question_bank;
drop policy if exists "Authenticated members can delete shared questions" on public.question_bank;
drop policy if exists "Faculty and admins can read authorized questions" on public.question_bank;
create policy "Faculty and admins can read authorized questions"
  on public.question_bank for select to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.is_workspace_admin())
    or exists (
      select 1
      from public.question_papers
      where question_papers.id = question_bank.paper_id
        and question_papers.status = 'approved'
    )
  );

drop policy if exists "Faculty and admins can create owned questions" on public.question_bank;
create policy "Faculty and admins can create owned questions"
  on public.question_bank for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      paper_id is null
      or exists (
        select 1
        from public.question_papers
        where question_papers.id = question_bank.paper_id
          and question_papers.created_by = (select auth.uid())
      )
    )
  );

drop policy if exists "Faculty and admins can update authorized questions" on public.question_bank;
create policy "Faculty and admins can update authorized questions"
  on public.question_bank for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_workspace_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_workspace_admin()));

drop policy if exists "Faculty and admins can delete authorized questions" on public.question_bank;
create policy "Faculty and admins can delete authorized questions"
  on public.question_bank for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_workspace_admin()));

drop policy if exists "Anyone can read published templates" on public.paper_templates;
create policy "Anyone can read published templates"
  on public.paper_templates for select to authenticated
  using (
    (is_published and not is_archived)
    or (select public.is_workspace_admin())
  );

drop policy if exists "Only admins can manage templates" on public.paper_templates;
create policy "Only admins can manage templates"
  on public.paper_templates for all to authenticated
  using ((select public.is_workspace_admin()))
  with check ((select public.is_workspace_admin()));

create or replace function public.protect_paper_review_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and not public.is_workspace_admin() then
    raise exception 'Only an administrator can approve or reject a question paper.';
  end if;
  return new;
end;
$$;

drop trigger if exists question_papers_protect_review_status on public.question_papers;
create trigger question_papers_protect_review_status
  before update on public.question_papers
  for each row execute function public.protect_paper_review_status();

create or replace function public.set_paper_template_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.updated_by is null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists paper_templates_updated_at on public.paper_templates;
create trigger paper_templates_updated_at
  before update on public.paper_templates
  for each row execute function public.set_paper_template_updated_at();

notify pgrst, 'reload schema';
