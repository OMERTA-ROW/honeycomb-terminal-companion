CREATE TYPE public.hc_role AS ENUM ('owner','admin','member');

CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.hc_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_roles_single_owner ON public.user_roles((role)) WHERE role='owner';
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_self ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.hc_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.hc_role NOT NULL CHECK (role <> 'owner'),
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.hc_invitations TO service_role;
ALTER TABLE public.hc_invitations ENABLE ROW LEVEL SECURITY;

-- Real host ownership records. Only a future verified companion registration may insert.
CREATE TABLE public.hc_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  os text NOT NULL,
  public_key jsonb NOT NULL,
  last_seen timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hc_hosts TO authenticated;
GRANT ALL ON public.hc_hosts TO service_role;
ALTER TABLE public.hc_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY hc_hosts_owner_read ON public.hc_hosts FOR SELECT TO authenticated USING (owner_id = auth.uid() AND public.hc_session_allowed());

CREATE OR REPLACE FUNCTION public.hc_my_role() RETURNS public.hc_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid() $$;

-- Session gate now also requires an assigned role (invite or verified owner bootstrap).
CREATE OR REPLACE FUNCTION public.hc_session_allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT auth.uid() IS NOT NULL AND auth.jwt()->>'session_id' IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.hc_revoked_sessions WHERE owner_id=auth.uid() AND session_id=(auth.jwt()->>'session_id')::uuid)
 AND coalesce((auth.jwt()->>'iat')::bigint,0)>coalesce((SELECT revoked_through FROM public.hc_account_security WHERE owner_id=auth.uid()),0) $$;

CREATE OR REPLACE FUNCTION public.hc_create_invite(p_email text, p_role public.hc_role, p_token_hash text, p_hours integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me public.hc_role := public.hc_my_role(); rid uuid;
BEGIN
 IF NOT public.hc_session_allowed() THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF me IS NULL OR me='member' THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_role='owner' OR (me='admin' AND p_role<>'member') THEN RAISE EXCEPTION 'Not authorized to grant this role'; END IF;
 IF p_hours < 1 OR p_hours > 168 THEN RAISE EXCEPTION 'Expiry must be 1 to 168 hours'; END IF;
 IF p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
 UPDATE public.hc_invitations SET revoked_at=clock_timestamp() WHERE lower(email)=lower(p_email) AND used_at IS NULL AND revoked_at IS NULL;
 INSERT INTO public.hc_invitations(email,role,token_hash,invited_by,expires_at) VALUES(lower(p_email),p_role,p_token_hash,auth.uid(),clock_timestamp()+make_interval(hours=>p_hours)) RETURNING id INTO rid;
 INSERT INTO public.hc_account_audit(owner_id,event) VALUES(auth.uid(),'invite_created');
 RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.hc_revoke_invite(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me public.hc_role := public.hc_my_role(); inv public.hc_invitations;
BEGIN
 IF NOT public.hc_session_allowed() OR me IS NULL OR me='member' THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO inv FROM public.hc_invitations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR (me='admin' AND inv.role<>'member') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation already used'; END IF;
 UPDATE public.hc_invitations SET revoked_at=clock_timestamp() WHERE id=p_id AND revoked_at IS NULL;
 INSERT INTO public.hc_account_audit(owner_id,event) VALUES(auth.uid(),'invite_revoked');
END $$;

CREATE OR REPLACE FUNCTION public.hc_admin_overview() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me public.hc_role := public.hc_my_role();
BEGIN
 IF NOT public.hc_session_allowed() OR me IS NULL OR me='member' THEN RAISE EXCEPTION 'Not authorized'; END IF;
 RETURN jsonb_build_object('role',me,
  'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'role',r.role,'email',u.email,'display_name',p.display_name) ORDER BY r.created_at),'[]') FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id LEFT JOIN public.profiles p ON p.id=r.user_id),
  'invites',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'role',role,'expires_at',expires_at,'state',CASE WHEN used_at IS NOT NULL THEN 'used' WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN expires_at<=clock_timestamp() THEN 'expired' ELSE 'pending' END) ORDER BY created_at DESC),'[]') FROM (SELECT * FROM public.hc_invitations ORDER BY created_at DESC LIMIT 100) i));
END $$;

CREATE OR REPLACE FUNCTION public.hc_set_role(p_user uuid, p_role public.hc_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.hc_session_allowed() OR public.hc_my_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Owner only'; END IF;
 IF p_user=auth.uid() OR p_role='owner' THEN RAISE EXCEPTION 'Owner role cannot be changed here'; END IF;
 UPDATE public.user_roles SET role=p_role WHERE user_id=p_user AND role<>'owner';
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
 INSERT INTO public.hc_account_audit(owner_id,event) VALUES(auth.uid(),'role_changed'),(p_user,'role_changed_by_owner');
END $$;

CREATE OR REPLACE FUNCTION public.hc_remove_member(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.hc_session_allowed() OR public.hc_my_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Owner only'; END IF;
 IF p_user=auth.uid() THEN RAISE EXCEPTION 'Owner cannot remove themselves'; END IF;
 DELETE FROM public.user_roles WHERE user_id=p_user AND role<>'owner';
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
 INSERT INTO public.hc_account_security(owner_id,revoked_through) VALUES(p_user,floor(extract(epoch FROM clock_timestamp()))::bigint)
  ON CONFLICT(owner_id) DO UPDATE SET revoked_through=excluded.revoked_through;
 UPDATE public.hc_devices SET revoked_at=clock_timestamp() WHERE owner_id=p_user AND revoked_at IS NULL;
 INSERT INTO public.hc_account_audit(owner_id,event) VALUES(auth.uid(),'member_removed'),(p_user,'access_removed');
END $$;

-- Service-only: atomically consume an invitation for an email before the account is created.
CREATE OR REPLACE FUNCTION public.hc_consume_invite(p_token_hash text, p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inv public.hc_invitations;
BEGIN
 SELECT * INTO inv FROM public.hc_invitations WHERE token_hash=p_token_hash FOR UPDATE;
 IF NOT FOUND OR inv.used_at IS NOT NULL OR inv.revoked_at IS NOT NULL OR inv.expires_at<=clock_timestamp() OR lower(inv.email)<>lower(p_email) THEN
  RETURN jsonb_build_object('error','Invitation invalid, expired, revoked or already used.'); END IF;
 UPDATE public.hc_invitations SET used_at=clock_timestamp() WHERE id=inv.id;
 RETURN jsonb_build_object('id',inv.id,'role',inv.role,'invited_by',inv.invited_by);
END $$;

CREATE OR REPLACE FUNCTION public.hc_finish_invite(p_invite uuid, p_user uuid, p_role public.hc_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 UPDATE public.hc_invitations SET used_by=p_user WHERE id=p_invite;
 INSERT INTO public.user_roles(user_id,role) VALUES(p_user,p_role) ON CONFLICT(user_id) DO NOTHING;
 INSERT INTO public.hc_account_audit(owner_id,event) VALUES(p_user,'invite_accepted');
END $$;

-- Service-only: verified owner bootstrap; fails once any owner exists.
CREATE OR REPLACE FUNCTION public.hc_bootstrap_owner(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE role='owner') THEN RAISE EXCEPTION 'Owner already exists'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(p_user,'owner');
 INSERT INTO public.hc_account_audit(owner_id,event) VALUES(p_user,'owner_bootstrapped');
END $$;

CREATE OR REPLACE FUNCTION public.hc_owner_exists() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='owner') $$;

REVOKE ALL ON FUNCTION public.hc_consume_invite(text,text), public.hc_finish_invite(uuid,uuid,public.hc_role), public.hc_bootstrap_owner(uuid), public.hc_owner_exists() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hc_consume_invite(text,text), public.hc_finish_invite(uuid,uuid,public.hc_role), public.hc_bootstrap_owner(uuid), public.hc_owner_exists() TO service_role;
REVOKE ALL ON FUNCTION public.hc_create_invite(text,public.hc_role,text,integer), public.hc_revoke_invite(uuid), public.hc_admin_overview(), public.hc_set_role(uuid,public.hc_role), public.hc_remove_member(uuid), public.hc_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hc_create_invite(text,public.hc_role,text,integer), public.hc_revoke_invite(uuid), public.hc_admin_overview(), public.hc_set_role(uuid,public.hc_role), public.hc_remove_member(uuid), public.hc_my_role() TO authenticated;