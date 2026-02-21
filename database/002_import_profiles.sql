-- 002_import_profiles.sql
-- Creates import profile storage for bank/broker file format definitions

BEGIN;

SET search_path TO finance, public;

CREATE TABLE IF NOT EXISTS import_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name          text NOT NULL,
  source_file           text NOT NULL,
  sheet_name            text NOT NULL,
  header_row_index      integer NOT NULL CHECK (header_row_index >= 0),
  data_start_row_index  integer NOT NULL CHECK (data_start_row_index >= 0),
  column_mapping        jsonb NOT NULL,
  currency_mode         text NOT NULL CHECK (currency_mode IN ('column', 'fixed')),
  fixed_currency_code   currency_code,
  sample_rows           jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (currency_mode = 'column' AND fixed_currency_code IS NULL)
    OR
    (currency_mode = 'fixed' AND fixed_currency_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_import_profiles_created_at
  ON import_profiles(created_at DESC);

COMMIT;
