import { redirect } from "next/navigation";
import Training from "./training";
import { getCapacityUser } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase/config";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="setup-page">
        <section className="setup-card">
          <div className="brand setup-brand">
            <span className="brand-mark">C</span>
            CAPACITY<span className="brand-period">.</span>
          </div>
          <p className="eyebrow">DEPLOYMENT READY</p>
          <h1>Connect the private data layer.</h1>
          <p>
            This build is running. Add the two Supabase environment variables in
            Netlify to enable sign-in, training records, and private photos.
          </p>
          <code>NEXT_PUBLIC_SUPABASE_URL</code>
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
        </section>
      </main>
    );
  }

  const user = await getCapacityUser();
  if (!user) redirect("/login?next=/");
  return <Training />;
}
