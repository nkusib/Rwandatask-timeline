import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'remitflow.db')

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  migrate(_db)
  applyColumnMigrations(_db)
  return _db
}

function migrate(db: Database.Database) {
  db.exec(`
    -- Runs before main schema, safe to repeat
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      country TEXT DEFAULT 'GB',
      plan TEXT NOT NULL DEFAULT 'free',
      kyc_status TEXT NOT NULL DEFAULT 'unverified',
      kyc_level INTEGER NOT NULL DEFAULT 0,
      date_of_birth TEXT,
      address TEXT,
      nationality TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT DEFAULT 'inactive',
      trial_ends_at INTEGER,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      sanctions_status TEXT DEFAULT 'pending',
      sanctions_checked_at INTEGER,
      edd_required INTEGER NOT NULL DEFAULT 0,
      edd_deadline INTEGER,
      edd_document_ref TEXT,
      edd_triggered_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(user_id, currency)
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      bank_name TEXT,
      bank_account TEXT,
      bank_code TEXT,
      iban TEXT,
      mobile_number TEXT,
      mobile_provider TEXT,
      email TEXT,
      avatar_color TEXT DEFAULT '#1326FD',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT REFERENCES recipients(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      send_amount REAL NOT NULL,
      send_currency TEXT NOT NULL,
      receive_amount REAL NOT NULL,
      receive_currency TEXT NOT NULL,
      exchange_rate REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT,
      delivery_method TEXT,
      recipient_name TEXT,
      recipient_country TEXT,
      recipient_details TEXT,
      reference TEXT,
      provider_reference TEXT,
      notes TEXT,
      estimated_delivery TEXT,
      completed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      margin REAL NOT NULL DEFAULT 0.02,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(from_currency, to_currency)
    );

    CREATE TABLE IF NOT EXISTS kyc_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      file_url TEXT,
      notes TEXT,
      reviewed_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS fee_rules (
      id TEXT PRIMARY KEY,
      from_country TEXT NOT NULL,
      to_country TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      delivery_method TEXT NOT NULL,
      fixed_fee REAL NOT NULL DEFAULT 0,
      percentage_fee REAL NOT NULL DEFAULT 0,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL NOT NULL DEFAULT 100000,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id TEXT PRIMARY KEY,
      challenge TEXT NOT NULL UNIQUE,
      user_id TEXT,
      purpose TEXT NOT NULL DEFAULT 'login',
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_type TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS kyc_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      date_of_birth TEXT,
      nationality TEXT,
      address TEXT,
      id_type TEXT,
      id_number TEXT,
      id_document_ref TEXT,
      selfie_ref TEXT,
      liveness_score REAL,
      webauthn_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      email TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS daily_transaction_totals (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_sent REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at INTEGER NOT NULL,
      locked_until INTEGER
    );

    CREATE TABLE IF NOT EXISTS trusted_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fingerprint_hash TEXT NOT NULL,
      user_agent TEXT,
      first_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
      is_new INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, fingerprint_hash)
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL UNIQUE,
      device_fingerprint TEXT,
      user_agent TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL DEFAULT (unixepoch()),
      revoked_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS transfer_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      context_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_webauthn_challenges ON webauthn_challenges(challenge, used);
    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, used, created_at);
    CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_kyc_sessions_user ON kyc_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, revoked_at);
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_transfer_tokens_user ON transfer_tokens(token, used);

    -- Seed exchange rates
    INSERT OR IGNORE INTO exchange_rates (id, from_currency, to_currency, rate, margin) VALUES
      ('er_eurusd', 'EUR', 'USD', 1.085, 0.015),
      ('er_gbpusd', 'GBP', 'USD', 1.27, 0.015),
      ('er_usdeur', 'USD', 'EUR', 0.921, 0.015),
      ('er_gbpeur', 'GBP', 'EUR', 1.172, 0.015),
      ('er_eurgbp', 'EUR', 'GBP', 0.853, 0.015),
      ('er_usdgbp', 'USD', 'GBP', 0.787, 0.015),
      ('er_usdngn', 'USD', 'NGN', 1585.0, 0.02),
      ('er_gbpngn', 'GBP', 'NGN', 2012.0, 0.02),
      ('er_eurngn', 'EUR', 'NGN', 1718.0, 0.02),
      ('er_usdkes', 'USD', 'KES', 129.5, 0.02),
      ('er_gbpkes', 'GBP', 'KES', 164.5, 0.02),
      ('er_eurkes', 'EUR', 'KES', 140.4, 0.02),
      ('er_usdghs', 'USD', 'GHS', 15.2, 0.02),
      ('er_gbpghs', 'GBP', 'GHS', 19.3, 0.02),
      ('er_eurghs', 'EUR', 'GHS', 16.5, 0.02),
      ('er_usdtzs', 'USD', 'TZS', 2680.0, 0.02),
      ('er_usdugx', 'USD', 'UGX', 3710.0, 0.02),
      ('er_usdzar', 'USD', 'ZAR', 18.45, 0.02),
      ('er_usdxof', 'USD', 'XOF', 607.0, 0.02),
      ('er_usdxaf', 'USD', 'XAF', 607.0, 0.02),
      ('er_usdmad', 'USD', 'MAD', 9.95, 0.02),
      ('er_usdetb', 'USD', 'ETB', 57.5, 0.02),
      ('er_usdcdf', 'USD', 'CDF', 2800.0, 0.025),
      ('er_usdzmw', 'USD', 'ZMW', 26.5, 0.02),
      ('er_ngbusd', 'NGN', 'USD', 0.00063, 0.02),
      ('er_kesusd', 'KES', 'USD', 0.0077, 0.02),
      ('er_ghsusd', 'GHS', 'USD', 0.0658, 0.02);

    -- Add session_nonce column to otp_codes if not present (idempotent via try/catch in JS)

    -- Seed fee rules
    INSERT OR IGNORE INTO fee_rules (id, from_country, to_country, payment_method, delivery_method, fixed_fee, percentage_fee, min_amount, max_amount) VALUES
      ('fr_eu_ng_card_mm', 'EU', 'NG', 'card', 'mobile_money', 1.99, 1.5, 1, 5000),
      ('fr_eu_ng_bank_mm', 'EU', 'NG', 'bank_transfer', 'mobile_money', 0.99, 1.0, 1, 10000),
      ('fr_eu_ke_card_mm', 'EU', 'KE', 'card', 'mobile_money', 1.99, 1.5, 1, 5000),
      ('fr_eu_ke_bank_mm', 'EU', 'KE', 'bank_transfer', 'mobile_money', 0.99, 1.0, 1, 10000),
      ('fr_eu_gh_card_bank', 'EU', 'GH', 'card', 'bank', 2.49, 1.5, 10, 5000),
      ('fr_eu_gh_bank_bank', 'EU', 'GH', 'bank_transfer', 'bank', 1.49, 1.0, 10, 10000),
      ('fr_us_ng_card_mm', 'US', 'NG', 'card', 'mobile_money', 1.99, 1.8, 1, 5000),
      ('fr_us_ke_card_mm', 'US', 'KE', 'card', 'mobile_money', 1.99, 1.8, 1, 5000);
  `)
}

function applyColumnMigrations(db: Database.Database) {
  // Add columns to existing tables safely (fails silently if already present)
  const addColumn = (sql: string) => { try { db.exec(sql) } catch {} }
  addColumn('ALTER TABLE otp_codes ADD COLUMN session_nonce TEXT')
}

export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  }
})

export type User = {
  id: string
  email: string
  name: string
  phone: string | null
  country: string
  plan: string
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  kyc_level: number
  role: 'user' | 'admin' | 'super_admin'
  is_active: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  created_at: number
  updated_at: number
}

export type Wallet = {
  id: string
  user_id: string
  currency: string
  balance: number
  is_primary: number
  created_at: number
}

export type Recipient = {
  id: string
  user_id: string
  name: string
  country: string
  payment_method: string
  bank_name: string | null
  bank_account: string | null
  iban: string | null
  mobile_number: string | null
  mobile_provider: string | null
  email: string | null
  avatar_color: string
  created_at: number
}

export type Transaction = {
  id: string
  user_id: string
  recipient_id: string | null
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  send_amount: number
  send_currency: string
  receive_amount: number
  receive_currency: string
  exchange_rate: number
  fee: number
  total_amount: number
  payment_method: string | null
  delivery_method: string | null
  recipient_name: string | null
  recipient_country: string | null
  recipient_details: string | null
  reference: string
  notes: string | null
  estimated_delivery: string | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

export type ExchangeRate = {
  from_currency: string
  to_currency: string
  rate: number
  margin: number
  updated_at: number
}
