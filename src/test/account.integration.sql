-- Rollback-only function tests; random application fixture IDs, no auth accounts.
BEGIN;
CREATE TEMP TABLE hc_account_security (LIKE public.hc_account_security INCLUDING ALL);
CREATE TEMP TABLE hc_revoked_sessions (LIKE public.hc_revoked_sessions INCLUDING ALL);
CREATE TEMP TABLE hc_account_audit (LIKE public.hc_account_audit INCLUDING ALL);
CREATE TEMP TABLE profiles(id uuid PRIMARY KEY, display_name text DEFAULT '', preferences jsonb DEFAULT '{"wifi_only":true}');
DO $$ DECLARE fn text; signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY['public.hc_session_allowed()','public.hc_revoke_sessions(boolean)','public.hc_create_profile()','public.hc_profile_audit()'] LOOP
  SELECT pg_get_functiondef(signature::regprocedure) INTO fn;
  fn:=replace(replace(fn,'public.hc_','pg_temp.hc_'),'public.profiles','pg_temp.profiles');
  fn:=replace(fn,'SET search_path TO ''public''','SET search_path TO ''pg_temp''');
  EXECUTE fn;
 END LOOP;
END $$;
CREATE TEMP TABLE mock_signup(id uuid);
CREATE TRIGGER test_signup AFTER INSERT ON mock_signup FOR EACH ROW EXECUTE FUNCTION pg_temp.hc_create_profile();
CREATE TRIGGER test_profile_update AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION pg_temp.hc_profile_audit();
DO $$ DECLARE owner uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); other_sid uuid:=gen_random_uuid(); stamp bigint:=floor(extract(epoch FROM clock_timestamp()))::bigint; BEGIN
 INSERT INTO mock_signup VALUES(owner);
 IF NOT EXISTS(SELECT FROM pg_temp.profiles WHERE id=owner AND display_name='' AND preferences='{"wifi_only":true}') THEN RAISE EXCEPTION 'Signup profile failed'; END IF;
 RAISE NOTICE 'PASS profile signup trigger without auth account';
 UPDATE pg_temp.profiles SET display_name='Fixture' WHERE id=owner;
 IF (SELECT count(*) FROM pg_temp.hc_account_audit WHERE owner_id=owner AND event='profile_updated')<>1 THEN RAISE EXCEPTION 'Profile audit failed';END IF;
 RAISE NOTICE 'PASS profile update secret-free audit';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner,'session_id',sid,'iat',stamp)::text,true);
 IF NOT pg_temp.hc_session_allowed() THEN RAISE EXCEPTION 'Active session denied';END IF;
 PERFORM pg_temp.hc_revoke_sessions(false);
 IF pg_temp.hc_session_allowed() THEN RAISE EXCEPTION 'Revoked session allowed';END IF;
 RAISE NOTICE 'PASS individual session revocation';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner,'session_id',other_sid,'iat',stamp)::text,true);
 IF NOT pg_temp.hc_session_allowed() THEN RAISE EXCEPTION 'Other session denied';END IF;
 PERFORM pg_temp.hc_revoke_sessions(true);
 IF pg_temp.hc_session_allowed() THEN RAISE EXCEPTION 'Global session revoke failed';END IF;
 RAISE NOTICE 'PASS all-session cutoff denies old sessions';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner,'session_id',gen_random_uuid(),'iat',stamp+10)::text,true);
 IF NOT pg_temp.hc_session_allowed() THEN RAISE EXCEPTION 'Fresh session denied';END IF;
 RAISE NOTICE 'PASS fresh sign-in allowed';
 PERFORM set_config('request.jwt.claims','{}',true);
 IF pg_temp.hc_session_allowed() THEN RAISE EXCEPTION 'Anonymous allowed';END IF;
 RAISE NOTICE 'PASS anonymous denied';
 IF has_table_privilege('anon','public.profiles','SELECT') OR has_table_privilege('authenticated','public.hc_account_security','UPDATE') OR has_table_privilege('authenticated','public.hc_account_audit','INSERT') THEN RAISE EXCEPTION 'Unexpected account grants';END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND qual LIKE '%auth.uid()%' AND qual LIKE '%hc_session_allowed%')<>2 THEN RAISE EXCEPTION 'Profile owner policies missing';END IF;
 RAISE NOTICE 'PASS installed owner/session RLS and locked security/audit grants';
END $$;
ROLLBACK;