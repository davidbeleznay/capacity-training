# Capacity migration plan

## Decision

Move Capacity from ChatGPT Sites to a private GitHub repository deployed on Netlify, while preserving the current interface and keeping personal health data out of source control.

## Current state

- The complete Site source is recovered in this folder.
- The existing production build succeeds locally.
- The live ChatGPT Site remains unchanged and continues to hold the current records.
- The application currently depends on three Sites-specific services:
  - ChatGPT request headers for sign-in
  - Cloudflare D1 for structured records
  - Cloudflare R2 for progress photos

The UI, validation rules, record model, charts, workout planning, knee check-ins, and health summaries can be retained.

## Target architecture

- **Source and change history:** private GitHub repository
- **Web application and server routes:** Next.js deployed on Netlify
- **Authentication:** Supabase email magic-link sign-in
- **Structured data:** Supabase Postgres with row-level security
- **Progress photos:** Supabase Storage with private buckets
- **Secrets:** Netlify environment variables; never committed to Git

## Migration sequence

1. Create a private GitHub repository and push this recovered baseline.
2. Add a Netlify-compatible Next.js deployment and confirm the interface runs with sample data.
3. Replace ChatGPT sign-in with Supabase authentication.
4. Replace D1 and R2 access with Supabase Postgres and Storage.
5. Export the live Site records, remove duplicate imports, and load the cleaned records into the new database.
6. Add the first repeatable ingestion path for Garmin and Peloton data.
7. Verify the private production application before retiring the ChatGPT Site.

## Data guardrails

- Do not commit live fitness exports, database dumps, tokens, passwords, or `.env` files.
- Keep the ChatGPT Site live until record counts and representative workouts match in the new application.
- Store provider source IDs and enforce uniqueness so repeated imports update records instead of creating duplicates.
- Treat progress photos as private objects and serve them only through authenticated, short-lived URLs.

## First product milestone

The first Netlify milestone is deliberately narrow:

- David can sign in privately.
- Existing workout, health, sleep, wellness, measurement, settings, and knee-check-in records load.
- Manual entries can be created, edited, and deleted.
- The current dashboard and planning experience remain recognizable.
- No Garmin or Peloton credentials are stored in the browser or repository.

Direct automated syncing comes after this baseline is stable.
