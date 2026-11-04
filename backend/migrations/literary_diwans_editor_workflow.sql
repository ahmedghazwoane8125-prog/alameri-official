-- AL-AMERI Literary Platform: private author drafts, version history and reviewed diwans.
-- Existing static poems and legacy published pages are deliberately untouched.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table if not exists public.literary_diwans(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 2 and 120),
  description text not null default '' check(char_length(description)<=3000),
  status text not null default 'draft' check(status in ('draft','submitted','published','rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists literary_diwans_owner_idx on public.literary_diwans(owner_id,created_at desc);
create index if not exists literary_diwans_public_idx on public.literary_diwans(status,created_at desc);
alter table public.literary_diwans enable row level security;
create policy "Read own or published diwans" on public.literary_diwans
for select to anon,authenticated using (
 owner_id=(select auth.uid()) or status='published'
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
create policy "Member creates private diwan draft" on public.literary_diwans
for insert to authenticated with check(owner_id=(select auth.uid()) and status='draft');
create policy "Author edits nonpublic diwan draft" on public.literary_diwans
for update to authenticated using(owner_id=(select auth.uid()) and status in ('draft','rejected'))
with check(owner_id=(select auth.uid()) and status in ('draft','rejected'));
create policy "Author removes private diwan draft" on public.literary_diwans
for delete to authenticated using(owner_id=(select auth.uid()) and status='draft');
revoke all on public.literary_diwans from anon,authenticated;
grant select on public.literary_diwans to anon,authenticated;
grant insert(owner_id,title,description) on public.literary_diwans to authenticated;
grant update(title,description) on public.literary_diwans to authenticated;
grant delete on public.literary_diwans to authenticated;

create table if not exists public.diwan_poems(
  id uuid primary key default gen_random_uuid(),
  diwan_id uuid not null references public.literary_diwans(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 2 and 120),
  body text not null check(char_length(btrim(body)) between 10 and 30000),
  category text not null default '' check(char_length(category)<=100),
  position integer not null default 0 check(position>=0),
  status text not null default 'draft' check(status in ('draft','submitted','published','rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists diwan_poems_diwan_idx on public.diwan_poems(diwan_id,position,created_at);
create index if not exists diwan_poems_author_idx on public.diwan_poems(author_id,status);
alter table public.diwan_poems enable row level security;
create policy "Read own reviewed or approved public poems" on public.diwan_poems
for select to anon,authenticated using (
 author_id=(select auth.uid())
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
 or (status='published' and exists(
  select 1 from public.literary_diwans d where d.id=diwan_id and d.status='published'
 ))
);
create policy "Owner creates unpublished poem" on public.diwan_poems
for insert to authenticated with check(
 author_id=(select auth.uid()) and status='draft' and exists(
  select 1 from public.literary_diwans d where d.id=diwan_id and d.owner_id=(select auth.uid())
 )
);
create policy "Owner edits private poem" on public.diwan_poems
for update to authenticated using(author_id=(select auth.uid()) and status in ('draft','rejected'))
with check(author_id=(select auth.uid()) and status in ('draft','rejected')
 and exists(select 1 from public.literary_diwans d where d.id=diwan_id and d.owner_id=(select auth.uid())));
create policy "Owner deletes unsent poem" on public.diwan_poems
for delete to authenticated using(author_id=(select auth.uid()) and status in ('draft','rejected'));
revoke all on public.diwan_poems from anon,authenticated;
grant select on public.diwan_poems to anon,authenticated;
grant insert(diwan_id,author_id,title,body,category,position) on public.diwan_poems to authenticated;
grant update(title,body,category,position) on public.diwan_poems to authenticated;
grant delete on public.diwan_poems to authenticated;

create table if not exists public.literary_drafts(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null default 'مسودة جديدة' check(char_length(title) between 1 and 120),
 body text not null default '' check(char_length(body)<=30000),
 category text not null default '' check(char_length(category)<=100),
 kind text not null default 'poem' check(kind in ('poem','post')),
 layout text not null default 'free' check(layout in ('free','bayt')),
 revision integer not null default 1 check(revision>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists literary_drafts_author_idx on public.literary_drafts(author_id,updated_at desc);
alter table public.literary_drafts enable row level security;
create policy "Author reads own drafts" on public.literary_drafts for select to authenticated using(author_id=(select auth.uid()));
create policy "Author creates own drafts" on public.literary_drafts for insert to authenticated with check(author_id=(select auth.uid()));
create policy "Author updates own drafts" on public.literary_drafts for update to authenticated
using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "Author removes own drafts" on public.literary_drafts for delete to authenticated using(author_id=(select auth.uid()));
revoke all on public.literary_drafts from anon,authenticated;
grant select on public.literary_drafts to authenticated;
grant insert(author_id,title,body,category,kind,layout) on public.literary_drafts to authenticated;
grant update(title,body,category,kind,layout) on public.literary_drafts to authenticated;
grant delete on public.literary_drafts to authenticated;

create table if not exists public.literary_draft_versions(
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references public.literary_drafts(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 revision integer not null,
 title text not null,
 body text not null,
 category text not null,
 kind text not null,
 layout text not null,
 created_at timestamptz not null default now(),
 unique(draft_id,revision)
);
create index if not exists literary_draft_versions_draft_idx on public.literary_draft_versions(draft_id,revision desc);
alter table public.literary_draft_versions enable row level security;
create policy "Authors see only their draft history" on public.literary_draft_versions
for select to authenticated using(author_id=(select auth.uid()));
revoke all on public.literary_draft_versions from anon,authenticated;
grant select on public.literary_draft_versions to authenticated;

create or replace function app_private.literary_touch() returns trigger language plpgsql
set search_path='' as $$
begin
 new.updated_at=now();return new;
end $$;
create trigger literary_diwans_touch before update on public.literary_diwans
for each row execute function app_private.literary_touch();
create trigger diwan_poems_touch before update on public.diwan_poems
for each row execute function app_private.literary_touch();

create or replace function app_private.prepare_draft_revision() returns trigger
language plpgsql set search_path='' as $$
begin
 new.revision=old.revision+1;
 new.updated_at=now();
 return new;
end $$;
create trigger draft_revision_before_update before update on public.literary_drafts
for each row execute function app_private.prepare_draft_revision();

create or replace function app_private.snapshot_draft_revision() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.literary_draft_versions(draft_id,author_id,revision,title,body,category,kind,layout)
 values(new.id,new.author_id,new.revision,new.title,new.body,new.category,new.kind,new.layout);
 return new;
end $$;
create trigger draft_revision_snapshot after insert or update on public.literary_drafts
for each row execute function app_private.snapshot_draft_revision();

create table if not exists public.literary_review_log(
 id uuid primary key default gen_random_uuid(),
 item_kind text not null check(item_kind in ('diwan','poem')),
 item_id uuid not null,
 owner_id uuid not null references public.profiles(id),
 actor_id uuid not null references public.profiles(id),
 action text not null check(action in ('submit','approve','reject')),
 note text,
 created_at timestamptz not null default now()
);
create index if not exists literary_review_log_item_idx on public.literary_review_log(item_kind,item_id,created_at desc);
alter table public.literary_review_log enable row level security;
create policy "Authors and admins view literary decisions" on public.literary_review_log
for select to authenticated using(
 owner_id=(select auth.uid()) or exists(
 select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'
 ));
revoke all on public.literary_review_log from anon,authenticated;
grant select on public.literary_review_log to authenticated;

create or replace function public.literary_action(p_kind text,p_item_id uuid,p_action text,p_note text default '')
returns text language plpgsql security definer set search_path='' as $$
declare vactor uuid; vrole public.user_role; vowner uuid; vstatus text;
begin
 vactor=auth.uid();
 if vactor is null then raise exception 'Sign in required';end if;
 select role into vrole from public.profiles where id=vactor;
 if p_kind not in ('diwan','poem') or p_action not in ('submit','approve','reject')
 then raise exception 'Unsupported literary action';end if;
 if p_kind='diwan' then
  select owner_id,status into vowner,vstatus from public.literary_diwans
  where id=p_item_id for update;
 else
  select author_id,status into vowner,vstatus from public.diwan_poems
  where id=p_item_id for update;
 end if;
 if vowner is null then raise exception 'Literary item not found';end if;
 if p_action='submit' then
  if vowner<>vactor then raise exception 'Not the author';end if;
  if vrole not in ('poet','verified_poet','admin') then
   raise exception 'A poet-approved profile is required before submission';end if;
  if vstatus not in ('draft','rejected') then raise exception 'Item cannot be submitted';end if;
  if p_kind='diwan' and not exists(
    select 1 from public.diwan_poems
    where diwan_id=p_item_id and status='published'
  ) then raise exception 'Approve at least one poem before submitting the diwan';end if;
  if p_kind='diwan' then update public.literary_diwans set status='submitted',review_note=null where id=p_item_id;
  else update public.diwan_poems set status='submitted',review_note=null where id=p_item_id;end if;
 else
  if vrole<>'admin' then raise exception 'Only the owner-admin may approve publication';end if;
  if vstatus<>'submitted' then raise exception 'The item is not pending review';end if;
  if p_action='reject' and btrim(coalesce(p_note,''))='' then raise exception 'Rejection needs a note';end if;
  if p_kind='diwan' then
   update public.literary_diwans
   set status=case when p_action='approve' then 'published' else 'rejected' end,
   reviewed_by=vactor,review_note=nullif(btrim(p_note),''),reviewed_at=now()
   where id=p_item_id;
  else
   update public.diwan_poems
   set status=case when p_action='approve' then 'published' else 'rejected' end,
   reviewed_by=vactor,review_note=nullif(btrim(p_note),''),reviewed_at=now()
   where id=p_item_id;
  end if;
 end if;
 insert into public.literary_review_log(item_kind,item_id,owner_id,actor_id,action,note)
 values(p_kind,p_item_id,vowner,vactor,p_action,nullif(btrim(p_note),''));
 return p_action;
end $$;
revoke execute on function public.literary_action(text,uuid,text,text) from public,anon;
grant execute on function public.literary_action(text,uuid,text,text) to authenticated;

-- Close the legacy shortcut: official new poems must use the reviewed diwan flow.
drop policy if exists "Authors create permitted work" on public.posts;
create policy "Authors create permitted work" on public.posts for insert to authenticated
with check(author_id=(select auth.uid()) and kind='post');
drop policy if exists "Authors update permitted work" on public.posts;
create policy "Authors update permitted work" on public.posts for update to authenticated
using(author_id=(select auth.uid()) and kind='post')
with check(author_id=(select auth.uid()) and kind='post');
