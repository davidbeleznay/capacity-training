# Capacity — David’s training

Private workout planning, manual Peloton and strength logging, knee check-ins, next-day response, weekly review, and durable Apple Health/freddy workout summaries. The Health area supports a free-plan workflow: ask ChatGPT to import a synced workout within freddy's seven-day window, then retain the summary in Capacity for longer-term dashboards. Built from the workflow concepts in KneeCapacity, with a new Sites interface and durable per-user storage. Original KneeCapacity remains unchanged; no historic workout data was migrated.

Starter plan is a proposal, not an individualized exercise prescription. Personalize appointment days, exercises, baseline and physio guidance in settings.

Validation: TypeScript and production build; local database migration; UI workout create, reload persistence, next-day edit without duplication, knee check-in; phone layout at 390px. Preview test entries remain in local preview storage only.
