
CREATE TABLE public.vm_terminal_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL UNIQUE,
  host          TEXT NOT NULL,
  username      TEXT,
  command       TEXT NOT NULL,
  stdout        TEXT NOT NULL DEFAULT '',
  stderr        TEXT NOT NULL DEFAULT '',
  exit_code     INTEGER,
  duration_ms   INTEGER,
  status        TEXT NOT NULL DEFAULT 'running',  -- running | ok | error | timeout
  error_message TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ
);

GRANT SELECT ON public.vm_terminal_sessions TO authenticated;
GRANT ALL    ON public.vm_terminal_sessions TO service_role;

ALTER TABLE public.vm_terminal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own vm sessions"
  ON public.vm_terminal_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all vm sessions"
  ON public.vm_terminal_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_vm_sessions_user_started
  ON public.vm_terminal_sessions (user_id, started_at DESC);
