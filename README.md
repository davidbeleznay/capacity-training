# Capacity

A private personal training dashboard for workout planning, knee-response tracking,
Garmin/Peloton summaries, sleep, recovery signals, measurements, and progress photos.

## Architecture

- Next.js App Router
- Netlify hosting and server routes
- Supabase email magic-link authentication
- Supabase Postgres with row-level security
- Private Supabase Storage for progress photos

The original ChatGPT Site remains the source of truth until its records are exported,
checked for duplicates, and imported into Supabase.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `supabase/migrations/20261003000000_initial_capacity.sql` in the Supabase SQL editor.
4. Run `npm install` and `npm run dev`.

Without Supabase variables, the app deliberately renders a deployment-ready setup
screen rather than exposing data or failing the build.

## Netlify setup

1. Import `https://github.com/davidbeleznay/capacity-training` in Netlify.
2. Use `npm run build` as the build command and `.next` as the publish directory.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
   Netlify environment variables.
4. Add `https://YOUR-NETLIFY-SITE.netlify.app/auth/callback` to the allowed redirect
   URLs in Supabase Authentication.
5. Deploy a preview, verify sign-in and record isolation, then promote to production.

Never commit health exports, `.env` files, passwords, provider credentials, or a
Supabase service-role key.

## Current migration boundary

The app is ready for Netlify and Supabase. Direct automated Garmin and Peloton sync
is a later integration; the current interface continues to support reviewed imports
and deduplication so deployment can be stabilized first.
