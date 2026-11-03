-- AL-AMERI OFFICIAL — Supabase PostgreSQL setup (v1).
-- Run in a NEW Supabase project SQL Editor. Keep this file source-controlled.
-- Public anon/publishable key is safe in browser; NEVER expose service_role key.
-- Owner must manually promote their own confirmed auth user to admin from SQL Editor.
begin;
do $$ begin create type public.user_role as enum('member','poet','verified_poet','reviewer','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.application_state as enum('draft','submitted','under_review','needs_info','approved','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.contact_visibility as enum('private','members','public'); exception when duplicate_object then null; end $$;
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 80),
 pen_name text check(pen_name is null or char_length(pen_name)<=80),
 role public.user_role not null default 'member',
 bio text check(bio is null or char_length(bio)<=1000),
 country text check(country is null or char_length(country)<=80),
 city text check(city is null or char_length(city)<=80),
 website text check(website is null or char_length(website)<=500),
 avatar_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.private_contacts(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 whatsapp text check(whatsapp is null or char_length(whatsapp)<=40),
 whatsapp_visibility public.contact_visibility not null default 'private',
 updated_at timestamptz not null default now()
);
create table if not exists public.posts(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 120),
 body text not null check(char_length(body) between 10 and 30000),
 category text check(category is null or char_length(category)<=100),
 kind text not null check(kind in('post','poem')),
 publication_status text not null default 'draft' check(publication_status in('draft','published','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists posts_published_idx on public.posts(publication_status,created_at desc);
create table if not exists public.poet_applications(
 id uuid primary key default gen_random_uuid(),
 applicant_id uuid not null references public.profiles(id) on delete cascade,
 pen_name text not null check(char_length(pen_name) between 1 and 100),
 biography text not null check(char_length(biography) between 10 and 2000),
 poetry_style text not null,
 examples text not null check(char_length(examples) between 10 and 12000),
 reference_urls text[] not null check(cardinality(reference_urls)>=2),
 status public.application_state not null default 'submitted',
 reviewed_by uuid references public.profiles(id),
 review_note text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists poet_apps_status_idx on public.poet_applications(status,created_at);
create table if not exists public.review_log(
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.poet_applications(id) on delete cascade,
 reviewer_id uuid not null references public.profiles(id),
 decision text not null check(decision in('recommend_approve','recommend_reject','approve','reject','needs_info')),
 note text not null check(length(note)>0),
 created_at timestamptz not null default now()
);
create table if not exists public.follows(
 follower_id uuid not null references public.profiles(id) on delete cascade,
 followed_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,followed_id),
 check(follower_id<>followed_id)
);
create table if not exists public.post_likes(
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create table if not exists public.bookmarks(
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create table if not exists public.comments(
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 1000),
 created_at timestamptz not null default now()
);

create or replace function public.set_row_updated_at() returns trigger
language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.set_row_updated_at();
drop trigger if exists private_touch on public.private_contacts;
create trigger private_touch before update on public.private_contacts for each row execute procedure public.set_row_updated_at();
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute procedure public.set_row_updated_at();
drop trigger if exists applications_touch on public.poet_applications;
create trigger applications_touch before update on public.poet_applications for each row execute procedure public.set_row_updated_at();

create or replace function public.new_user_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare n text;
begin
 n=trim(coalesce(new.raw_user_meta_data->>'display_name',''));
 if n='' then n='عضو جديد';end if;
 insert into public.profiles(id,display_name,role)
 values(new.id,left(n,80),'member') on conflict(id) do nothing;
 insert into public.private_contacts(user_id,whatsapp,whatsapp_visibility)
 values(new.id,nullif(left(coalesce(new.raw_user_meta_data->>'whatsapp',''),40),''),'private')
 on conflict(user_id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.new_user_profile();

alter table public.profiles enable row level security;
alter table public.private_contacts enable row level security;
alter table public.posts enable row level security;
alter table public.poet_applications enable row level security;
alter table public.review_log enable row level security;
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;

-- The public profile deliberately contains no email, password, or private WhatsApp.
drop policy if exists "Public profiles are visible" on public.profiles;
create policy "Public profiles are visible" on public.profiles for select to anon,authenticated using(true);
drop policy if exists "Members edit own safe profile fields" on public.profiles;
create policy "Members edit own safe profile fields" on public.profiles for update to authenticated
 using(id=(select auth.uid())) with check(id=(select auth.uid()));
-- Restrict which columns authenticated users can mutate: do not allow role escalation.
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to anon,authenticated;
grant update(display_name,pen_name,bio,country,city,website,avatar_url) on public.profiles to authenticated;

drop policy if exists "Private contacts owner select" on public.private_contacts;
create policy "Private contacts owner select" on public.private_contacts for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Private contacts owner insert" on public.private_contacts;
create policy "Private contacts owner insert" on public.private_contacts for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Private contacts owner update" on public.private_contacts;
create policy "Private contacts owner update" on public.private_contacts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.private_contacts from anon,authenticated;
grant select,insert,update(whatsapp,whatsapp_visibility) on public.private_contacts to authenticated;

-- Members can publish social posts, poets (and admin) can publish official poems.
drop policy if exists "Public sees published posts" on public.posts;
create policy "Public sees published posts" on public.posts for select to anon,authenticated
 using(publication_status='published' or author_id=(select auth.uid()));
drop policy if exists "Authors create permitted work" on public.posts;
create policy "Authors create permitted work" on public.posts for insert to authenticated
 with check(author_id=(select auth.uid()) and (
  kind='post' or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('poet','verified_poet','admin'))
 ));
drop policy if exists "Authors update permitted work" on public.posts;
create policy "Authors update permitted work" on public.posts for update to authenticated
 using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()) and (
  kind='post' or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('poet','verified_poet','admin'))
 ));
drop policy if exists "Authors delete their posts" on public.posts;
create policy "Authors delete their posts" on public.posts for delete to authenticated using(author_id=(select auth.uid()));
revoke all on public.posts from anon,authenticated;
grant select on public.posts to anon,authenticated;
grant insert,update,delete on public.posts to authenticated;

-- Applications are private between applicant and reviewers.
drop policy if exists "Applicants and reviewers read applications" on public.poet_applications;
create policy "Applicants and reviewers read applications" on public.poet_applications for select to authenticated
 using(applicant_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('reviewer','admin')));
drop policy if exists "Members submit applications" on public.poet_applications;
create policy "Members submit applications" on public.poet_applications for insert to authenticated
 with check(applicant_id=(select auth.uid()) and status='submitted');
revoke all on public.poet_applications from anon,authenticated;
grant select on public.poet_applications to authenticated;
grant insert(applicant_id,pen_name,biography,poetry_style,examples,reference_urls,status) on public.poet_applications to authenticated;
drop policy if exists "Reviewers can see review log" on public.review_log;
create policy "Reviewers can see review log" on public.review_log for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('reviewer','admin')));
revoke all on public.review_log from anon,authenticated;
grant select on public.review_log to authenticated;

-- Review workflow: reviewers only recommend; admin may grant/remove poet role.
create or replace function public.review_poet_application(application_uuid uuid,decision_input text,note_input text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid; actor_role public.user_role; applicant uuid;
begin
 actor=auth.uid();
 select role into actor_role from public.profiles where id=actor;
 if actor_role is null or actor_role not in('reviewer','admin') then raise exception 'Not authorized';end if;
 if note_input is null or btrim(note_input)='' then raise exception 'Review notes required';end if;
 if decision_input not in('recommend_approve','recommend_reject','approve','reject','needs_info') then raise exception 'Invalid decision';end if;
 if actor_role='reviewer' and decision_input in('approve','reject') then raise exception 'Only admin can make final decisions';end if;
 select applicant_id into applicant from public.poet_applications where id=application_uuid and status in('submitted','under_review','needs_info') for update;
 if applicant is null then raise exception 'Application not eligible for review';end if;
 insert into public.review_log(application_id,reviewer_id,decision,note) values(application_uuid,actor,decision_input,note_input);
 if decision_input in('recommend_approve','recommend_reject') then
  update public.poet_applications set status='under_review',reviewed_by=actor,review_note=note_input,reviewed_at=now() where id=application_uuid;
 elsif decision_input='needs_info' then
  update public.poet_applications set status='needs_info',reviewed_by=actor,review_note=note_input,reviewed_at=now() where id=application_uuid;
 elsif decision_input='approve' then
  update public.poet_applications set status='approved',reviewed_by=actor,review_note=note_input,reviewed_at=now() where id=application_uuid;
  update public.profiles set role='poet' where id=applicant and role='member';
 else
  update public.poet_applications set status='rejected',reviewed_by=actor,review_note=note_input,reviewed_at=now() where id=application_uuid;
 end if;
end $$;
revoke all on function public.review_poet_application(uuid,text,text) from public,anon;
grant execute on function public.review_poet_application(uuid,text,text) to authenticated;

drop policy if exists "Public follows read" on public.follows;
create policy "Public follows read" on public.follows for select to anon,authenticated using(true);
drop policy if exists "Follow as self" on public.follows;
create policy "Follow as self" on public.follows for insert to authenticated with check(follower_id=(select auth.uid()));
drop policy if exists "Unfollow as self" on public.follows;
create policy "Unfollow as self" on public.follows for delete to authenticated using(follower_id=(select auth.uid()));
revoke all on public.follows from anon,authenticated;
grant select on public.follows to anon,authenticated;
grant insert,delete on public.follows to authenticated;

drop policy if exists "Public likes read" on public.post_likes;
create policy "Public likes read" on public.post_likes for select to anon,authenticated using(true);
drop policy if exists "Like self" on public.post_likes;
create policy "Like self" on public.post_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id and p.publication_status='published'));
drop policy if exists "Unlike self" on public.post_likes;
create policy "Unlike self" on public.post_likes for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.post_likes from anon,authenticated;
grant select on public.post_likes to anon,authenticated;
grant insert,delete on public.post_likes to authenticated;

drop policy if exists "Bookmarks private" on public.bookmarks;
create policy "Bookmarks private" on public.bookmarks for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Bookmark self" on public.bookmarks;
create policy "Bookmark self" on public.bookmarks for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Remove bookmark self" on public.bookmarks;
create policy "Remove bookmark self" on public.bookmarks for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.bookmarks from anon,authenticated;
grant select,insert,delete on public.bookmarks to authenticated;

drop policy if exists "Public comments read" on public.comments;
create policy "Public comments read" on public.comments for select to anon,authenticated
 using(exists(select 1 from public.posts p where p.id=post_id and p.publication_status='published'));
drop policy if exists "Users comment on published posts" on public.comments;
create policy "Users comment on published posts" on public.comments for insert to authenticated
 with check(author_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id and p.publication_status='published'));
drop policy if exists "Authors remove own comment" on public.comments;
create policy "Authors remove own comment" on public.comments for delete to authenticated using(author_id=(select auth.uid()));
revoke all on public.comments from anon,authenticated;
grant select on public.comments to anon,authenticated;
grant insert,delete on public.comments to authenticated;
commit;

-- INITIAL ADMIN SETUP (manual, do not run before confirming the owner's UUID):
-- select id,email from auth.users order by created_at desc;
-- update public.profiles set role='admin' where id='CONFIRMED-OWNER-UUID';
-- Never expose that SQL Editor privilege through client forms or user metadata.
