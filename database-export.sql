-- ============================================================
-- Full database schema export
-- Generated: 2026-09-08
-- ============================================================

-- NOTE: Foreign keys referencing auth.users will need to be
-- adapted for your target database (e.g., replace auth.users
-- with your own users table).

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE public.admin_users (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.app_settings (
  id integer NOT NULL DEFAULT 1,
  aitunnel_api_key text DEFAULT '',
  default_model text NOT NULL DEFAULT 'gpt-image-1',
  default_resolution text NOT NULL DEFAULT '1K',
  default_aspect_ratio text NOT NULL DEFAULT '1:1',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  api_key_set boolean,
  free_mode boolean NOT NULL DEFAULT false
);

CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Новый чат',
  model text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.generation_rate_limit (
  client_key text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

CREATE TABLE public.generation_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  image_url text NOT NULL,
  prompt text,
  variants jsonb DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid()
);

CREATE TABLE public.image_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  prompt text NOT NULL,
  model text NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  yookassa_id text,
  amount numeric NOT NULL,
  tokens integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pending_generations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL DEFAULT 'video',
  generation_id text NOT NULL,
  prompt text NOT NULL,
  model text NOT NULL,
  duration integer,
  aspect_ratio text,
  estimated_cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  result_url text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pipeline_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  type text NOT NULL,
  label text NOT NULL,
  icon text,
  position integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  thumbnail text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid()
);

CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  earned numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.shared_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  receiver_id uuid NOT NULL,
  media_type text NOT NULL,
  media_url text NOT NULL,
  label text NOT NULL DEFAULT '',
  seen boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender text NOT NULL,
  content text,
  media_url text,
  media_type text NOT NULL DEFAULT 'text',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL DEFAULT 'Обращение в поддержку',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamp with time zone DEFAULT now(),
  unread_user integer NOT NULL DEFAULT 0,
  unread_admin integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tts_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  text text NOT NULL,
  model text NOT NULL,
  voice text NOT NULL,
  audio_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_balances (
  id uuid NOT NULL,
  tokens numeric NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  referral_code text,
  referred_by uuid,
  total_referral_earnings numeric NOT NULL DEFAULT 0,
  nickname text,
  banned_at timestamp with time zone,
  ban_reason text
);

CREATE TABLE public.user_presence (
  user_id uuid NOT NULL,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  device_type text NOT NULL DEFAULT 'desktop',
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.video_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  prompt text NOT NULL,
  model text NOT NULL,
  duration integer NOT NULL DEFAULT 5,
  video_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 2. PRIMARY KEYS
-- ============================================================

ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_sessions ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.generation_rate_limit ADD CONSTRAINT generation_rate_limit_pkey PRIMARY KEY (client_key);
ALTER TABLE public.generation_results ADD CONSTRAINT generation_results_pkey PRIMARY KEY (id);
ALTER TABLE public.image_history ADD CONSTRAINT image_history_pkey PRIMARY KEY (id);
ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE public.pending_generations ADD CONSTRAINT pending_generations_pkey PRIMARY KEY (id);
ALTER TABLE public.pipeline_blocks ADD CONSTRAINT pipeline_blocks_pkey PRIMARY KEY (id);
ALTER TABLE public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE public.referrals ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);
ALTER TABLE public.shared_media ADD CONSTRAINT shared_media_pkey PRIMARY KEY (id);
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);
ALTER TABLE public.tts_history ADD CONSTRAINT tts_history_pkey PRIMARY KEY (id);
ALTER TABLE public.user_balances ADD CONSTRAINT user_balances_pkey PRIMARY KEY (id);
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);
ALTER TABLE public.video_history ADD CONSTRAINT video_history_pkey PRIMARY KEY (id);

-- ============================================================
-- 3. UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE public.payments ADD CONSTRAINT payments_yookassa_id_key UNIQUE (yookassa_id);
ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);
ALTER TABLE public.user_balances ADD CONSTRAINT user_balances_referral_code_key UNIQUE (referral_code);
ALTER TABLE public.video_history ADD CONSTRAINT video_history_video_url_key UNIQUE (video_url);
CREATE UNIQUE INDEX idx_user_balances_nickname_lower ON public.user_balances USING btree (lower(nickname)) WHERE (nickname IS NOT NULL);
CREATE UNIQUE INDEX user_balances_nickname_lower_key ON public.user_balances USING btree (lower(nickname)) WHERE (nickname IS NOT NULL AND nickname <> '');

-- ============================================================
-- 4. FOREIGN KEYS
-- (References to auth.users -- adapt to your target DB)
-- ============================================================

ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.chat_sessions ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.generation_results ADD CONSTRAINT generation_results_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.generation_results ADD CONSTRAINT generation_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.image_history ADD CONSTRAINT image_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.pending_generations ADD CONSTRAINT pending_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.pipeline_blocks ADD CONSTRAINT pipeline_blocks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id);
ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id);
ALTER TABLE public.shared_media ADD CONSTRAINT shared_media_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id);
ALTER TABLE public.shared_media ADD CONSTRAINT shared_media_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.tts_history ADD CONSTRAINT tts_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.user_balances ADD CONSTRAINT user_balances_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.user_balances ADD CONSTRAINT user_balances_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES auth.users(id);
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.video_history ADD CONSTRAINT video_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX idx_chat_sessions_updated_at ON public.chat_sessions USING btree (updated_at DESC);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions USING btree (user_id);
CREATE INDEX idx_generation_results_created_at ON public.generation_results USING btree (created_at DESC);
CREATE INDEX idx_generation_results_project_id ON public.generation_results USING btree (project_id);
CREATE INDEX idx_generation_results_user_id ON public.generation_results USING btree (user_id);
CREATE INDEX idx_image_history_user_id ON public.image_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);
CREATE INDEX idx_payments_yookassa_id ON public.payments USING btree (yookassa_id);
CREATE INDEX idx_pending_generations_user_status ON public.pending_generations USING btree (user_id, status);
CREATE INDEX idx_pipeline_blocks_position ON public.pipeline_blocks USING btree (project_id, "position");
CREATE INDEX idx_pipeline_blocks_project_id ON public.pipeline_blocks USING btree (project_id);
CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);
CREATE INDEX idx_shared_media_receiver ON public.shared_media USING btree (receiver_id, created_at DESC);
CREATE INDEX idx_shared_media_sender ON public.shared_media USING btree (sender_id, created_at DESC);
CREATE INDEX idx_support_messages_ticket ON public.support_messages USING btree (ticket_id, created_at);
CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);
CREATE INDEX idx_support_tickets_user ON public.support_tickets USING btree (user_id);
CREATE INDEX idx_tts_history_created_at ON public.tts_history USING btree (created_at DESC);
CREATE INDEX idx_tts_history_user_id ON public.tts_history USING btree (user_id);
CREATE INDEX idx_user_presence_last_seen ON public.user_presence USING btree (last_seen DESC);
CREATE INDEX idx_video_history_user_created ON public.video_history USING btree (user_id, created_at);

-- ============================================================
-- 6. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.user_nicknames_lookup AS
  SELECT id, nickname FROM user_balances;

CREATE OR REPLACE VIEW public.user_nicknames_view AS
  SELECT id, COALESCE(nickname, 'unknown') AS nickname FROM user_balances;

-- ============================================================
-- 7. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_tokens(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_balances
  SET tokens = tokens + p_amount, updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_balances (id, tokens, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (id) DO UPDATE
    SET tokens = user_balances.tokens + p_amount, updated_at = now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_generation_slot(p_client_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO generation_rate_limit (client_key, window_start, request_count)
  VALUES (p_client_key, now(), 1)
  ON CONFLICT (client_key) DO UPDATE
  SET request_count = CASE
    WHEN generation_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
    THEN 1
    ELSE generation_rate_limit.request_count + 1
    END,
    window_start = CASE
    WHEN generation_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
    THEN now()
    ELSE generation_rate_limit.window_start
    END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_tokens(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current numeric;
  v_new numeric;
BEGIN
  SELECT tokens INTO v_current
  FROM user_balances
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  v_new := greatest(0, v_current - p_amount);

  UPDATE user_balances
  SET tokens = v_new, updated_at = now()
  WHERE id = p_user_id;

  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_tokens(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE user_balances
  SET tokens = tokens - amount, updated_at = now()
  WHERE id = auth.uid() AND tokens >= amount
  RETURNING tokens INTO remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Недостаточно токенов';
  END IF;

  RETURN remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_tokens(amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining numeric;
BEGIN
  UPDATE user_balances
  SET tokens = tokens - amount, updated_at = now()
  WHERE id = auth.uid() AND tokens >= amount
  RETURNING tokens INTO remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Недостаточно токенов';
  END IF;

  RETURN remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
BEGIN
  IF NEW.referral_code IS NULL THEN
    new_code := substr(md5(NEW.id::text || now()::text), 1, 8);
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) > 50 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.id, COALESCE(v.nickname, 'unknown')
  FROM public.user_nicknames_lookup v
  WHERE v.id = ANY(p_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_total integer;
  v_online integer;
BEGIN
  SELECT count(*)::integer INTO v_total FROM auth.users;

  SELECT count(DISTINCT user_id)::integer INTO v_online
  FROM auth.sessions
  WHERE updated_at > now() - interval '15 minutes';

  RETURN json_build_object(
    'total_users', v_total,
    'online_users', v_online
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_balances (id, tokens)
  VALUES (NEW.id, 1000)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_support_unread_admin(p_ticket_id uuid)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  UPDATE support_tickets SET unread_admin = unread_admin + 1 WHERE id = p_ticket_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_support_unread_user(p_ticket_id uuid)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  UPDATE support_tickets SET unread_user = unread_user + 1 WHERE id = p_ticket_id;
$$;

CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_clean text;
  v_pattern text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_query IS NULL OR length(p_query) < 2 OR length(p_query) > 30 THEN
    RETURN;
  END IF;

  v_clean := regexp_replace(p_query, '[^[:alnum:]_]', '', 'g');
  v_clean := replace(v_clean, '_', '');
  IF length(v_clean) < 2 THEN
    RETURN;
  END IF;

  v_pattern := replace(p_query, '\', '\\');
  v_pattern := replace(v_pattern, '%', '\%');
  v_pattern := replace(v_pattern, '_', '\_');

  RETURN QUERY
  SELECT v.id, v.nickname
  FROM public.user_nicknames_lookup v
  WHERE v.nickname IS NOT NULL
    AND v.nickname ILIKE '%' || v_pattern || '%' ESCAPE '\'
    AND v.id <> auth.uid()
  LIMIT 8;
END;
$$;

-- ============================================================
-- 8. TRIGGERS
-- ============================================================

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.user_balances
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
