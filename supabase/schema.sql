-- ============================================================================
-- HOT ALLIANCE CRM — SUPABASE & POSTGRESQL PRODUCTION SCHEMA
-- ============================================================================
-- Paste this entire script into your Supabase SQL Editor and click "Run".
-- It creates all tables, foreign keys, indexes, and Row Level Security (RLS) policies.
-- ============================================================================

-- 1. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_rank TEXT NOT NULL DEFAULT 'R1',
    former_rank TEXT DEFAULT 'None',
    strikes INTEGER NOT NULL DEFAULT 0,
    communication TEXT NOT NULL DEFAULT 'Good',
    communication_note TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    vote_status TEXT NOT NULL DEFAULT 'NO RESPONSE',
    attendance_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STRIKES TABLE
CREATE TABLE IF NOT EXISTS public.strikes (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    reason TEXT NOT NULL,
    added_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMUNICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.communications (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    date TEXT NOT NULL,
    added_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Officer',
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CONTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.contributions (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    admin_username TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    target_name TEXT,
    count INTEGER DEFAULT 1,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================================================
-- PERFORMANCE INDEXES (Sub-millisecond query optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_strikes_member ON public.strikes(member_id);
CREATE INDEX IF NOT EXISTS idx_communications_member ON public.communications(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON public.contributions(admin_username);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables instant read/write for the authenticated CRM frontend anon key
-- ============================================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon key access (Client-side authenticated CRM)
DO $$
BEGIN
    -- members
    DROP POLICY IF EXISTS "Anon Full Access Members" ON public.members;
    CREATE POLICY "Anon Full Access Members" ON public.members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- events
    DROP POLICY IF EXISTS "Anon Full Access Events" ON public.events;
    CREATE POLICY "Anon Full Access Events" ON public.events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- attendance
    DROP POLICY IF EXISTS "Anon Full Access Attendance" ON public.attendance;
    CREATE POLICY "Anon Full Access Attendance" ON public.attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- strikes
    DROP POLICY IF EXISTS "Anon Full Access Strikes" ON public.strikes;
    CREATE POLICY "Anon Full Access Strikes" ON public.strikes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- communications
    DROP POLICY IF EXISTS "Anon Full Access Communications" ON public.communications;
    CREATE POLICY "Anon Full Access Communications" ON public.communications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- admins
    DROP POLICY IF EXISTS "Anon Full Access Admins" ON public.admins;
    CREATE POLICY "Anon Full Access Admins" ON public.admins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- contributions
    DROP POLICY IF EXISTS "Anon Full Access Contributions" ON public.contributions;
    CREATE POLICY "Anon Full Access Contributions" ON public.contributions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- settings
    DROP POLICY IF EXISTS "Anon Full Access Settings" ON public.settings;
    CREATE POLICY "Anon Full Access Settings" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- ============================================================================
-- SEED INITIAL DATA
-- ============================================================================
-- Default Master Admin: username "seoyoon", password "masterlogin", role "Leader"
INSERT INTO public.admins (id, username, password_hash, role, name)
VALUES (
    'adm-001',
    'seoyoon',
    '87998b3ca00bb39b4f971b3e8a4a35071060956973e8705f4ba5ceb9704e673f', -- SHA-256 for 'masterlogin'
    'Leader',
    'Seoyoon'
) ON CONFLICT (username) DO NOTHING;

-- Default Alliance Settings
INSERT INTO public.settings (key, value) VALUES
    ('inactivityWarningDays', '3'),
    ('inactivityInactiveDays', '7'),
    ('inactivityCriticalDays', '14'),
    ('allianceName', 'HOT'),
    ('allianceMotto', 'Strength Through Unity')
ON CONFLICT (key) DO NOTHING;
