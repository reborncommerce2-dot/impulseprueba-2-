-- IMPULSE PHASE 2
-- Supabase/Postgres schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '', email text not null default '', photo text,
 ai_autonomy text not null default 'assistant' check (ai_autonomy in ('assistant','copilot','autonomous')),
 allow_ai_history boolean not null default true, allow_ai_memory boolean not null default true,
 ai_permissions jsonb not null default '{"auto_register":true,"create_objectives":false,"create_reminders":true,"change_home":false,"change_navigation":false,"external_actions":false}'::jsonb,
 plan text not null default 'free' check (plan in ('free','premium')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists public.areas (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, name text not null, icon text not null default '✦', description text,
 color text, active boolean not null default true, "order" integer not null default 0, is_custom boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.habits (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, area_id uuid references public.areas(id) on delete set null,
 name text not null, type text not null check(type in ('counter','quantity','time','boolean','scale','target')), unit text, target numeric, frequency text not null default 'diario', positive boolean not null default true, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.habit_logs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, habit_id uuid not null references public.habits(id) on delete cascade,
 date date not null, value numeric not null default 0, hour timestamptz, note text, origin text not null default 'manual', client_generated_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.objectives (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, area_id uuid references public.areas(id) on delete set null,
 title text not null, description text, target_date date, status text not null default 'active' check(status in ('active','completed','paused','archived')), progress numeric not null default 0 check(progress between 0 and 100),
 metrics jsonb not null default '[]'::jsonb, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.objective_items (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, objective_id uuid not null references public.objectives(id) on delete cascade,
 type text not null check(type in ('subobjective','stage','task')), parent_id uuid references public.objective_items(id) on delete cascade, title text not null,
 status text not null default 'pending' check(status in ('pending','done')), "order" integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.consumptions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, name text not null, unit text not null default 'unidad', frequency text,
 target numeric, "limit" numeric, cost_unit numeric, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.consumption_logs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, consumption_id uuid not null references public.consumptions(id) on delete cascade,
 quantity numeric not null default 1, date date not null, note text, expense_id uuid, client_generated_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.meals (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, name text not null, date date not null, quantity text, note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.water_logs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, amount_ml numeric not null, date date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.workouts (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, activity text not null, duration_min numeric not null, intensity numeric, date date not null, note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.incomes (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, source text not null, amount numeric not null, currency text not null default 'USD', date date not null, recurring boolean not null default false,
 recurrence_rule jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.expenses (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, description text not null, amount numeric not null, currency text not null default 'USD', category text not null default 'General', date date not null,
 recurring boolean not null default false, recurrence_rule jsonb, fixed boolean not null default false, frequent_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table public.consumption_logs drop constraint if exists consumption_logs_expense_id_fkey;
alter table public.consumption_logs add constraint consumption_logs_expense_id_fkey foreign key(expense_id) references public.expenses(id) on delete set null;
create table if not exists public.budgets (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, category text, amount numeric not null, currency text not null default 'USD', period text not null check(period in ('week','month')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.financial_goals (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, title text not null, target_amount numeric not null, currency text not null default 'USD', target_date date, saved_amount numeric not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.goal_contributions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, financial_goal_id uuid not null references public.financial_goals(id) on delete cascade, amount numeric not null, date date not null, note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.frequent_actions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, domain text not null, label text not null, payload jsonb not null default '{}'::jsonb, uses integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.reminders (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, title text not null, type text not null check(type in ('manual','habit','conditional','smart')),
 due_at timestamptz not null, repeat text, condition text, priority text not null default 'normal' check(priority in ('low','normal','high')), status text not null default 'active' check(status in ('active','completed','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.ai_conversations (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, title text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.ai_messages (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, conversation_id uuid references public.ai_conversations(id) on delete cascade, role text not null, content text not null, tool_calls jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.ai_memory (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, fact text not null, source text not null default 'explicit', confidence numeric, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.home_layout (
 user_id uuid primary key references auth.users(id) on delete cascade, modules jsonb not null default '["score","today","habits","objectives","recent"]'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.navigation_layout (
 user_id uuid primary key references auth.users(id) on delete cascade, tabs jsonb not null default '["home","objectives","habits","consumptions","progress"]'::jsonb,
 menu jsonb not null default '["finance","food","exercise","reminders","account"]'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.score_snapshots (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, date date not null, score numeric not null, breakdown jsonb not null default '{}'::jsonb, factors jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.file_assets (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, storage_path text not null, mime_type text, size_bytes bigint, entity_type text, entity_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.subscriptions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, plan text not null default 'free', status text not null default 'active', source text, provider text, product_id text, store_transaction_id text, started_at timestamptz, renews_at timestamptz, cancelled_at timestamptz, expires_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.devices (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, name text, platform text, last_seen_at timestamptz not null default now(), refresh_token_hash text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.analytics_events (
 id uuid primary key, user_id uuid references auth.users(id) on delete cascade, event text not null, screen text, properties jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_areas_user_updated on public.areas(user_id,updated_at);
create index if not exists idx_habits_user_updated on public.habits(user_id,updated_at);
create index if not exists idx_habit_logs_user_date on public.habit_logs(user_id,date,updated_at);
create index if not exists idx_objectives_user_updated on public.objectives(user_id,updated_at);
create index if not exists idx_consumption_logs_user_date on public.consumption_logs(user_id,date,updated_at);
create index if not exists idx_meals_user_date on public.meals(user_id,date,updated_at);
create index if not exists idx_water_logs_user_date on public.water_logs(user_id,date,updated_at);
create index if not exists idx_workouts_user_date on public.workouts(user_id,date,updated_at);
create index if not exists idx_expenses_user_date on public.expenses(user_id,date,updated_at);
create index if not exists idx_ai_memory_user_updated on public.ai_memory(user_id,updated_at);

DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['profiles','areas','habits','habit_logs','objectives','objective_items','consumptions','consumption_logs','meals','water_logs','workouts','incomes','expenses','budgets','financial_goals','goal_contributions','frequent_actions','reminders','ai_conversations','ai_messages','ai_memory','score_snapshots','file_assets','subscriptions','devices'] LOOP
 EXECUTE format('drop trigger if exists trg_%s_updated on public.%I',t,t);
 EXECUTE format('create trigger trg_%s_updated before update on public.%I for each row execute function public.set_updated_at()',t,t);
END LOOP; END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_layout ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['areas','habits','habit_logs','objectives','objective_items','consumptions','consumption_logs','meals','water_logs','workouts','incomes','expenses','budgets','financial_goals','goal_contributions','frequent_actions','reminders','ai_conversations','ai_messages','ai_memory','score_snapshots','file_assets','subscriptions','devices','analytics_events'] LOOP
 EXECUTE format('alter table public.%I enable row level security',t);
 EXECUTE format('drop policy if exists "owner_select" on public.%I',t);
 EXECUTE format('drop policy if exists "owner_insert" on public.%I',t);
 EXECUTE format('drop policy if exists "owner_update" on public.%I',t);
 EXECUTE format('drop policy if exists "owner_delete" on public.%I',t);
 IF t='profiles' THEN CONTINUE; END IF;
 EXECUTE format('create policy "owner_select" on public.%I for select using (user_id=auth.uid())',t);
 EXECUTE format('create policy "owner_insert" on public.%I for insert with check (user_id=auth.uid())',t);
 EXECUTE format('create policy "owner_update" on public.%I for update using (user_id=auth.uid()) with check (user_id=auth.uid())',t);
 EXECUTE format('create policy "owner_delete" on public.%I for delete using (user_id=auth.uid())',t);
END LOOP; END $$;
DROP POLICY IF EXISTS "profile_owner_select" ON public.profiles;
DROP POLICY IF EXISTS "profile_owner_insert" ON public.profiles;
DROP POLICY IF EXISTS "profile_owner_update" ON public.profiles;
CREATE POLICY "profile_owner_select" ON public.profiles FOR SELECT USING (id=auth.uid());
CREATE POLICY "profile_owner_insert" ON public.profiles FOR INSERT WITH CHECK (id=auth.uid());
CREATE POLICY "profile_owner_update" ON public.profiles FOR UPDATE USING (id=auth.uid()) WITH CHECK (id=auth.uid());

-- Private storage bucket and per-user folder policy.
insert into storage.buckets(id,name,public) values ('impulse-files','impulse-files',false) on conflict(id) do update set public=false;
DROP POLICY IF EXISTS "impulse_files_select" ON storage.objects;
DROP POLICY IF EXISTS "impulse_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "impulse_files_update" ON storage.objects;
DROP POLICY IF EXISTS "impulse_files_delete" ON storage.objects;
CREATE POLICY "impulse_files_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='impulse-files' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "impulse_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='impulse-files' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "impulse_files_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='impulse-files' AND (storage.foldername(name))[1]=auth.uid()::text) WITH CHECK (bucket_id='impulse-files' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "impulse_files_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='impulse-files' AND (storage.foldername(name))[1]=auth.uid()::text);

-- Create initial profile/layout rows after signup.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,new.phone,'')) on conflict(id) do nothing;
 insert into public.home_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.navigation_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Phase 3: AI agent, granular autonomy and auditable actions.
create table if not exists public.ai_settings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 autonomy text not null default 'assistant' check (autonomy in ('assistant','copilot','autonomous')),
 allow_auto_register boolean not null default false,
 allow_create_objectives boolean not null default false,
 allow_create_reminders boolean not null default true,
 allow_change_home boolean not null default false,
 allow_change_navigation boolean not null default false,
 allow_external_actions boolean not null default false,
 allow_history boolean not null default true,
 allow_memory boolean not null default true,
 voice_enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.ai_action_audit (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid references public.ai_conversations(id) on delete set null,
 message_id uuid references public.ai_messages(id) on delete set null,
 tool_name text not null,
 arguments jsonb not null default '{}'::jsonb,
 result jsonb not null default '{}'::jsonb,
 status text not null check(status in ('executed','proposed','rejected','failed')),
 created_at timestamptz not null default now()
);

create index if not exists idx_ai_messages_user_conversation on public.ai_messages(user_id,conversation_id,created_at);
create index if not exists idx_ai_audit_user_created on public.ai_action_audit(user_id,created_at desc);
create index if not exists idx_ai_settings_user on public.ai_settings(user_id);

alter table public.ai_settings enable row level security;
alter table public.ai_action_audit enable row level security;
drop policy if exists "ai_settings_owner_select" on public.ai_settings;
drop policy if exists "ai_settings_owner_insert" on public.ai_settings;
drop policy if exists "ai_settings_owner_update" on public.ai_settings;
drop policy if exists "ai_audit_owner_select" on public.ai_action_audit;
create policy "ai_settings_owner_select" on public.ai_settings for select using (user_id=auth.uid());
create policy "ai_settings_owner_insert" on public.ai_settings for insert with check (user_id=auth.uid());
create policy "ai_settings_owner_update" on public.ai_settings for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "ai_audit_owner_select" on public.ai_action_audit for select using (user_id=auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,new.phone,'')) on conflict(id) do nothing;
 insert into public.home_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.navigation_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.ai_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end; $$;

drop trigger if exists trg_ai_settings_updated on public.ai_settings;
create trigger trg_ai_settings_updated before update on public.ai_settings for each row execute function public.set_updated_at();
drop policy if exists "ai_audit_owner_insert" on public.ai_action_audit;
create policy "ai_audit_owner_insert" on public.ai_action_audit for insert with check (user_id=auth.uid());

-- PHASE 4: notifications, frequent actions, admin metrics and subscription scaffolding.
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null, p256dh text, auth text, platform text not null default 'web', enabled boolean not null default true,
 last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id, endpoint)
);
create table if not exists public.notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true, quiet_start time not null default '22:00', quiet_end time not null default '08:00',
 habit boolean not null default true, reminder boolean not null default true, ai boolean not null default true, system boolean not null default true,
 max_per_day integer not null default 5 check(max_per_day between 0 and 50), updated_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id,enabled);
create index if not exists idx_analytics_events_event on public.analytics_events(event,created_at);

alter table public.push_subscriptions enable row level security;
drop policy if exists "owner_select" on public.push_subscriptions;
drop policy if exists "owner_insert" on public.push_subscriptions;
drop policy if exists "owner_update" on public.push_subscriptions;
drop policy if exists "owner_delete" on public.push_subscriptions;
create policy "owner_select" on public.push_subscriptions for select using(user_id=auth.uid());
create policy "owner_insert" on public.push_subscriptions for insert with check(user_id=auth.uid());
create policy "owner_update" on public.push_subscriptions for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "owner_delete" on public.push_subscriptions for delete using(user_id=auth.uid());
alter table public.notification_preferences enable row level security;
drop policy if exists "notification_owner_select" on public.notification_preferences;
drop policy if exists "notification_owner_insert" on public.notification_preferences;
drop policy if exists "notification_owner_update" on public.notification_preferences;
create policy "notification_owner_select" on public.notification_preferences for select using(user_id=auth.uid());
create policy "notification_owner_insert" on public.notification_preferences for insert with check(user_id=auth.uid());
create policy "notification_owner_update" on public.notification_preferences for update using(user_id=auth.uid()) with check(user_id=auth.uid());

drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated before update on public.push_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists trg_notification_preferences_updated on public.notification_preferences;
create trigger trg_notification_preferences_updated before update on public.notification_preferences for each row execute function public.set_updated_at();

-- Admin metrics expose aggregates only; never personal records.
create or replace function public.admin_metrics() returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
 if coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' then raise exception 'not authorized'; end if;
 select jsonb_build_object(
  'users',(select count(*) from auth.users),
  'activeUsers',(select count(distinct user_id) from analytics_events where created_at >= now()-interval '30 days'),
  'newUsers',(select count(*) from auth.users where created_at >= now()-interval '30 days'),
  'retention7d',(select coalesce(round(100.0*count(distinct case when e2.user_id is not null then e.user_id end)/nullif(count(distinct e.user_id),0),1),0) from analytics_events e left join analytics_events e2 on e2.user_id=e.user_id and e2.created_at between e.created_at+interval '7 days' and e.created_at+interval '8 days' where e.event='session_started' and e.created_at >= now()-interval '37 days'),
  'aiUsage',(select count(*) from analytics_events where event like 'ai_%'),
  'voiceUsage',(select count(*) from analytics_events where event like 'voice_%'),
  'habitsCreated',(select count(*) from habits),
  'objectivesCreated',(select count(*) from objectives),
  'objectivesCompleted',(select count(*) from objectives where status='completed'),
  'reminders',(select count(*) from reminders),
  'errors',(select count(*) from analytics_events where event like '%error%'),
  'subscriptions',(select count(*) from subscriptions where status='active'),
  'cancelledSubscriptions',(select count(*) from subscriptions where status='cancelled'),
  'storageBytes',(select coalesce(sum(size_bytes),0) from file_assets where deleted_at is null),
  'freeUsers',(select count(*) from profiles where plan='free' and deleted_at is null),
  'premiumUsers',(select count(*) from profiles where plan='premium' and deleted_at is null),
  'topFeatures',coalesce((select jsonb_agg(x) from (select event,count(*)::int as count from analytics_events group by event order by count(*) desc limit 10)x),'[]'::jsonb)
 ) into result;
 return result;
end; $$;
revoke all on function public.admin_metrics() from public;
grant execute on function public.admin_metrics() to authenticated;

-- New users start with notification defaults and a Free subscription row.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,new.phone,'')) on conflict(id) do nothing;
 insert into public.home_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.navigation_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.ai_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.notification_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.subscriptions(user_id,plan,status,source,started_at) values(new.id,'free','active','system',now()) on conflict do nothing;
 return new;
end; $$;

-- Destructive account deletion is only available through the authenticated Edge Function.


alter table public.subscriptions add column if not exists provider text;
alter table public.subscriptions add column if not exists product_id text;
alter table public.subscriptions add column if not exists store_transaction_id text;
create unique index if not exists subscriptions_user_active_unique on public.subscriptions(user_id) where status='active' and deleted_at is null;

-- PHASE 5: advanced meal planning, proactive AI, personalities, gamification and RevenueCat-ready billing.
create table if not exists public.ai_persona_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 persona text not null default 'balanced' check(persona in ('balanced','friend','coach','mentor','direct','motivator','analytical','professional')),
 intensity integer not null default 3 check(intensity between 1 and 5),
 updated_at timestamptz not null default now()
);
create table if not exists public.ai_proactive_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 frequency text not null default 'daily' check(frequency in ('off','low','daily','high')),
 interruption text not null default 'normal' check(interruption in ('quiet','normal','important_only')),
 habit_gaps boolean not null default true,
 finance_changes boolean not null default true,
 goal_deadlines boolean not null default true,
 positive_trends boolean not null default true,
 last_generated_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.meal_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, start_date date not null, end_date date not null, target_notes text, status text not null default 'active' check(status in ('draft','active','completed','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.meal_plan_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 meal_plan_id uuid not null references public.meal_plans(id) on delete cascade, date date not null,
 meal_type text not null check(meal_type in ('breakfast','lunch','dinner','snack','other')), title text not null,
 description text, servings numeric, estimated_cost numeric, calories numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
 completed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.achievements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 code text not null, title text not null, description text, unlocked_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb,
 unique(user_id,code)
);
create table if not exists public.ai_proactive_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, title text not null, body text not null, priority integer not null default 1 check(priority between 1 and 5), source jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','sent','dismissed','acted')), created_at timestamptz not null default now(), acted_at timestamptz
);

alter table public.ai_persona_settings enable row level security;
alter table public.ai_proactive_settings enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.achievements enable row level security;
alter table public.ai_proactive_events enable row level security;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ai_persona_settings','ai_proactive_settings','meal_plans','meal_plan_items','achievements','ai_proactive_events'] LOOP
  EXECUTE format('drop policy if exists "owner_select" on public.%I',t);
  EXECUTE format('drop policy if exists "owner_insert" on public.%I',t);
  EXECUTE format('drop policy if exists "owner_update" on public.%I',t);
  EXECUTE format('drop policy if exists "owner_delete" on public.%I',t);
  EXECUTE format('create policy "owner_select" on public.%I for select using(user_id=auth.uid())',t);
  EXECUTE format('create policy "owner_insert" on public.%I for insert with check(user_id=auth.uid())',t);
  EXECUTE format('create policy "owner_update" on public.%I for update using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
  EXECUTE format('create policy "owner_delete" on public.%I for delete using(user_id=auth.uid())',t);
  EXECUTE format('drop trigger if exists trg_%s_updated on public.%I',t,t);
  IF t NOT IN ('achievements','ai_proactive_events') THEN EXECUTE format('create trigger trg_%s_updated before update on public.%I for each row execute function public.set_updated_at()',t,t); END IF;
 END LOOP;
END $$;
create index if not exists idx_meal_plan_items_plan_date on public.meal_plan_items(meal_plan_id,date);
create index if not exists idx_proactive_events_user_status on public.ai_proactive_events(user_id,status,created_at desc);

-- Seed phase 5 settings for every existing account.
insert into public.ai_persona_settings(user_id) select id from auth.users on conflict(user_id) do nothing;
insert into public.ai_proactive_settings(user_id) select id from auth.users on conflict(user_id) do nothing;

-- Keep future accounts initialized with phase 5 settings.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,new.phone,'')) on conflict(id) do nothing;
 insert into public.home_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.navigation_layout(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.ai_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.notification_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.subscriptions(user_id,plan,status,source,started_at) values(new.id,'free','active','system',now()) on conflict do nothing;
 insert into public.ai_persona_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.ai_proactive_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end; $$;

-- Server-side proactive generation is rate-limited by settings; clients can read their own queue.
