-- ============================================================
-- Password Reset Tokens Table
-- Security: single-use, 15-min expiry, SHA-256 hashed tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,          -- SHA-256 hash of the 64-char token; plain token is NEVER stored
  expires_at  TIMESTAMPTZ NOT NULL,          -- Set to NOW() + 15 minutes at creation
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  used_at     TIMESTAMPTZ,                   -- Timestamp when token was consumed (success OR failure)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by hash (used during validation)
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON public.password_reset_tokens(token_hash);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON public.password_reset_tokens(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only insert/read/update their own token records
CREATE POLICY "Users manage own reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Auto-cleanup: delete used or expired tokens older than 24h
-- (Run periodically via a Supabase cron job or pg_cron)
-- ============================================================
-- DELETE FROM public.password_reset_tokens
-- WHERE used = TRUE OR expires_at < NOW() - INTERVAL '24 hours';
