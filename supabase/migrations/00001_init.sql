-- NexusERP Database Schema

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Đang làm việc',
  join_date TEXT,
  base_salary BIGINT DEFAULT 0,
  manager_id INT
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  company TEXT,
  amount BIGINT DEFAULT 0,
  stage TEXT DEFAULT 'Tiếp cận',
  date TEXT,
  customer_id TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  assignee_id INT,
  due_date TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  department TEXT
);

CREATE TABLE IF NOT EXISTS kpis (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  target BIGINT DEFAULT 0,
  current BIGINT DEFAULT 0,
  progress INT DEFAULT 0,
  status TEXT DEFAULT 'on-track',
  department TEXT
);

CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  employee_id INT,
  month TEXT,
  base BIGINT DEFAULT 0,
  commission BIGINT DEFAULT 0,
  kpi_bonus BIGINT DEFAULT 0,
  deduction BIGINT DEFAULT 0,
  total BIGINT DEFAULT 0,
  status TEXT DEFAULT 'Chờ duyệt'
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  amount BIGINT DEFAULT 0,
  category TEXT,
  date TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'B2B',
  company TEXT,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Đối tác',
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS receivables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT,
  deal_id TEXT,
  amount BIGINT DEFAULT 0,
  paid_amount BIGINT DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Chưa thu'
);

CREATE TABLE IF NOT EXISTS payables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id TEXT,
  amount BIGINT DEFAULT 0,
  paid_amount BIGINT DEFAULT 0,
  due_date TEXT,
  description TEXT,
  status TEXT DEFAULT 'Chưa trả'
);

CREATE TABLE IF NOT EXISTS finance_settings (
  id INT PRIMARY KEY DEFAULT 1,
  target_revenue BIGINT DEFAULT 1000000000,
  alloc_cogs INT DEFAULT 30,
  alloc_hr INT DEFAULT 25,
  alloc_mkt INT DEFAULT 15,
  alloc_ops INT DEFAULT 10,
  alloc_profit INT DEFAULT 20
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for demo — no auth)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['employees','deals','tasks','kpis','payrolls','expenses','customers','partners','receivables','payables','finance_settings','roadmaps'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS allow_all_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_delete ON %I', tbl);
    EXECUTE format('CREATE POLICY allow_all_select ON %I FOR SELECT USING (true)', tbl);
    EXECUTE format('CREATE POLICY allow_all_insert ON %I FOR INSERT WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY allow_all_update ON %I FOR UPDATE USING (true)', tbl);
    EXECUTE format('CREATE POLICY allow_all_delete ON %I FOR DELETE USING (true)', tbl);
  END LOOP;
END $$;

-- Default finance
INSERT INTO finance_settings (id, target_revenue, alloc_cogs, alloc_hr, alloc_mkt, alloc_ops, alloc_profit)
VALUES (1, 1000000000, 30, 25, 15, 10, 20)
ON CONFLICT (id) DO NOTHING;
