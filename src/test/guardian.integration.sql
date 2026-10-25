-- Rollback-only integration tests against the installed Guardian boundary.
-- Does not create auth accounts; random application-only fixture UUIDs.
BEGIN;
-- Sandbox SQL role cannot invoke service-only RPC. Execute its byte-identical
-- installed body in a transaction-local pg_temp function, never widen live grants.
DO $$ DECLARE definition text; BEGIN SELECT pg_get_functiondef('public.hc_action(uuid,uuid,uuid,text,jsonb)'::regprocedure) INTO definition; definition:=replace(definition,'FUNCTION public.hc_action','FUNCTION pg_temp.hc_action'); EXECUTE definition; END $$;
CREATE FUNCTION pg_temp.act(o uuid,d uuid,op text,p jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql AS $$ DECLARE proof uuid; BEGIN INSERT INTO public.hc_proofs(owner_id,device_id) VALUES(o,d) RETURNING id INTO proof; RETURN pg_temp.hc_action(o,d,proof,op,p); END $$;
CREATE FUNCTION pg_temp.denied(o uuid,d uuid,op text,p jsonb,expected text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_temp.act(o,d,op,p); RAISE EXCEPTION 'TEST unexpectedly allowed %',op; EXCEPTION WHEN OTHERS THEN IF position(expected IN SQLERRM)=0 THEN RAISE; END IF; END $$;
DO $$
DECLARE o uuid:=gen_random_uuid(); other_owner uuid:=gen_random_uuid(); a uuid; b uuid; c uuid; proof uuid; request uuid; tid uuid; bad uuid; result jsonb; key jsonb:='{"kty":"EC","crv":"P-256","x":"fixture","y":"fixture"}'; bytes bytea:=decode('000102feff','hex'); hash text:=encode(sha256(bytes),'hex');
BEGIN
 INSERT INTO public.hc_devices(owner_id,name,public_key) VALUES(o,'Fixture A',key) RETURNING id INTO a;
 INSERT INTO public.hc_devices(owner_id,name,public_key) VALUES(o,'Fixture B',key) RETURNING id INTO b;
 INSERT INTO public.hc_devices(owner_id,name,public_key) VALUES(o,'Unauthorized C',key) RETURNING id INTO c;
 PERFORM pg_temp.denied(other_owner,a,'list','{}','Device unauthorized or revoked');
 RAISE NOTICE 'PASS wrong account denied';
 INSERT INTO public.hc_proofs(owner_id,device_id,expires_at) VALUES(o,a,clock_timestamp()-interval '1 second') RETURNING id INTO proof;
 BEGIN PERFORM pg_temp.hc_action(o,a,proof,'list','{}');RAISE EXCEPTION 'TEST expired proof allowed'; EXCEPTION WHEN OTHERS THEN IF position('Proof expired or replayed' IN SQLERRM)=0 THEN RAISE;END IF;END;
 RAISE NOTICE 'PASS expired device proof denied';
 INSERT INTO public.hc_proofs(owner_id,device_id) VALUES(o,a) RETURNING id INTO proof;
 PERFORM pg_temp.hc_action(o,a,proof,'list','{}');
 BEGIN PERFORM pg_temp.hc_action(o,a,proof,'list','{}');RAISE EXCEPTION 'TEST replay allowed'; EXCEPTION WHEN OTHERS THEN IF position('Proof expired or replayed' IN SQLERRM)=0 THEN RAISE;END IF;END;
 RAISE NOTICE 'PASS device proof replay denied';
 INSERT INTO public.hc_pair_requests(owner_id,issuer,code_hash,expires_at) VALUES(o,a,'expired-fixture',clock_timestamp()-interval '1 second');
 result:=pg_temp.act(o,b,'claim','{"code_hash":"expired-fixture"}');IF result->>'error' IS NULL THEN RAISE EXCEPTION 'TEST expired pairing allowed';END IF;
 RAISE NOTICE 'PASS expired pairing denied';
 result:=pg_temp.act(o,a,'issue','{"code_hash":"valid-fixture"}');request:=(result->>'id')::uuid;
 PERFORM pg_temp.act(o,b,'claim','{"code_hash":"valid-fixture"}');
 result:=pg_temp.act(o,b,'claim','{"code_hash":"valid-fixture"}');IF result->>'error' IS NULL THEN RAISE EXCEPTION 'TEST pairing replay allowed';END IF;
 RAISE NOTICE 'PASS single-use pairing replay denied';
 PERFORM pg_temp.denied(o,a,'approve',jsonb_build_object('id',request,'device_name','wrong'),'Device identity changed or revoked');
 PERFORM pg_temp.act(o,a,'approve',jsonb_build_object('id',request,'device_name','Fixture B'));
 PERFORM pg_temp.denied(o,a,'approve',jsonb_build_object('id',request,'device_name','Fixture B'),'Pairing expired or already consumed');
 RAISE NOTICE 'PASS named approval and repeated approval denial';
 FOR i IN 1..5 LOOP result:=pg_temp.act(o,c,'claim','{"code_hash":"wrong"}');END LOOP;
 result:=pg_temp.act(o,c,'claim','{"code_hash":"valid-fixture"}');IF result->>'error' NOT LIKE '%attempt limit%' THEN RAISE EXCEPTION 'TEST attempt lockout missing';END IF;
 RAISE NOTICE 'PASS five-attempt limit enforced';
 PERFORM pg_temp.denied(o,a,'offer',jsonb_build_object('recipient',c,'device_name','Unauthorized C','approved',true,'name','file','size',5,'sha256',hash),'Recipient is not approved');
 RAISE NOTICE 'PASS unpaired recipient denied';
 result:=pg_temp.act(o,a,'offer',jsonb_build_object('recipient',b,'device_name','Fixture B','approved',true,'name','fixture.bin','size',5,'sha256',hash));tid:=(result->>'id')::uuid;
 PERFORM pg_temp.denied(o,c,'read',jsonb_build_object('id',tid,'position',0),'File permission denied');
 PERFORM pg_temp.denied(o,b,'chunk',jsonb_build_object('id',tid,'position',0,'bytes',encode(bytes,'base64')),'Upload not permitted');
 RAISE NOTICE 'PASS per-file and directional permissions enforced';
 PERFORM pg_temp.act(o,a,'chunk',jsonb_build_object('id',tid,'position',0,'bytes',encode(bytes,'base64')));
 PERFORM pg_temp.denied(o,a,'chunk',jsonb_build_object('id',tid,'position',0,'bytes',encode(bytes,'base64')),'Invalid chunk or replay');
 PERFORM pg_temp.act(o,a,'finish',jsonb_build_object('id',tid));
 result:=pg_temp.act(o,b,'read',jsonb_build_object('id',tid,'position',0));IF decode(result->>'bytes','base64')<>bytes THEN RAISE EXCEPTION 'TEST file corrupted';END IF;
 PERFORM pg_temp.act(o,b,'complete',jsonb_build_object('id',tid));
 IF EXISTS(SELECT 1 FROM public.hc_chunks WHERE transfer_id=tid) THEN RAISE EXCEPTION 'TEST completed bytes retained';END IF;
 RAISE NOTICE 'PASS actual binary transfer intact and receipt purges relay bytes';
 result:=pg_temp.act(o,a,'offer',jsonb_build_object('recipient',b,'device_name','Fixture B','approved',true,'name','bad.bin','size',5,'sha256',repeat('0',64)));bad:=(result->>'id')::uuid;
 PERFORM pg_temp.act(o,a,'chunk',jsonb_build_object('id',bad,'position',0,'bytes',encode(bytes,'base64')));
 PERFORM pg_temp.denied(o,a,'finish',jsonb_build_object('id',bad),'File integrity mismatch');
 RAISE NOTICE 'PASS server rejects corrupted digest';
 PERFORM pg_temp.act(o,a,'cancel',jsonb_build_object('id',bad));
 PERFORM pg_temp.denied(o,b,'read',jsonb_build_object('id',bad,'position',0),'Download not permitted');
 RAISE NOTICE 'PASS cancellation denies download';
 result:=pg_temp.act(o,a,'offer',jsonb_build_object('recipient',b,'device_name','Fixture B','approved',true,'name','empty','size',0,'sha256',encode(sha256(''::bytea),'hex')));tid:=(result->>'id')::uuid;
 PERFORM pg_temp.act(o,a,'finish',jsonb_build_object('id',tid));
 RAISE NOTICE 'PASS zero-byte file supported';
 PERFORM pg_temp.act(o,a,'revoke',jsonb_build_object('id',b));
 PERFORM pg_temp.denied(o,b,'list','{}','Device unauthorized or revoked');
 PERFORM pg_temp.denied(o,a,'read',jsonb_build_object('id',tid,'position',0),'Trust revoked');
 IF EXISTS(SELECT 1 FROM public.hc_chunks WHERE transfer_id=tid) THEN RAISE EXCEPTION 'TEST revoked bytes retained';END IF;
 RAISE NOTICE 'PASS revoked device and subsequent access denied';
 IF has_function_privilege('authenticated','public.hc_action(uuid,uuid,uuid,text,jsonb)','EXECUTE') OR has_table_privilege('authenticated','public.hc_chunks','SELECT') THEN RAISE EXCEPTION 'TEST direct bypass permitted';END IF;
 RAISE NOTICE 'PASS authenticated direct bypass unavailable';
END $$;
ROLLBACK;
