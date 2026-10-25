CREATE TABLE public.hc_devices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60), public_key jsonb NOT NULL, revoked_at timestamptz, last_seen timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0, attempt_window timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.hc_devices TO service_role;
ALTER TABLE public.hc_devices ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.hc_proofs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL REFERENCES public.hc_devices(id), owner_id uuid NOT NULL, expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds', used boolean NOT NULL DEFAULT false);
GRANT ALL ON public.hc_proofs TO service_role;
ALTER TABLE public.hc_proofs ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.hc_pair_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, issuer uuid NOT NULL REFERENCES public.hc_devices(id), claimant uuid REFERENCES public.hc_devices(id), code_hash text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now() + interval '120 seconds', state text NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','pending','confirmed','rejected','expired')), created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.hc_pair_requests TO service_role;
ALTER TABLE public.hc_pair_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.hc_trust (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, device_a uuid NOT NULL REFERENCES public.hc_devices(id), device_b uuid NOT NULL REFERENCES public.hc_devices(id), revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK (device_a <> device_b));
GRANT ALL ON public.hc_trust TO service_role;
ALTER TABLE public.hc_trust ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.hc_transfers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, sender uuid NOT NULL REFERENCES public.hc_devices(id), recipient uuid NOT NULL REFERENCES public.hc_devices(id), name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255), size integer NOT NULL CHECK (size BETWEEN 0 AND 5242880), sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','ready','completed','cancelled','failed')), received_bytes integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour', created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.hc_transfers TO service_role;
ALTER TABLE public.hc_transfers ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.hc_chunks (transfer_id uuid NOT NULL REFERENCES public.hc_transfers(id) ON DELETE CASCADE, position integer NOT NULL CHECK (position >= 0), bytes bytea NOT NULL CHECK (octet_length(bytes) <= 65536), PRIMARY KEY (transfer_id, position));
GRANT ALL ON public.hc_chunks TO service_role;
ALTER TABLE public.hc_chunks ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.hc_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, device_id uuid NOT NULL, event text NOT NULL, resource_id uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.hc_audit TO service_role;
ALTER TABLE public.hc_audit ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.hc_action(p_owner uuid, p_device uuid, p_proof uuid, p_op text, p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.hc_devices; target public.hc_devices; pr public.hc_pair_requests; tr public.hc_transfers; rid uuid; result jsonb := '{}'::jsonb; b bytea; n integer;
BEGIN
 SELECT * INTO d FROM public.hc_devices WHERE id=p_device AND owner_id=p_owner FOR UPDATE;
 IF NOT FOUND OR d.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Device unauthorized or revoked'; END IF;
 UPDATE public.hc_proofs SET used=true WHERE id=p_proof AND device_id=p_device AND owner_id=p_owner AND NOT used AND expires_at>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'Proof expired or replayed'; END IF;
 UPDATE public.hc_devices SET last_seen=now() WHERE id=p_device;
 -- Expiry denies access immediately; expired relay bytes are removed opportunistically.
 DELETE FROM public.hc_chunks WHERE transfer_id IN (SELECT id FROM public.hc_transfers WHERE owner_id=p_owner AND expires_at<=now());
 IF p_op='list' THEN
  result := jsonb_build_object('devices',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'revoked_at',revoked_at,'last_seen',last_seen)), '[]'::jsonb) FROM public.hc_devices WHERE owner_id=p_owner), 'requests',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'issuer',issuer,'claimant',claimant,'state',CASE WHEN expires_at<=now() AND state IN ('requested','pending') THEN 'expired' ELSE state END,'expires_at',expires_at)), '[]'::jsonb) FROM public.hc_pair_requests WHERE owner_id=p_owner AND (issuer=p_device OR claimant=p_device)), 'trust',(SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM public.hc_trust t WHERE owner_id=p_owner AND (device_a=p_device OR device_b=p_device) AND revoked_at IS NULL), 'transfers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY created_at DESC), '[]'::jsonb) FROM public.hc_transfers t WHERE owner_id=p_owner AND (sender=p_device OR recipient=p_device)), 'audit',(SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM (SELECT event,resource_id,device_id,created_at FROM public.hc_audit WHERE owner_id=p_owner ORDER BY created_at DESC LIMIT 50) a));
 ELSIF p_op='issue' THEN
  UPDATE public.hc_pair_requests SET state='expired' WHERE issuer=p_device AND state IN ('requested','pending');
  INSERT INTO public.hc_pair_requests(owner_id,issuer,code_hash) VALUES(p_owner,p_device,p_data->>'code_hash') RETURNING id INTO rid;
  result := jsonb_build_object('id',rid,'expires_at',now()+interval '120 seconds');
 ELSIF p_op='claim' THEN
  IF d.attempt_window < now()-interval '10 minutes' THEN d.attempts:=0; END IF;
  IF d.attempts>=5 THEN RETURN jsonb_build_object('error','Pairing attempt limit reached. Wait ten minutes.'); END IF;
  UPDATE public.hc_devices SET attempts=d.attempts+1,attempt_window=CASE WHEN d.attempt_window < now()-interval '10 minutes' THEN now() ELSE attempt_window END WHERE id=p_device;
  SELECT * INTO pr FROM public.hc_pair_requests WHERE owner_id=p_owner AND code_hash=p_data->>'code_hash' AND issuer<>p_device AND state='requested' AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN
   INSERT INTO public.hc_audit(owner_id,device_id,event) VALUES(p_owner,p_device,'pairing_denied');
   RETURN jsonb_build_object('error','Code invalid, expired or already used.');
  END IF;
  SELECT * INTO target FROM public.hc_devices WHERE id=pr.issuer FOR UPDATE;
  IF target.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('error','Issuing device revoked.'); END IF;
  UPDATE public.hc_pair_requests SET claimant=p_device,state='pending' WHERE id=pr.id;
  rid:=pr.id;
 ELSIF p_op IN ('approve','reject') THEN
  SELECT * INTO pr FROM public.hc_pair_requests WHERE id=(p_data->>'id')::uuid AND owner_id=p_owner AND issuer=p_device FOR UPDATE;
  IF NOT FOUND OR pr.state<>'pending' OR pr.expires_at<=now() THEN RAISE EXCEPTION 'Pairing expired or already consumed'; END IF;
  SELECT * INTO target FROM public.hc_devices WHERE id=pr.claimant FOR UPDATE;
  IF target.revoked_at IS NOT NULL OR target.name<>p_data->>'device_name' THEN RAISE EXCEPTION 'Device identity changed or revoked'; END IF;
  UPDATE public.hc_pair_requests SET state=CASE WHEN p_op='approve' THEN 'confirmed' ELSE 'rejected' END WHERE id=pr.id;
  IF p_op='approve' THEN INSERT INTO public.hc_trust(owner_id,device_a,device_b) VALUES(p_owner,p_device,pr.claimant); END IF;
  rid:=pr.id;
 ELSIF p_op='revoke' THEN
  UPDATE public.hc_devices SET revoked_at=now() WHERE id=(p_data->>'id')::uuid AND owner_id=p_owner RETURNING id INTO rid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Device not owned'; END IF;
  UPDATE public.hc_trust SET revoked_at=now() WHERE device_a=rid OR device_b=rid;
  UPDATE public.hc_transfers SET state='cancelled' WHERE (sender=rid OR recipient=rid) AND state IN ('uploading','ready');
  DELETE FROM public.hc_chunks WHERE transfer_id IN (SELECT id FROM public.hc_transfers WHERE sender=rid OR recipient=rid);
 ELSIF p_op='offer' THEN
  SELECT * INTO target FROM public.hc_devices WHERE id=(p_data->>'recipient')::uuid AND owner_id=p_owner FOR UPDATE;
  IF NOT FOUND OR target.revoked_at IS NOT NULL OR target.last_seen<now()-interval '45 seconds' THEN RAISE EXCEPTION 'Recipient offline or revoked'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.hc_trust WHERE owner_id=p_owner AND revoked_at IS NULL AND ((device_a=p_device AND device_b=target.id) OR (device_b=p_device AND device_a=target.id))) THEN RAISE EXCEPTION 'Recipient is not approved'; END IF;
  IF target.name<>p_data->>'device_name' OR coalesce((p_data->>'approved')::boolean,false)=false THEN RAISE EXCEPTION 'Named recipient approval required'; END IF;
  IF (SELECT count(*) FROM public.hc_transfers WHERE owner_id=p_owner AND state IN ('uploading','ready') AND expires_at>now())>=20 THEN RAISE EXCEPTION 'Finish or cancel existing transfers first'; END IF;
  INSERT INTO public.hc_transfers(owner_id,sender,recipient,name,size,sha256) VALUES(p_owner,p_device,target.id,p_data->>'name',(p_data->>'size')::integer,p_data->>'sha256') RETURNING id INTO rid;
  result:=jsonb_build_object('id',rid);
 ELSIF p_op IN ('chunk','read','finish','complete','cancel','fail') THEN
  SELECT * INTO tr FROM public.hc_transfers WHERE id=(p_data->>'id')::uuid AND owner_id=p_owner AND (sender=p_device OR recipient=p_device) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'File permission denied'; END IF;
  SELECT * INTO target FROM public.hc_devices WHERE id=CASE WHEN tr.sender=p_device THEN tr.recipient ELSE tr.sender END FOR UPDATE;
  IF target.revoked_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.hc_trust WHERE owner_id=p_owner AND revoked_at IS NULL AND ((device_a=tr.sender AND device_b=tr.recipient) OR (device_b=tr.sender AND device_a=tr.recipient))) THEN RAISE EXCEPTION 'Trust revoked'; END IF;
  IF tr.expires_at<=now() THEN RAISE EXCEPTION 'Transfer expired'; END IF;
  rid:=tr.id;
  IF p_op='chunk' THEN
   IF tr.sender<>p_device OR tr.state<>'uploading' THEN RAISE EXCEPTION 'Upload not permitted'; END IF;
   b:=decode(p_data->>'bytes','base64'); n:=(p_data->>'position')::integer;
   IF n<>tr.received_bytes/65536 OR octet_length(b)<>least(65536,tr.size-tr.received_bytes) OR octet_length(b)=0 THEN RAISE EXCEPTION 'Invalid chunk or replay'; END IF;
   INSERT INTO public.hc_chunks VALUES(tr.id,n,b);
   UPDATE public.hc_transfers SET received_bytes=received_bytes+octet_length(b) WHERE id=tr.id;
   result:=jsonb_build_object('bytes',tr.received_bytes+octet_length(b));
  ELSIF p_op='read' THEN
   IF (tr.sender=p_device AND tr.state<>'uploading') OR (tr.recipient=p_device AND tr.state<>'ready') THEN RAISE EXCEPTION 'Download not permitted'; END IF;
   SELECT encode(bytes,'base64') INTO result FROM public.hc_chunks WHERE transfer_id=tr.id AND position=(p_data->>'position')::integer;
   -- return binary cell as a JSON string, without writing contents to audit
   result:=jsonb_build_object('bytes',(SELECT encode(bytes,'base64') FROM public.hc_chunks WHERE transfer_id=tr.id AND position=(p_data->>'position')::integer));
  ELSIF p_op='finish' THEN
   IF tr.sender<>p_device OR tr.state<>'uploading' OR tr.received_bytes<>tr.size THEN RAISE EXCEPTION 'Upload incomplete'; END IF;
   UPDATE public.hc_transfers SET state='ready' WHERE id=tr.id;
  ELSIF p_op='complete' THEN
   IF tr.recipient<>p_device OR tr.state<>'ready' THEN RAISE EXCEPTION 'Receipt not permitted'; END IF;
   UPDATE public.hc_transfers SET state='completed' WHERE id=tr.id;
   DELETE FROM public.hc_chunks WHERE transfer_id=tr.id;
  ELSE
   IF tr.state NOT IN ('uploading','ready') THEN RAISE EXCEPTION 'Transfer already closed'; END IF;
   UPDATE public.hc_transfers SET state=CASE WHEN p_op='fail' THEN 'failed' ELSE 'cancelled' END WHERE id=tr.id;
   DELETE FROM public.hc_chunks WHERE transfer_id=tr.id;
  END IF;
 ELSE RAISE EXCEPTION 'Unknown operation'; END IF;
 IF p_op NOT IN ('list','read','chunk') THEN INSERT INTO public.hc_audit(owner_id,device_id,event,resource_id) VALUES(p_owner,p_device,p_op,rid); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.hc_action(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hc_action(uuid,uuid,uuid,text,jsonb) TO service_role;