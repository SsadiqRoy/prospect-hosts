create table public.workspace_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 100),
 role text not null default 'member' check (role in ('admin','member')),
 created_at timestamptz not null default now()
);
alter table public.workspace_members enable row level security;
revoke all on public.workspace_members from anon, authenticated;
grant select on public.workspace_members to authenticated;
grant update(name) on public.workspace_members to authenticated;
create policy "Read own membership" on public.workspace_members for select to authenticated using (user_id=(select auth.uid()));
create policy "Update own name" on public.workspace_members for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create table public.prospects (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 200),
 type text not null default 'Individual' check(type in ('Individual','Agent','Agency','Company','Landlord','Guesthouse','B&B','Other')),
 location text not null default '',area_group text not null default '',
 emails jsonb not null default '[]' check(jsonb_typeof(emails)='array'),
 phones jsonb not null default '[]' check(jsonb_typeof(phones)='array'),
 whatsapp text not null default '',website text not null default '',
 socials jsonb not null default '[]' check(jsonb_typeof(socials)='array'),
 certification text not null default 'Not verified' check(certification in ('Not verified','Verified','Not applicable')),
 status text not null default 'Not contacted' check(status in ('Not contacted','Reached','Pending','Joined','Rejected','Customer')),
 last_contacted date,next_follow_up date,notes text not null default '',
 sources jsonb not null default '[]' check(jsonb_typeof(sources)='array'),
 archived boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.prospects enable row level security;
revoke all on public.prospects from anon;
grant select,insert,update,delete on public.prospects to authenticated;
create policy "Workspace members read" on public.prospects for select to authenticated using(exists(select 1 from public.workspace_members where user_id=(select auth.uid())));
create policy "Workspace members insert" on public.prospects for insert to authenticated with check(created_by=(select auth.uid()) and exists(select 1 from public.workspace_members where user_id=(select auth.uid())));
create policy "Workspace members update" on public.prospects for update to authenticated using(exists(select 1 from public.workspace_members where user_id=(select auth.uid()))) with check(exists(select 1 from public.workspace_members where user_id=(select auth.uid())));
create policy "Workspace members remove" on public.prospects for delete to authenticated using(exists(select 1 from public.workspace_members where user_id=(select auth.uid())));
create index prospects_created_by_idx on public.prospects(created_by);
create index prospects_archive_created_idx on public.prospects(archived,created_at desc);
create index prospects_follow_up_idx on public.prospects(next_follow_up) where not archived;
create function public.touch_prospect() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();new.created_by=old.created_by;new.created_at=old.created_at;return new;end;
$$;
revoke all on function public.touch_prospect() from public,anon,authenticated;
create trigger touch_prospect before update on public.prospects for each row execute function public.touch_prospect();
