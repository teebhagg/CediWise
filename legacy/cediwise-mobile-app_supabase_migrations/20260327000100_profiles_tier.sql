-- Migration: Add tier and trial columns to profiles
-- Date: 2026-03-27 00:01:00
-- Supports tier gating and trial system for free/budget/sme plans

alter table public.profiles
  add column if not exists tier text not null default 'free'
    check (tier in ('free', 'budget', 'sme'));

alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

alter table public.profiles
  add column if not exists trial_granted boolean not null default false;
