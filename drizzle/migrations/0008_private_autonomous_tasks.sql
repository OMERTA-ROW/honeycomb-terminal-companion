CREATE TABLE public.hc_tasks (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, host_id uuid REFERENCES public.hc_hosts(id), goal text NOT NULL CHECK(length(goal) BETWEEN 1 AND 2000), actions text[] NOT NULL DEFAULT '{}', state text NOT NULL DEFAULT 'blocked' CHECK(state IN ('blocked','stopped','revoked')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,id), CHECK(actions <@ ARRAY['inspect','browser_read','prepare_proposal']::text[])
);
GRANT SELECT ON public.hc_tasks TO authenticated;
GRANT ALL ON public.hc_tasks TO service_role;
ALTER TABLE public.hc_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY hc_tasks_self ON public.hc_tasks FOR SELECT TO authenticated USING(owner_id=auth.uid() AND public.hc_session_allowed());
CREATE TABLE public.hc_task_activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, task_id uuid NOT NULL REFERENCES public.hc_tasks(id), event text NOT NULL CHECK(event IN ('task_blocked','task_stopped','scope_revoked')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.hc_task_activity TO authenticated;
GRANT ALL ON public.hc_task_activity TO service_role;
ALTER TABLE public.hc_task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY hc_task_activity_self ON public.hc_task_activity FOR SELECT TO authenticated USING(owner_id=auth.uid() AND public.hc_session_allowed());
CREATE FUNCTION public.hc_task_action(p_op text,p_id uuid,p_host uuid DEFAULT NULL,p_goal text DEFAULT NULL,p_actions text[] DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.hc_tasks; u uuid:=auth.uid();
BEGIN
 IF u IS NULL OR NOT public.hc_session_allowed() THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_op='create' THEN
  IF p_host IS NOT NULL THEN PERFORM 1 FROM public.hc_hosts WHERE id=p_host AND owner_id=u AND revoked_at IS NULL FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Host not authorized'; END IF; END IF;
  IF p_goal IS NULL OR length(trim(p_goal)) NOT BETWEEN 1 AND 2000 OR p_actions IS NULL OR NOT(p_actions <@ ARRAY['inspect','browser_read','prepare_proposal']::text[]) OR (p_host IS NULL AND cardinality(p_actions)>0) THEN RAISE EXCEPTION 'Invalid scope'; END IF;
  SELECT * INTO t FROM public.hc_tasks WHERE id=p_id;
  IF FOUND THEN IF t.owner_id<>u OR t.host_id IS DISTINCT FROM p_host OR t.goal<>trim(p_goal) OR t.actions<>p_actions THEN RAISE EXCEPTION 'Task ID conflict'; END IF; RETURN t.id; END IF;
  INSERT INTO public.hc_tasks(id,owner_id,host_id,goal,actions) VALUES(p_id,u,p_host,trim(p_goal),p_actions);
  INSERT INTO public.hc_task_activity(owner_id,task_id,event) VALUES(u,p_id,'task_blocked');
 ELSIF p_op IN ('stop','revoke') THEN
  SELECT * INTO t FROM public.hc_tasks WHERE id=p_id AND owner_id=u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF t.state='revoked' OR (t.state='stopped' AND p_op='stop') THEN RETURN t.id; END IF;
  UPDATE public.hc_tasks SET state=CASE WHEN p_op='revoke' THEN 'revoked' ELSE 'stopped' END,actions='{}',updated_at=now() WHERE id=p_id AND owner_id=u;
  INSERT INTO public.hc_task_activity(owner_id,task_id,event) VALUES(u,p_id,CASE WHEN p_op='revoke' THEN 'scope_revoked' ELSE 'task_stopped' END);
 ELSE RAISE EXCEPTION 'Executor unavailable'; END IF;
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.hc_task_action(text,uuid,uuid,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hc_task_action(text,uuid,uuid,text,text[]) TO authenticated;
COMMENT ON TABLE public.hc_tasks IS 'Private blocked task requests only. No runner or execution grants. Sensitive actions require future task-specific approval and verified host enforcement.';