-- 001_finance_schema.sql
-- PostgreSQL 14+ recommended

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS finance;
SET search_path TO finance, public;

-- =========
-- Types
-- =========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
    CREATE DOMAIN currency_code AS char(3)
      CHECK (VALUE ~ '^[A-Z]{3}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_ledger_kind') THEN
    CREATE TYPE account_ledger_kind AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM (
      'brokerage','bank','cash_wallet','crypto_wallet','pension','credit_card','loan','property','other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instrument_kind') THEN
    CREATE TYPE instrument_kind AS ENUM (
      'stock','etf','mutual_fund','bond','crypto','cash','property','private_equity','commodity','option','other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM (
      'trade_buy','trade_sell','dividend','interest','transfer','deposit','withdrawal',
      'fee','tax','expense','income','corporate_action','adjustment'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('draft','confirmed','voided');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posting_kind') THEN
    CREATE TYPE posting_kind AS ENUM ('principal','fee','tax','withholding','fx','adjustment');
  END IF;
END $$;

-- =========
-- Core entities
-- =========
CREATE TABLE IF NOT EXISTS owners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES owners(id),
  name              text NOT NULL,
  ledger_kind       account_ledger_kind NOT NULL, -- asset/liability/income/expense/equity
  type              account_type NOT NULL,
  base_currency     currency_code NOT NULL,
  institution       text,
  is_taxable        boolean NOT NULL DEFAULT true,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, name)
);

CREATE TABLE IF NOT EXISTS instruments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              instrument_kind NOT NULL,
  symbol            text,     -- e.g. AAPL / BTC
  ticker            text,     -- optional exchange ticker
  isin              text,
  name              text NOT NULL,
  quote_currency    currency_code NOT NULL,
  country_code      char(2),
  tax_category      text,
  price_source      text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_instruments_isin_not_null
  ON instruments(isin) WHERE isin IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_instruments_symbol_currency
  ON instruments(symbol, quote_currency) WHERE symbol IS NOT NULL;

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at       timestamptz NOT NULL,
  effective_date    date NOT NULL,
  type              transaction_type NOT NULL,
  status            transaction_status NOT NULL DEFAULT 'draft',
  primary_account_id uuid REFERENCES accounts(id),
  description       text,
  external_id       text,         -- for import dedupe
  tags              text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_transactions_external_id
  ON ledger_transactions(external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ledger_transactions_effective_date
  ON ledger_transactions(effective_date);

CREATE TABLE IF NOT EXISTS postings (
  id                bigserial PRIMARY KEY,
  transaction_id    uuid NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  line_no           smallint NOT NULL,
  account_id        uuid NOT NULL REFERENCES accounts(id),
  instrument_id     uuid REFERENCES instruments(id),
  posting_kind      posting_kind NOT NULL DEFAULT 'principal',
  quantity          numeric(30,12) NOT NULL DEFAULT 0, -- units, 0 for pure cash lines
  amount            numeric(30,8) NOT NULL,            -- signed in currency_code
  currency_code     currency_code NOT NULL,
  amount_home       numeric(30,8) NOT NULL,            -- signed in your reporting/home currency
  fx_rate           numeric(20,10),                    -- currency_code -> home
  memo              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, line_no),
  CHECK ((instrument_id IS NULL AND quantity = 0) OR (instrument_id IS NOT NULL)),
  CHECK (fx_rate IS NULL OR fx_rate > 0)
);

CREATE INDEX IF NOT EXISTS ix_postings_transaction_id ON postings(transaction_id);
CREATE INDEX IF NOT EXISTS ix_postings_account_id ON postings(account_id);
CREATE INDEX IF NOT EXISTS ix_postings_instrument_id ON postings(instrument_id);

-- =========
-- Market data
-- =========
CREATE TABLE IF NOT EXISTS fx_rates (
  rate_date         date NOT NULL,
  from_currency     currency_code NOT NULL,
  to_currency       currency_code NOT NULL,
  rate              numeric(20,10) NOT NULL CHECK (rate > 0),
  source            text NOT NULL,
  loaded_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rate_date, from_currency, to_currency, source)
);

CREATE TABLE IF NOT EXISTS instrument_prices (
  price_date        date NOT NULL,
  instrument_id     uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  currency_code     currency_code NOT NULL,
  close_price       numeric(30,10) NOT NULL CHECK (close_price >= 0),
  source            text NOT NULL,
  loaded_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (price_date, instrument_id, currency_code, source)
);

-- =========
-- Snapshot caches (derived, recomputable)
-- =========
CREATE TABLE IF NOT EXISTS daily_position_snapshot (
  snapshot_date       date NOT NULL,
  account_id          uuid NOT NULL REFERENCES accounts(id),
  instrument_id       uuid REFERENCES instruments(id),
  currency_code       currency_code NOT NULL,
  quantity            numeric(30,12) NOT NULL,
  cost_basis_home     numeric(30,8) NOT NULL,
  market_price        numeric(30,10),
  market_value_home   numeric(30,8),
  unrealized_pnl_home numeric(30,8),
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, account_id, instrument_id, currency_code)
);

CREATE TABLE IF NOT EXISTS daily_net_worth_snapshot (
  snapshot_date       date NOT NULL,
  owner_id            uuid NOT NULL REFERENCES owners(id),
  assets_home         numeric(30,8) NOT NULL,
  liabilities_home    numeric(30,8) NOT NULL,
  net_worth_home      numeric(30,8) NOT NULL,
  invested_home       numeric(30,8) NOT NULL,
  cash_home           numeric(30,8) NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, owner_id)
);

-- =========
-- Derived views
-- =========

-- Current account balances (home currency), all confirmed transactions
CREATE OR REPLACE VIEW v_account_balance_home AS
SELECT
  p.account_id,
  SUM(p.amount_home) AS balance_home
FROM postings p
JOIN ledger_transactions t ON t.id = p.transaction_id
WHERE t.status = 'confirmed'
GROUP BY p.account_id;

-- Current open positions by account/instrument
CREATE OR REPLACE VIEW v_open_positions AS
SELECT
  p.account_id,
  p.instrument_id,
  SUM(p.quantity) AS quantity
FROM postings p
JOIN ledger_transactions t ON t.id = p.transaction_id
WHERE t.status = 'confirmed'
  AND p.instrument_id IS NOT NULL
GROUP BY p.account_id, p.instrument_id
HAVING SUM(p.quantity) <> 0;

-- =========
-- Integrity + immutability
-- =========

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_ledger_transactions_set_updated_at ON ledger_transactions;
CREATE TRIGGER tr_ledger_transactions_set_updated_at
BEFORE UPDATE ON ledger_transactions
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Prevent mutation of confirmed transactions/postings (append corrections instead)
CREATE OR REPLACE FUNCTION trg_block_confirmed_transaction_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    RAISE EXCEPTION 'Confirmed transactions are immutable. Add a correction transaction instead.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
    RAISE EXCEPTION 'Confirmed transactions are immutable. Add a correction transaction instead.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_block_confirmed_transaction_changes ON ledger_transactions;
CREATE TRIGGER tr_block_confirmed_transaction_changes
BEFORE UPDATE OR DELETE ON ledger_transactions
FOR EACH ROW EXECUTE FUNCTION trg_block_confirmed_transaction_changes();

CREATE OR REPLACE FUNCTION trg_block_posting_changes_for_confirmed_txn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_txn_id uuid;
  v_status transaction_status;
BEGIN
  v_txn_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT status INTO v_status
  FROM ledger_transactions
  WHERE id = v_txn_id;

  IF v_status = 'confirmed' THEN
    RAISE EXCEPTION 'Postings for confirmed transactions are immutable.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_block_posting_changes_for_confirmed_txn ON postings;
CREATE TRIGGER tr_block_posting_changes_for_confirmed_txn
BEFORE INSERT OR UPDATE OR DELETE ON postings
FOR EACH ROW EXECUTE FUNCTION trg_block_posting_changes_for_confirmed_txn();

-- Ensure each confirmed transaction is balanced in home currency
CREATE OR REPLACE FUNCTION check_transaction_balanced(p_txn_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_status transaction_status;
  v_lines int;
  v_sum numeric(30,8);
BEGIN
  SELECT status INTO v_status
  FROM ledger_transactions
  WHERE id = p_txn_id;

  IF v_status IS DISTINCT FROM 'confirmed' THEN
    RETURN; -- allow drafts to be incomplete
  END IF;

  SELECT COUNT(*), COALESCE(SUM(amount_home), 0)
  INTO v_lines, v_sum
  FROM postings
  WHERE transaction_id = p_txn_id;

  IF v_lines < 2 THEN
    RAISE EXCEPTION 'Confirmed transaction % must have at least 2 postings.', p_txn_id;
  END IF;

  IF abs(v_sum) > 0.00000001 THEN
    RAISE EXCEPTION 'Confirmed transaction % is not balanced (sum amount_home = %).', p_txn_id, v_sum;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_balanced_on_postings()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM check_transaction_balanced(COALESCE(NEW.transaction_id, OLD.transaction_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_balanced_on_transactions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM check_transaction_balanced(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_balanced_on_postings ON postings;
CREATE CONSTRAINT TRIGGER tr_check_balanced_on_postings
AFTER INSERT OR UPDATE OR DELETE ON postings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trg_check_balanced_on_postings();

DROP TRIGGER IF EXISTS tr_check_balanced_on_transactions ON ledger_transactions;
CREATE CONSTRAINT TRIGGER tr_check_balanced_on_transactions
AFTER INSERT OR UPDATE ON ledger_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trg_check_balanced_on_transactions();

COMMIT;
