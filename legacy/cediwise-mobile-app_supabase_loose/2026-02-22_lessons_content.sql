-- Migration: Add content column to lessons table
-- Date: 2026-02-22
-- Stores structured lesson content (schema_version + sections) as jsonb.
-- Used by dashboard for management and mobile app for display (with bundled fallback).

alter table public.lessons
  add column if not exists content jsonb;

comment on column public.lessons.content is 'Structured lesson content: { schema_version, sections: [...] }. Same format as bundledLessons.json.';
