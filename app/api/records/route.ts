import { z } from "zod";
import { getCapacityUser } from "../../../lib/auth";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const base = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["workout", "checkin", "settings", "health", "wellness", "measurement", "sleep"]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data: z.record(z.unknown()),
});
const pain = z.number().min(0).max(10).nullable();
const lift = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.enum(["lb", "kg", "bodyweight"]),
  sets: z.array(z.object({
    reps: z.number().int().min(1).max(1000).nullable(),
    weight: z.number().min(0).max(2000).nullable(),
    seconds: z.number().int().min(1).max(3600).nullable(),
  })).min(1).max(20),
});
const workout = z.object({
  lifts: z.array(lift).max(30).optional(),
  title: z.string().min(1).max(120),
  category: z.enum(["Peloton", "Strength", "Mobility", "Outdoor", "Other"]),
  minutes: z.number().int().min(1).max(600),
  effort: z.number().int().min(1).max(10),
  before: pain,
  after: pain,
  next: pain,
  swelling: z.enum(["Not recorded", "None", "Mild", "Moderate", "Severe"]),
  notes: z.string().max(4000),
  exercises: z.string().max(4000),
  url: z.string().max(1000).refine((value) => !value || /^https:\/\//.test(value)),
  planId: z.string().max(50).optional(),
});
const checkin = z.object({
  pain: z.number().int().min(0).max(10),
  swelling: z.enum(["None", "Mild", "Moderate", "Severe"]),
  response: z.enum(["Usual", "Better", "Worse", "Unsure"]),
  notes: z.string().max(4000),
});
const settings = z.object({
  goal: z.string().max(500),
  physio: z.string().max(4000),
  baseline: pain,
  slots: z.array(z.object({
    id: z.string().max(50),
    day: z.number().int().min(0).max(6),
    title: z.string().min(1).max(120),
    minutes: z.number().int().min(5).max(180),
    category: z.enum(["Peloton", "Strength", "Mobility", "Outdoor", "Other"]),
    detail: z.string().max(1500),
  })).max(14),
});
const optionalMetric = (max: number) => z.number().min(0).max(max).nullable().optional();
const health = z.object({
  provider: z.string().min(1).max(80),
  sourceId: z.string().max(300).optional(),
  title: z.string().min(1).max(160),
  workoutType: z.string().max(120),
  minutes: z.number().min(0).max(1440),
  startedAt: z.string().max(40).optional(),
  endedAt: z.string().max(40).optional(),
  averageHeartRate: z.number().min(20).max(260).nullable(),
  maxHeartRate: z.number().min(20).max(260).nullable(),
  activeEnergy: z.number().min(0).max(20000).nullable(),
  distanceKm: z.number().min(0).max(1000).nullable(),
  averageCadence: optionalMetric(300),
  maxCadence: optionalMetric(300),
  aerobicEffect: optionalMetric(5),
  anaerobicEffect: optionalMetric(5),
  trainingLoad: optionalMetric(10000),
  intensityMinutes: optionalMetric(1440),
  bodyBatteryBefore: optionalMetric(100),
  bodyBatteryAfter: optionalMetric(100),
  recoveryHours: optionalMetric(240),
  device: z.string().max(160),
  importedAt: z.string().max(40),
  notes: z.string().max(4000),
  zones: z.array(z.object({ label: z.string().max(40), minutes: z.number().min(0).max(1440) })).max(10).optional(),
  instructor: z.string().max(120).nullable().optional(),
  discipline: z.string().max(120).nullable().optional(),
  classType: z.string().max(120).nullable().optional(),
  totalOutput: optionalMetric(100000),
  averagePower: optionalMetric(5000),
  maxPower: optionalMetric(5000),
  averageResistance: optionalMetric(100),
  averageSpeedKph: optionalMetric(200),
  averageIncline: optionalMetric(100),
  averagePace: z.string().max(40).nullable().optional(),
  pelotonSourceId: z.string().max(300).optional(),
  steps: optionalMetric(1000000),
  totalReps: optionalMetric(100000),
  totalSets: optionalMetric(10000),
  bodyBatteryDrain: z.number().min(-100).max(100).nullable().optional(),
});
const wellness = z.object({
  provider: z.literal("Garmin Connect"),
  sourceId: z.string().max(300),
  bodyBatteryMin: optionalMetric(100),
  bodyBatteryMax: optionalMetric(100),
  bodyBatteryCharged: optionalMetric(100),
  bodyBatteryDrained: optionalMetric(100),
  restingHeartRate: optionalMetric(260),
  averageStress: optionalMetric(100),
  maxStress: optionalMetric(100),
  moderateIntensityMinutes: optionalMetric(1440),
  vigorousIntensityMinutes: optionalMetric(1440),
  steps: optionalMetric(1000000),
  activeEnergy: optionalMetric(20000),
  importedAt: z.string().max(40),
  notes: z.string().max(2000),
});
const measurement = z.object({
  weightKg: optionalMetric(500),
  waistCm: optionalMetric(500),
  chestCm: optionalMetric(500),
  hipsCm: optionalMetric(500),
  armCm: optionalMetric(200),
  thighCm: optionalMetric(300),
  bodyFatPercent: optionalMetric(100),
  photoKey: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000),
});
const sleep = z.object({
  provider: z.string().max(80),
  sourceId: z.string().max(300),
  durationMinutes: z.number().min(0).max(1440),
  sleepScore: optionalMetric(100),
  deepMinutes: optionalMetric(1440),
  remMinutes: optionalMetric(1440),
  lightMinutes: optionalMetric(1440),
  awakeMinutes: optionalMetric(1440),
  bedtime: z.string().max(40).nullable().optional(),
  wakeTime: z.string().max(40).nullable().optional(),
  averageHeartRate: optionalMetric(260),
  averageHrv: optionalMetric(500),
  bodyBatteryChange: z.number().min(-100).max(100).nullable().optional(),
  importedAt: z.string().max(40),
  notes: z.string().max(2000),
});

const validators = { workout, checkin, settings, health, wellness, measurement, sleep };

function validOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET() {
  const user = await getCapacityUser();
  if (!user) return Response.json({ error: "Sign in to load your workouts." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("records")
      .select("id,kind,day,payload")
      .eq("owner", user.userId)
      .order("day", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(
      { records: (data ?? []).map((row) => ({ id: row.id, kind: row.kind, day: row.day, data: row.payload })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not load your training data. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCapacityUser();
  if (!user) return Response.json({ error: "Sign in to save your workouts." }, { status: 401 });
  if (!validOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  try {
    const raw = await request.text();
    if (raw.length > 25000) return Response.json({ error: "Entry is too long." }, { status: 400 });
    const parsed = base.parse(JSON.parse(raw));
    const validator = validators[parsed.kind];
    let data: Record<string, unknown> = validator.parse(parsed.data);
    let id = parsed.id.startsWith(`${user.userId}:`)
      ? parsed.id
      : `${user.userId}:${parsed.kind === "settings" ? "settings" : parsed.id}`;
    let deduplicated = false;
    const supabase = await createServerSupabaseClient();

    if (parsed.kind === "health") {
      const { data: matches, error } = await supabase
        .from("records")
        .select("id,payload")
        .eq("owner", user.userId)
        .eq("kind", "health")
        .eq("day", parsed.day);
      if (error) throw error;
      const incoming = data as z.infer<typeof health>;
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (const row of matches ?? []) {
        const old = row.payload as z.infer<typeof health>;
        const sameSource = incoming.sourceId && old.sourceId === incoming.sourceId;
        const bothHaveStart = Boolean(incoming.startedAt && old.startedAt);
        const closeStart = bothHaveStart && Math.abs(new Date(incoming.startedAt!).getTime() - new Date(old.startedAt!).getTime()) <= 5 * 60 * 1000;
        const fallbackMatch = !bothHaveStart && (normalize(old.title || "") === normalize(incoming.title) || normalize(old.workoutType || "") === normalize(incoming.workoutType));
        const sameSession = Math.abs(Number(old.minutes) - incoming.minutes) <= 2 && (closeStart || fallbackMatch);
        if (sameSource || sameSession) {
          id = row.id;
          deduplicated = true;
          data = /garmin/i.test(incoming.provider) || !/garmin/i.test(old.provider)
            ? { ...old, ...incoming }
            : { ...incoming, ...old };
          break;
        }
      }
    }

    const { error } = await supabase.from("records").upsert(
      { id, owner: user.userId, kind: parsed.kind, day: parsed.day, payload: data },
      { onConflict: "id" },
    );
    if (error) throw error;
    return Response.json({ ok: true, deduplicated });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ error: "Please check the fields and try again." }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Save failed. Your entry is still here; please retry." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCapacityUser();
  if (!user) return Response.json({ error: "Sign in to delete this record." }, { status: 401 });
  if (!validOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  try {
    const raw = await request.text();
    if (raw.length > 1000) return Response.json({ error: "Request is too long." }, { status: 400 });
    const parsed = z.object({ id: z.string().min(1).max(200) }).parse(JSON.parse(raw));
    const id = parsed.id.startsWith(`${user.userId}:`) ? parsed.id : `${user.userId}:${parsed.id}`;
    const supabase = await createServerSupabaseClient();
    const { count, error } = await supabase
      .from("records")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("owner", user.userId);
    if (error) throw error;
    return Response.json({ ok: true, deleted: count ?? 0 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ error: "Please check the record and try again." }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Delete failed. Nothing was changed; please retry." }, { status: 503 });
  }
}
