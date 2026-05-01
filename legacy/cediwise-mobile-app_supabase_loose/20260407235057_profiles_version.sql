-- Add profile_version column to profiles table
-- This tracks schema evolution of the profile. Default 0 for existing profiles.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_version INTEGER DEFAULT 0;
