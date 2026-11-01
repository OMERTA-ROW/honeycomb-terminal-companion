import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAccountUser } from "@/hooks/use-account-user";
import { readAccount, saveProfile, revokeAccountSessions } from "@/lib/account.functions";
import { accountStatus, claimOwner } from "@/lib/members.functions";
import type { MembershipState } from "@/lib/owner-claim";
import { z } from "zod";
const safeRedirect = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/dashboard");

export const Route = createFileRoute("/account")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Your account — Honeycomb Terminal" },
      { name: "description", content: "Manage your private Honeycomb Terminal profile and account sessions." },
      { property: "og:title", content: "Your account — Honeycomb Terminal" },
      { property: "og:description", content: "Private account, basic preferences and security history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Account,
});
function Account() {
  const { user, ready } = useAccountUser();
  const load = useServerFn(readAccount),
    save = useServerFn(saveProfile),
    revoke = useServerFn(revokeAccountSessions);
  const query = useQueryClient(),
    navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const search = Route.useSearch();
  const statusFn = useServerFn(accountStatus),
    claimFn = useServerFn(claimOwner);
  const [status, setStatus] = useState<MembershipState | "checking" | "error">("checking");
  const refreshStatus = () =>
    statusFn()
      .then(setStatus)
      .catch(() => setStatus("error"));
  useEffect(() => {
    setStatus("checking");
    if (user) void refreshStatus();
  }, [user?.id]);
  const role = typeof status === "object" && status.state === "member" ? status.role : null;
  useEffect(() => {
    if (role && search.redirect && safeRedirect(search.redirect) !== "/account")
      void navigate({ to: safeRedirect(search.redirect), replace: true });
  }, [role, search.redirect, navigate]);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [displayName, setDisplayName] = useState(""),
    [wifi, setWifi] = useState(true);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof readAccount>>["audit"]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState("");
  useEffect(() => {
    let alive = true;
    setAudit([]);
    setDisplayName("");
    setPassword("");
    if (user && role)
      void load()
        .then((r) => {
          if (alive) {
            setDisplayName(r.profile.display_name);
            setWifi((r.profile.preferences as { wifi_only?: boolean }).wifi_only ?? true);
            setAudit(r.audit);
          }
        })
        .catch(() => {
          if (alive) setError("Account unavailable or session revoked. Sign in again.");
        });
    return () => {
      alive = false;
    };
  }, [user?.id, role]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch {
      setError("Request failed. Check your details or try again.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  async function submit() {
    if (mode === "recovery") {
      const r = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (r.error) throw r.error;
      setNote("If this address has an account, check its email for a reset link.");
      return;
    }
    const r = await supabase.auth.signInWithPassword({ email, password });
    if (r.error) throw r.error;
    await refreshStatus();
    await navigate({ to: "/account", search: { redirect: safeRedirect(search.redirect) } });
  }
  async function signout(all: boolean) {
    if (all && !window.confirm("Sign out every Honeycomb Terminal account session? Device trust remains separate."))
      return;
    try {
      await revoke({ data: { all } });
    } catch {
      /* non-member or already revoked: still clear this browser */
    }
    await query.cancelQueries();
    query.clear();
    const r = await supabase.auth.signOut({ scope: all ? "global" : "local" });
    if (r.error) setNote("Application access revoked. Provider sign-out could not be confirmed; retry signing out.");
    await navigate({ to: "/account", replace: true });
  }
  const field = "block w-full mt-1 border rounded-md bg-background p-2 text-sm";
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Your account</h1>
      {error && (
        <p role="alert" className="mt-3 text-destructive">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="mt-3 text-success">
          {note}
        </p>
      )}
      {!ready ? (
        <p className="mt-4 text-muted-foreground">Checking account…</p>
      ) : !user ? (
        <section className="mt-5 max-w-md">
          <div className="flex flex-wrap gap-2 mb-4">
            {(["login", "recovery"] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? "default" : "outline"}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setNote("");
                }}
              >
                {m === "login" ? "Sign in" : "Forgot password"}
              </Button>
            ))}
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(submit);
            }}
          >
            <label className="block">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </label>
            {mode === "login" && (
              <label className="block">
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                />
              </label>
            )}
            <Button disabled={busy} type="submit">
              {mode === "login" ? "Sign in" : "Send reset email"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Accounts are invitation-only. Ask the owner for an invitation link; public sign-up is off.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(["google", "lovable"] as const).map((provider) => (
              <Button
                key={provider}
                disabled={busy}
                variant="outline"
                onClick={() =>
                  void run(async () => {
                    const r = await lovable.auth.signInWithOAuth(provider, {
                      redirect_uri:
                        window.location.origin +
                        "/account" +
                        `?redirect=${encodeURIComponent(safeRedirect(search.redirect))}`,
                    });
                    if (r.error) throw r.error;
                  })
                }
              >
                Sign in with {provider === "google" ? "Google" : "Lovable"}
              </Button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <p className="mt-3 text-sm break-all">
            {user.email} · {status === "checking" ? "checking access…" : (role ?? "no access")}
          </p>
          {status === "error" && (
            <p role="alert" className="mt-2 text-warning text-sm">
              Access could not be checked.{" "}
              <button className="underline" onClick={() => void refreshStatus()}>
                Retry access check
              </button>{" "}
              or sign in again.
            </p>
          )}
          {typeof status === "object" && status.state === "revoked" && (
            <p role="alert" className="mt-2 text-warning text-sm">
              This session was signed out by a security action. Sign out, then sign in again.
            </p>
          )}
          {typeof status === "object" && status.state === "no_membership" && !status.ownerClaimable && (
            <p role="alert" className="mt-2 text-warning text-sm">
              You are signed in, but this account has no Honeycomb membership yet. Ask the owner for an invitation.
            </p>
          )}
          {typeof status === "object" && status.state === "no_membership" && status.ownerClaimable && (
            <div className="mt-3 rounded-md border p-3 max-w-md">
              <p className="text-sm">
                This verified address matches the configured owner. Finish setting up owner access.
              </p>
              <Button
                className="mt-2"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const r = await claimFn();
                    if (!r.ok) throw new Error(r.message);
                    await refreshStatus();
                    setNote("Owner access is set up.");
                  })
                }
              >
                Become owner
              </Button>
            </div>
          )}
          {(role === "owner" || role === "admin") && (
            <Button asChild className="mt-3">
              <Link to="/members">Members & invitations</Link>
            </Button>
          )}
          {role && (
            <section className="mt-5 max-w-md">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await save({ data: { display_name: displayName, preferences: { wifi_only: wifi } } });
                    const r = await load();
                    setAudit(r.audit);
                    setNote("Profile saved.");
                  });
                }}
              >
                <label className="block">
                  Display name
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    className={field}
                  />
                </label>
                <label className="flex gap-2">
                  <input type="checkbox" checked={wifi} onChange={(e) => setWifi(e.target.checked)} />
                  Prefer Wi-Fi for Honeycomb transfers
                </label>
                <p className="text-xs text-warning">
                  Saved preference only. Browsers cannot reliably enforce Wi-Fi-only transfers.
                </p>
                <Button type="submit" disabled={busy}>
                  Save profile
                </Button>
              </form>
            </section>
          )}
          <section className="mt-6 border-t pt-4">
            <h2 className="font-medium">Account sessions</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" disabled={busy} onClick={() => void run(() => signout(false))}>
                Sign out this session
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void run(() => signout(true))}>
                Sign out all sessions
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Subsequent Terminal account and transfer requests are denied after revocation. Provider tokens can remain
              valid until expiry; device trust is revoked separately.
            </p>
            <Button asChild variant="link">
              <Link to="/transfer">Manage trusted devices</Link>
            </Button>
          </section>
          <section className="mt-6 border-t pt-4">
            <h2 className="font-medium">Security history</h2>
            <ul className="mt-3 text-xs space-y-2 text-muted-foreground">
              {audit.map((a) => (
                <li key={a.id}>
                  {new Date(a.created_at).toLocaleString()} · {a.event.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
