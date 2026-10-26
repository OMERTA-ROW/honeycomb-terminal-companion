-- Rollback-only runtime checks for invite-only roles. Fixture users exist only inside this transaction.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,aud,role,instance_id) VALUES
 ('00000000-0000-4000-8000-0000000000a1','owner@fixture.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
 ('00000000-0000-4000-8000-0000000000b2','member@fixture.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
 ('00000000-0000-4000-8000-0000000000c3','outsider@fixture.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000');
SELECT public.hc_bootstrap_owner('00000000-0000-4000-8000-0000000000a1');
INSERT INTO public.hc_hosts(owner_id,name,os,public_key) VALUES('00000000-0000-4000-8000-0000000000a1','fixture','macOS','{}');

CREATE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE sql AS $$
 SELECT set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated','session_id',gen_random_uuid(),'iat',extract(epoch from now())::bigint+5)::text, true) $$;
CREATE FUNCTION pg_temp.expect_fail(q text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN BEGIN EXECUTE q; EXCEPTION WHEN others THEN RAISE NOTICE 'PASS %', label; RETURN; END; RAISE EXCEPTION 'FAIL % (no error)', label; END $$;
GRANT EXECUTE ON FUNCTION pg_temp.expect_fail(text,text), pg_temp.as_user(uuid) TO authenticated, anon;

-- 1. Second owner bootstrap rejected
SELECT pg_temp.expect_fail($q$SELECT public.hc_bootstrap_owner('00000000-0000-4000-8000-0000000000c3')$q$,'second owner bootstrap rejected');

-- 2. Signed-out (anon) cannot create invites or read roles/hosts
SET LOCAL ROLE anon;
SELECT pg_temp.expect_fail($q$SELECT public.hc_create_invite('x@fixture.invalid','member','h0',1)$q$,'anon cannot invite');
SELECT pg_temp.expect_fail($q$SELECT * FROM public.hc_invitations$q$,'anon cannot read invitations');
RESET ROLE;

-- 3. Owner invites a member; outsider-with-session (no role) cannot do anything
SET LOCAL ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.expect_fail($q$SELECT public.hc_create_invite('x@fixture.invalid','owner','h1',1)$q$,'owner role cannot be invited');
SELECT public.hc_create_invite('member@fixture.invalid','member','hash-member',24);
SELECT public.hc_create_invite('second@fixture.invalid','member','hash-second',24);
SELECT public.hc_create_invite('third@fixture.invalid','admin','hash-revoke',24) AS revoke_id \gset
SELECT public.hc_revoke_invite(:'revoke_id');
SELECT pg_temp.expect_fail($q$SELECT * FROM public.hc_invitations$q$,'authenticated cannot read invitation table directly');
RESET ROLE;

-- 4. Consume lifecycle (service path)
DO $$ DECLARE r jsonb; BEGIN
 r := public.hc_consume_invite('hash-member','wrong@fixture.invalid'); IF r ? 'id' THEN RAISE EXCEPTION 'FAIL wrong email accepted'; END IF; RAISE NOTICE 'PASS wrong email rejected';
 r := public.hc_consume_invite('hash-member','member@fixture.invalid'); IF NOT r ? 'id' THEN RAISE EXCEPTION 'FAIL valid invite'; END IF;
 PERFORM public.hc_finish_invite((r->>'id')::uuid,'00000000-0000-4000-8000-0000000000b2','member'); RAISE NOTICE 'PASS valid invite accepted';
 r := public.hc_consume_invite('hash-member','member@fixture.invalid'); IF r ? 'id' THEN RAISE EXCEPTION 'FAIL reuse'; END IF; RAISE NOTICE 'PASS reuse rejected';
 r := public.hc_consume_invite('hash-revoke','third@fixture.invalid'); IF r ? 'id' THEN RAISE EXCEPTION 'FAIL revoked'; END IF; RAISE NOTICE 'PASS revoked rejected';
 UPDATE public.hc_invitations SET expires_at=now()-interval '1 second' WHERE token_hash='hash-second';
 r := public.hc_consume_invite('hash-second','second@fixture.invalid'); IF r ? 'id' THEN RAISE EXCEPTION 'FAIL expired'; END IF; RAISE NOTICE 'PASS expired rejected';
END $$;

-- 5. Member cannot invite, promote self, administer, or read the owner's hosts/profile
SET LOCAL ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
SELECT pg_temp.expect_fail($q$SELECT public.hc_create_invite('y@fixture.invalid','member','h2',1)$q$,'member cannot invite');
SELECT pg_temp.expect_fail($q$SELECT public.hc_set_role('00000000-0000-4000-8000-0000000000b2','admin')$q$,'member cannot promote self');
SELECT pg_temp.expect_fail($q$SELECT public.hc_admin_overview()$q$,'member cannot view administration');
SELECT pg_temp.expect_fail($q$UPDATE public.user_roles SET role='owner'$q$,'member cannot write roles');
DO $$ BEGIN IF (SELECT count(*) FROM public.hc_hosts)<>0 OR (SELECT count(*) FROM public.profiles WHERE id<>auth.uid())<>0 OR (SELECT count(*) FROM public.user_roles)<>1 THEN RAISE EXCEPTION 'FAIL cross-user read'; END IF; RAISE NOTICE 'PASS member sees only own rows'; END $$;

-- 6. Outsider with a valid session but no membership is denied
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000c3');
DO $$ BEGIN IF public.hc_session_allowed() THEN RAISE EXCEPTION 'FAIL outsider allowed'; END IF; RAISE NOTICE 'PASS non-member session denied'; END $$;

-- 7. Owner promotes, admin limited to member invites, owner removes
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT public.hc_set_role('00000000-0000-4000-8000-0000000000b2','admin');
SELECT pg_temp.expect_fail($q$SELECT public.hc_set_role('00000000-0000-4000-8000-0000000000a1','member')$q$,'owner cannot demote self');
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
SELECT public.hc_create_invite('z@fixture.invalid','member','h3',1); 
SELECT pg_temp.expect_fail($q$SELECT public.hc_create_invite('w@fixture.invalid','admin','h4',1)$q$,'admin cannot invite admin');
SELECT pg_temp.expect_fail($q$SELECT public.hc_remove_member('00000000-0000-4000-8000-0000000000a1')$q$,'admin cannot remove owner');
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
SELECT public.hc_remove_member('00000000-0000-4000-8000-0000000000b2');
SELECT pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
DO $$ BEGIN IF public.hc_session_allowed() THEN RAISE EXCEPTION 'FAIL removed member allowed'; END IF; RAISE NOTICE 'PASS removed member denied'; END $$;
RESET ROLE;
ROLLBACK;
