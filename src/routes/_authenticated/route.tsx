import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

/** Client-only gate: session lives in browser storage. Server functions re-verify every request. */
export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: '/account', search: { redirect: location.href } });
  },
  component: () => <Outlet />,
});
