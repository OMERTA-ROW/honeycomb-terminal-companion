CREATE TABLE public.hc_workspace_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  provider text NOT NULL CHECK (provider IN ('github','codex','claude','runner')),
  action text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 80),
  target text NOT NULL DEFAULT '' CHECK (char_length(target) <= 300),
  write boolean NOT NULL DEFAULT false,
  outcome text NOT NULL CHECK (outcome IN ('ok','failed','blocked','denied')),
  detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hc_workspace_audit TO authenticated;
GRANT ALL ON public.hc_workspace_audit TO service_role;
ALTER TABLE public.hc_workspace_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit read" ON public.hc_workspace_audit FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "own audit insert" ON public.hc_workspace_audit FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE INDEX hc_workspace_audit_owner_idx ON public.hc_workspace_audit (owner_id, created_at DESC);