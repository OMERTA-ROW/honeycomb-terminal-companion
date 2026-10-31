CREATE OR REPLACE FUNCTION public.hc_my_hosts()
RETURNS TABLE(id uuid, name text, os text, fingerprint text, last_seen timestamptz, revoked_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.name, h.os, h.fingerprint, h.last_seen, h.revoked_at, h.created_at
  FROM hc_hosts h WHERE h.owner_id = auth.uid() AND public.hc_session_allowed() AND h.fingerprint IS NOT NULL
  ORDER BY h.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.hc_my_hosts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hc_my_hosts() TO authenticated;