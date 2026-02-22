-- ============================================
-- Migration: Soft Delete & Automation Tables
-- ============================================

-- ==================== SOFT DELETE ====================

-- Add deleted_at column to tasks for soft delete
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_by column to track who deleted
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for faster queries on non-deleted tasks
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON tasks(id) WHERE deleted_at IS NULL;

-- ==================== AUTOMATION RULES ====================

-- Automation rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'task_created', 'task_moved', 'task_completed', 'due_date_approaching'
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL, -- 'move_to_column', 'assign_user', 'add_label', 'set_priority', 'send_notification'
  action_config JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_board ON automation_rules(board_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);

-- Enable RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view automation rules on their boards"
  ON automation_rules FOR SELECT
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can create automation rules on their boards"
  ON automation_rules FOR INSERT
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update automation rules on their boards"
  ON automation_rules FOR UPDATE
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete automation rules on their boards"
  ON automation_rules FOR DELETE
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

-- ==================== CUSTOM FIELDS ====================

-- Custom field definitions
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'
  options JSONB DEFAULT '[]', -- For select/multiselect options
  is_required BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom field values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, field_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_board ON custom_fields(board_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_task ON custom_field_values(task_id);

-- Enable RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom fields
CREATE POLICY "Users can view custom fields on their boards"
  ON custom_fields FOR SELECT
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage custom fields on their boards"
  ON custom_fields FOR ALL
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can view custom field values on accessible tasks"
  ON custom_field_values FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage custom field values on their tasks"
  ON custom_field_values FOR ALL
  USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

-- ==================== GRANT PERMISSIONS ====================

GRANT ALL ON automation_rules TO authenticated;
GRANT ALL ON custom_fields TO authenticated;
GRANT ALL ON custom_field_values TO authenticated;
