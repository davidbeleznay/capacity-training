"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });
    setMessage(
      error ? error.message : "Check your email for the secure sign-in link.",
    );
    setBusy(false);
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        Email address
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      {message && <p className="login-message" role="status">{message}</p>}
    </form>
  );
}
