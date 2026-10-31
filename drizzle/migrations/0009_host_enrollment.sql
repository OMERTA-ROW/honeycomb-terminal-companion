ALTER TABLE public.hc_hosts ADD COLUMN IF NOT EXISTS fingerprint text, ADD COLUMN IF NOT EXISTS secret_hash text;

CREATE TABLE public.hc_host_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  code_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.hc_host_enrollments TO service_role;
ALTER TABLE public.hc_host_enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hc_enroll_failures (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.hc_enroll_failures TO service_role;
ALTER TABLE public.hc_enroll_failures ENABLE ROW LEVEL SECURITY;

-- Signed-in active member issues a one-use 10-minute code (only its hash is stored).
CREATE OR REPLACE FUNCTION public.hc_create_host_enrollment(p_code_hash text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exp timestamptz;
BEGIN
  IF NOT public.hc_session_allowed() THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF p_code_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'bad_code'; END IF;
  DELETE FROM hc_host_enrollments WHERE owner_id = auth.uid() AND used_at IS NULL;
  INSERT INTO hc_host_enrollments(owner_id, code_hash) VALUES (auth.uid(), p_code_hash) RETURNING expires_at INTO v_exp;
  INSERT INTO hc_account_audit(owner_id, event) VALUES (auth.uid(), 'host_enroll_code_issued');
  RETURN v_exp;
END $$;

-- Called by the Mac helper (no user session). Code is the only authority; single use, expiring, globally rate limited.
CREATE OR REPLACE FUNCTION public.hc_enroll_host(p_code text, p_name text, p_os text, p_fingerprint text, p_secret_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e hc_host_enrollments; v_id uuid;
BEGIN
  IF (SELECT count(*) FROM hc_enroll_failures WHERE created_at > now() - interval '10 minutes') >= 30 THEN
    RAISE EXCEPTION 'rate_limited'; END IF;
  IF p_fingerprint !~ '^[0-9a-f]{64}$' OR p_secret_hash !~ '^[0-9a-f]{64}$' OR length(coalesce(p_name,'')) NOT BETWEEN 1 AND 40 OR p_os NOT IN ('macos','linux') THEN
    RAISE EXCEPTION 'bad_input'; END IF;
  SELECT * INTO e FROM hc_host_enrollments
   WHERE code_hash = encode(extensions.digest(upper(regexp_replace(p_code,'[\s-]','','g')),'sha256'),'hex')
   FOR UPDATE;
  IF e.id IS NULL OR e.used_at IS NOT NULL OR e.expires_at < now() THEN
    INSERT INTO hc_enroll_failures DEFAULT VALUES;
    RAISE EXCEPTION 'code_invalid';
  END IF;
  IF (SELECT count(*) FROM hc_hosts WHERE owner_id = e.owner_id AND revoked_at IS NULL) >= 5 THEN RAISE EXCEPTION 'host_limit'; END IF;
  UPDATE hc_host_enrollments SET used_at = now() WHERE id = e.id;
  INSERT INTO hc_hosts(owner_id, name, os, public_key, fingerprint, secret_hash, last_seen)
   VALUES (e.owner_id, p_name, p_os, jsonb_build_object('tls_sha256', p_fingerprint), p_fingerprint, p_secret_hash, now())
   RETURNING id INTO v_id;
  INSERT INTO hc_account_audit(owner_id, event) VALUES (e.owner_id, 'host_enrolled');
  RETURN jsonb_build_object('host_id', v_id);
END $$;

-- Mac helper heartbeat: proves possession of the host secret; returns revocation.
CREATE OR REPLACE FUNCTION public.hc_host_status(p_host uuid, p_secret text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h hc_hosts;
BEGIN
  SELECT * INTO h FROM hc_hosts WHERE id = p_host AND secret_hash = encode(extensions.digest(p_secret,'sha256'),'hex');
  IF h.id IS NULL THEN RETURN jsonb_build_object('state','unknown'); END IF;
  IF h.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('state','revoked'); END IF;
  UPDATE hc_hosts SET last_seen = now() WHERE id = h.id;
  RETURN jsonb_build_object('state','active');
END $$;

CREATE OR REPLACE FUNCTION public.hc_revoke_host(p_host uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.hc_session_allowed() THEN RAISE EXCEPTION 'not_allowed'; END IF;
  UPDATE hc_hosts SET revoked_at = now() WHERE id = p_host AND owner_id = auth.uid() AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  INSERT INTO hc_account_audit(owner_id, event) VALUES (auth.uid(), 'host_revoked');
END $$;

REVOKE ALL ON FUNCTION public.hc_create_host_enrollment(text), public.hc_revoke_host(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hc_create_host_enrollment(text), public.hc_revoke_host(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.hc_enroll_host(text,text,text,text,text), public.hc_host_status(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_enroll_host(text,text,text,text,text), public.hc_host_status(uuid,text) TO anon, authenticated;