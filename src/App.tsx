import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Workspace from "./Workspace";
import { setupError, signInWithGoogle, signOut, supabase } from "./lib/backend";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState(setupError || "");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    // The SDK processes the Google callback and exchanges its PKCE code.
    // Session restoration happens before the workspace loads private records.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setUser(data.session?.user || null);
        if (error) setError(error.message);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError("Could not restore sign-in. Please try again.");
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user || null);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login() {
    setError("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
    }
  }
  async function logout() {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }
  if (loading)
    return (
      <div className="auth-loading">
        <div className="brand">launchpad.</div>
        <p>Opening your workspace…</p>
      </div>
    );
  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Student";
  return (
    <>
      {error && (
        <div className="auth-message" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      <Workspace
        key={user?.id || "signed-out"}
        user={user ? { name, email: user.email || "" } : null}
        onSignIn={login}
        onSignOut={logout}
      />
    </>
  );
}
