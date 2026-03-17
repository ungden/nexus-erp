-- Add new columns for ERP integration
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bonus_amount BIGINT DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS roadmap_node_id TEXT;
