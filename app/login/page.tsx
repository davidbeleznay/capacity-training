import { redirect } from "next/navigation";
import { getCapacityUser } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import LoginForm from "./login-form";

function safeNext(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const configured = isSupabaseConfigured();
  const user = configured ? await getCapacityUser() : null;
  if (user) redirect(next);

  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="brand setup-brand">
          <span className="brand-mark">C</span>
          CAPACITY<span className="brand-period">.</span>
        </div>
        <p className="eyebrow">PRIVATE TRAINING SPACE</p>
        <h1>Sign in to Capacity.</h1>
        <p>
          Enter your email and Supabase will send you a secure sign-in link. No
          password to remember.
        </p>
        {params.error && <div className="error">The sign-in link could not be verified. Please try again.</div>}
        {configured ? (
          <LoginForm next={next} />
        ) : (
          <div className="error">Supabase has not been connected to this deployment yet.</div>
        )}
      </section>
    </main>
  );
}
