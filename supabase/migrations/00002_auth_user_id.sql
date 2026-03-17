-- ============================================================
-- Add user_id to ALL tables for multi-tenant data isolation
-- ============================================================

-- Add user_id column to all data tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE payables ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old id=1 constraint on finance_settings and roadmaps (now per-user)
ALTER TABLE finance_settings DROP CONSTRAINT IF EXISTS finance_settings_pkey;
ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS fid SERIAL;
ALTER TABLE finance_settings ADD PRIMARY KEY (fid) ;

ALTER TABLE roadmaps DROP CONSTRAINT IF EXISTS roadmaps_pkey;
ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS rid SERIAL;
ALTER TABLE roadmaps ADD PRIMARY KEY (rid);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_user ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_kpis_user ON kpis(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_user ON finance_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id);

-- Drop old permissive policies
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['employees','deals','tasks','kpis','payrolls','expenses','customers','partners','receivables','payables','finance_settings','roadmaps'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS allow_all_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_delete ON %I', tbl);
  END LOOP;
END $$;

-- Create user-scoped RLS policies
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['employees','deals','tasks','kpis','payrolls','expenses','customers','partners','receivables','payables','finance_settings','roadmaps'])
  LOOP
    EXECUTE format('CREATE POLICY user_select ON %I FOR SELECT USING (user_id = auth.uid())', tbl);
    EXECUTE format('CREATE POLICY user_insert ON %I FOR INSERT WITH CHECK (user_id = auth.uid())', tbl);
    EXECUTE format('CREATE POLICY user_update ON %I FOR UPDATE USING (user_id = auth.uid())', tbl);
    EXECUTE format('CREATE POLICY user_delete ON %I FOR DELETE USING (user_id = auth.uid())', tbl);
  END LOOP;
END $$;
