-- Add profile_avatar column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS profile_avatar TEXT DEFAULT NULL;
