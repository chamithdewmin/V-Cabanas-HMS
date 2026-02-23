-- Add settings_json column to settings table for storing additional settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT NULL;
