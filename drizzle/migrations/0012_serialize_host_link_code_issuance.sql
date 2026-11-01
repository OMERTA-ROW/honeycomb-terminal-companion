CREATE OR REPLACE FUNCTION public.hc_create_host_enrollment(p_code_hash text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exp timestamptz;
BEGIN
  IF NOT public.hc_session_allowed() THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF p_code_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'bad_code'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('hc-host-enrollment:' || auth.uid()::text, 0));
  DELETE FROM hc_host_enrollments WHERE owner_id = auth.uid() AND used_at IS NULL;
  INSERT INTO hc_host_enrollments(owner_id, code_hash, expires_at)
    VALUES (auth.uid(), p_code_hash, clock_timestamp() + interval '10 minutes') RETURNING expires_at INTO v_exp;
  INSERT INTO hc_account_audit(owner_id, event) VALUES (auth.uid(), 'host_enroll_code_issued');
  RETURN v_exp;
END $$;
REVOKE ALL ON FUNCTION public.hc_create_host_enrollment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hc_create_host_enrollment(text) TO authenticated;