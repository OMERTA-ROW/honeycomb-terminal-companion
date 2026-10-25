REVOKE ALL ON public.hc_devices,public.hc_proofs,public.hc_pair_requests,public.hc_trust,public.hc_transfers,public.hc_chunks,public.hc_audit FROM anon,authenticated,PUBLIC;
REVOKE ALL ON FUNCTION public.hc_device_limit() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.hc_action(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hc_action(uuid,uuid,uuid,text,jsonb) TO service_role;