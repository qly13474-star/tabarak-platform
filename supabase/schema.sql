-- ============================================================================
-- منصة الأستاذة تبارك الأزيرجاوي — Supabase PostgreSQL Schema & RLS Policies
-- شغّل هذا الملف مرة واحدة داخل Supabase SQL Editor لمشروعك:
-- https://ffyoyacdkljvzcctoiwg.supabase.co
-- ============================================================================

-- 1. Users Table (Students, Super Admin, and Sub-Admins/Moderators)
create table if not exists public.users (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  username text unique,
  parent_phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  is_super_admin boolean not null default false,
  admin_role_title text,
  permissions text[] not null default '{}',
  track text not null default 'intermediate',
  sub_stage text not null default 'عام',
  branch text,
  department text,
  device_id text,
  is_active boolean not null default true,
  enrolled_course_ids text[] not null default '{}',
  unlocked_lesson_ids text[] not null default '{}',
  subscription_due_date date,
  created_at timestamptz not null default now(),
  last_login_at text
);

create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_users_role on public.users(role);

-- 2. Dynamic Stages / Tracks Table
create table if not exists public.tracks (
  id text primary key,
  label text not null,
  short_label text not null,
  description text default '',
  sub_stages text[] not null default '{}',
  branches text[],
  departments text[],
  subjects text[] not null default '{}',
  specialization_label text,
  cover_image text default 'auto',
  created_at timestamptz not null default now()
);

-- 3. Courses Table (with Lessons, Notes, Quizzes JSONB)
create table if not exists public.courses (
  id text primary key,
  title text not null,
  subtitle text default '',
  track text not null,
  sub_stage text not null,
  branch text,
  subject text,
  instructor text not null default 'الأستاذة تبارك الأزيرجاوي',
  cover_image text default 'auto',
  description text default '',
  total_hours text default '0 ساعة',
  price_iqd integer not null default 0,
  lessons jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  quizzes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_courses_track on public.courses(track);

-- 4. Store Items (Printed Booklets & Final Predictions)
create table if not exists public.store_items (
  id text primary key,
  title text not null,
  subject text not null,
  track text not null,
  sub_stage text not null,
  branch text,
  category text not null default 'booklet' check (category in ('booklet', 'predictions')),
  description text default '',
  price_iqd integer not null default 0,
  cover_image text default 'auto',
  pages_info text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Store Orders Table
create table if not exists public.store_orders (
  id text primary key,
  receipt_number text not null unique,
  item_id text not null,
  item_title text not null,
  subject text not null,
  track_label text not null,
  sub_stage text not null,
  student_id text references public.users(id) on delete set null,
  student_name text not null,
  phone text not null,
  governorate text not null,
  address text not null,
  quantity integer not null default 1,
  unit_price_iqd integer not null default 0,
  delivery_fee_iqd integer not null default 0,
  total_iqd integer not null default 0,
  status text not null default 'preparing' check (status in ('preparing', 'shipped', 'delivered')),
  created_at text not null,
  updated_at text
);

create index if not exists idx_store_orders_student on public.store_orders(student_id);

-- 6. Attendance Records Table
create table if not exists public.attendance_records (
  id text primary key,
  student_id text not null references public.users(id) on delete cascade,
  source text not null check (source in ('live_broadcast', 'course_quiz', 'live_quiz_chat')),
  session_key text not null,
  title text not null,
  date_iso date not null default current_date,
  timestamp text not null,
  unique(student_id, source, session_key)
);

create index if not exists idx_attendance_student on public.attendance_records(student_id);

-- ============================================================================
-- Helper Security Functions & Row Level Security (RLS)
-- ============================================================================

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and role = 'admin'
      and is_super_admin = true
      and is_active = true
  );
$$;

alter table public.users enable row level security;
alter table public.tracks enable row level security;
alter table public.courses enable row level security;
alter table public.store_items enable row level security;
alter table public.store_orders enable row level security;
alter table public.attendance_records enable row level security;

-- Users policies: users read own profile; admins read all; only super admin manages admins
create policy "users_select_self_or_admin"
  on public.users for select
  using (auth_user_id = auth.uid() or public.is_platform_admin());

create policy "users_insert_self_or_super_admin"
  on public.users for insert
  with check (
    (auth_user_id = auth.uid() and role = 'student' and is_super_admin = false)
    or public.is_platform_super_admin()
  );

-- Prevent non-admin users from modifying privileged columns via direct REST API calls
create or replace function public.prevent_student_privilege_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.is_platform_admin() then
    if new.role is distinct from old.role
      or new.is_super_admin is distinct from old.is_super_admin
      or new.permissions is distinct from old.permissions
      or new.is_active is distinct from old.is_active
      or new.enrolled_course_ids is distinct from old.enrolled_course_ids
      or new.unlocked_lesson_ids is distinct from old.unlocked_lesson_ids
      or new.subscription_due_date is distinct from old.subscription_due_date
    then
      raise exception 'Insufficient privileges to modify protected account fields.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_student_privilege_escalation on public.users;
create trigger trg_prevent_student_privilege_escalation
  before update on public.users
  for each row
  execute function public.prevent_student_privilege_escalation();

create policy "users_update_self_or_admin"
  on public.users for update
  using (auth_user_id = auth.uid() or public.is_platform_admin())
  with check (
    public.is_platform_admin()
    or (auth_user_id = auth.uid() and role = 'student' and is_super_admin = false)
  );

create policy "users_delete_super_admin_only"
  on public.users for delete
  using (public.is_platform_super_admin());

-- Courses & Tracks & Store Items: readable by authenticated users, writable by admins
create policy "tracks_read_all" on public.tracks for select using (true);
create policy "tracks_admin_write" on public.tracks for all using (public.is_platform_admin());

create policy "courses_read_all" on public.courses for select using (true);
create policy "courses_admin_write" on public.courses for all using (public.is_platform_admin());

create policy "store_items_read_all" on public.store_items for select using (true);
create policy "store_items_admin_write" on public.store_items for all using (public.is_platform_admin());

-- Store Orders: students see/create their own orders; admins manage all
create policy "store_orders_select"
  on public.store_orders for select
  using (
    public.is_platform_admin()
    or student_id in (select id from public.users where auth_user_id = auth.uid())
  );

create policy "store_orders_insert"
  on public.store_orders for insert
  with check (
    public.is_platform_admin()
    or (
      auth.uid() is not null
      and student_id in (select id from public.users where auth_user_id = auth.uid())
    )
  );

create policy "store_orders_admin_update"
  on public.store_orders for update
  using (public.is_platform_admin());

-- Attendance Records: students see/log their own attendance; admins see all
create policy "attendance_select"
  on public.attendance_records for select
  using (
    public.is_platform_admin()
    or student_id in (select id from public.users where auth_user_id = auth.uid())
  );

create policy "attendance_insert"
  on public.attendance_records for insert
  with check (
    public.is_platform_admin()
    or student_id in (select id from public.users where auth_user_id = auth.uid())
  );
