-- PROPOSAL ONLY / لم يطبق على قاعدة البيانات الحية
-- Supabase performance advisor 2026-11-05: 12 foreign keys without covering indexes.
-- Apply ONLY after owner approval, backup, and review in a controlled migration.
-- Do not execute automatically during site deployment.
-- These indexes may consume resources on large tables; schedule them appropriately.

create index if not exists comments_author_fk_idx on public.comments(author_id);
create index if not exists comments_post_fk_idx on public.comments(post_id);
create index if not exists diwan_poems_reviewed_by_fk_idx on public.diwan_poems(reviewed_by);
create index if not exists follows_followed_fk_idx on public.follows(followed_id);
create index if not exists literary_diwans_reviewed_by_fk_idx on public.literary_diwans(reviewed_by);
create index if not exists literary_draft_versions_author_fk_idx on public.literary_draft_versions(author_id);
create index if not exists literary_review_log_actor_fk_idx on public.literary_review_log(actor_id);
create index if not exists literary_review_log_owner_fk_idx on public.literary_review_log(owner_id);
create index if not exists poet_applications_reviewed_by_fk_idx on public.poet_applications(reviewed_by);
create index if not exists post_likes_user_fk_idx on public.post_likes(user_id);
create index if not exists review_log_application_fk_idx on public.review_log(application_id);
create index if not exists review_log_reviewer_fk_idx on public.review_log(reviewer_id);

-- After approved application, rerun Supabase security and performance advisors.
-- Do not drop the five reported unused indexes solely on an early-usage statistic.
