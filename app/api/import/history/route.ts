import { createHash } from "node:crypto";
import { getCapacityUser } from "../../../../lib/auth";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

type Row = Record<string, string>;
type ImportedRecord = {
  id: string;
  owner: string;
  kind: "health";
  day: string;
  payload: Record<string, unknown>;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function validOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim().replace(/^\uFEFF/, "")) ?? [];
  return rows
    .filter((values) => values.some((value) => value.trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

function number(value: string | undefined): number | null {
  if (!value || value === "--") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function durationMinutes(value: string | undefined): number {
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parts[0] || 0;
}

function timestamp(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?/);
  if (!match) throw new Error("Unsupported workout date format.");
  return `${match[1]}T${match[2]}:${match[3] ?? "00"}`;
}

function addMinutes(value: string, minutes: number): string {
  const date = new Date(`${value}Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().replace(/\.000Z$/, "");
}

function identifier(prefix: string, ...parts: string[]) {
  return `${prefix}:${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24)}`;
}

function pelotonRecords(rows: Row[], owner: string, importedAt: string): ImportedRecord[] {
  if (rows.length && !("Workout Timestamp" in rows[0]) || rows.length && !("Fitness Discipline" in rows[0])) {
    throw new Error("The Peloton file does not have the expected workout columns.");
  }

  return rows.map((row) => {
    const startedAt = timestamp(row["Workout Timestamp"]);
    const minutes = Math.max(1, Math.round(number(row["Length (minutes)"]) ?? 0));
    const instructor = row["Instructor Name"] || "";
    const discipline = row["Fitness Discipline"] || "Peloton";
    const rawDistance = number(row["Distance (km)"]);
    const rowing = /row/i.test(discipline);
    const distanceKm = rawDistance !== null && rowing && rawDistance > 200 ? rawDistance / 1000 : rawDistance;
    const sourceId = identifier("peloton-csv", startedAt, row.Title, instructor);
    const notes = [
      instructor ? `Instructor: ${instructor}` : "",
      row.Type ? `Class type: ${row.Type}` : "",
      row["Live/On-Demand"] ? `Format: ${row["Live/On-Demand"]}` : "",
    ].filter(Boolean).join(" · ");

    return {
      id: `${owner}:history:${sourceId}`,
      owner,
      kind: "health",
      day: startedAt.slice(0, 10),
      payload: {
        provider: "Peloton",
        sourceId,
        title: row.Title || `${minutes} min ${discipline}`,
        workoutType: discipline,
        minutes,
        startedAt,
        endedAt: addMinutes(startedAt, minutes),
        averageHeartRate: number(row["Avg. Heartrate"]),
        maxHeartRate: null,
        activeEnergy: number(row["Calories Burned"]),
        distanceKm,
        averageCadence: number(row["Avg. Cadence (RPM)"]),
        maxCadence: null,
        aerobicEffect: null,
        anaerobicEffect: null,
        trainingLoad: null,
        intensityMinutes: null,
        bodyBatteryBefore: null,
        bodyBatteryAfter: null,
        recoveryHours: null,
        device: "Peloton export",
        importedAt,
        notes,
        zones: [],
        instructor: instructor || null,
        discipline,
        classType: row.Type || null,
        totalOutput: number(row["Total Output"]),
        averagePower: number(row["Avg. Watts"]),
        averageResistance: number(row["Avg. Resistance"]),
        averageSpeedKph: number(row["Avg. Speed (kph)"]),
        averageIncline: number(row["Avg. Incline"]),
        averagePace: row["Avg. Pace (min/km)"] || null,
      },
    };
  });
}

function garminRecords(rows: Row[], owner: string, importedAt: string): ImportedRecord[] {
  if (rows.length && !("Activity Type" in rows[0]) || rows.length && !("Date" in rows[0])) {
    throw new Error("The Garmin file does not have the expected activity columns.");
  }

  return rows.map((row) => {
    const startedAt = timestamp(row.Date);
    const minutes = Math.max(1, Math.round(durationMinutes(row.Time)));
    const sourceId = identifier("garmin-csv", startedAt, row.Title, row.Time);
    const notes = [
      number(row["Total Reps"]) !== null ? `Reps: ${number(row["Total Reps"])}` : "",
      number(row["Total Sets"]) !== null ? `Sets: ${number(row["Total Sets"])}` : "",
    ].filter(Boolean).join(" · ");

    return {
      id: `${owner}:history:${sourceId}`,
      owner,
      kind: "health",
      day: startedAt.slice(0, 10),
      payload: {
        provider: "Garmin Connect",
        sourceId,
        title: row.Title || row["Activity Type"] || "Garmin activity",
        workoutType: row["Activity Type"] || "Workout",
        minutes,
        startedAt,
        endedAt: addMinutes(startedAt, durationMinutes(row.Time)),
        averageHeartRate: number(row["Avg HR"]),
        maxHeartRate: number(row["Max HR"]),
        activeEnergy: number(row.Calories),
        distanceKm: number(row.Distance),
        averageCadence: number(row["Avg Bike Cadence"]),
        maxCadence: number(row["Max Bike Cadence"]),
        aerobicEffect: number(row["Aerobic TE"]),
        anaerobicEffect: null,
        trainingLoad: number(row["Training Stress Score®"]),
        intensityMinutes: null,
        bodyBatteryBefore: null,
        bodyBatteryAfter: null,
        recoveryHours: null,
        device: "Garmin Connect export",
        importedAt,
        notes,
        zones: [],
        averagePower: number(row["Avg Power"]),
        maxPower: number(row["Max Power"]),
        steps: number(row.Steps),
        totalReps: number(row["Total Reps"]),
        totalSets: number(row["Total Sets"]),
        bodyBatteryDrain: number(row["Body Battery Drain"]?.replace(/^'/, "")),
      },
    };
  });
}

function startTime(payload: Record<string, unknown>) {
  const value = payload.startedAt;
  return typeof value === "string" ? Date.parse(`${value.replace(/Z$/, "")}Z`) : Number.NaN;
}

function sameSession(a: ImportedRecord, b: ImportedRecord) {
  const aStart = startTime(a.payload);
  const bStart = startTime(b.payload);
  return a.day === b.day
    && Number.isFinite(aStart)
    && Number.isFinite(bStart)
    && Math.abs(aStart - bStart) <= 5 * 60 * 1000
    && Math.abs(Number(a.payload.minutes) - Number(b.payload.minutes)) <= 2;
}

function combine(peloton: ImportedRecord[], garmin: ImportedRecord[]) {
  const combined = [...peloton];
  let deduplicated = 0;
  for (const incoming of garmin) {
    const match = combined.find((record) => sameSession(record, incoming));
    if (!match) {
      combined.push(incoming);
      continue;
    }
    match.payload = {
      ...match.payload,
      ...incoming.payload,
      provider: "Garmin Connect + Peloton",
      pelotonSourceId: match.payload.sourceId,
      notes: [match.payload.notes, incoming.payload.notes].filter(Boolean).join(" · "),
    };
    deduplicated += 1;
  }
  return { records: combined, deduplicated };
}

export async function POST(request: Request) {
  const user = await getCapacityUser();
  if (!user) return Response.json({ error: "Sign in to import workout history." }, { status: 401 });
  if (!validOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  try {
    const form = await request.formData();
    const garminFile = form.get("garmin");
    const pelotonFile = form.get("peloton");
    if (!(garminFile instanceof File) && !(pelotonFile instanceof File)) {
      return Response.json({ error: "Choose at least one Garmin or Peloton CSV file." }, { status: 400 });
    }
    for (const file of [garminFile, pelotonFile]) {
      if (file instanceof File && file.size > MAX_FILE_BYTES) {
        return Response.json({ error: `${file.name} is larger than 8 MB.` }, { status: 400 });
      }
    }

    const importedAt = new Date().toISOString();
    const peloton = pelotonFile instanceof File
      ? pelotonRecords(parseCsv(await pelotonFile.text()), user.userId, importedAt)
      : [];
    const garmin = garminFile instanceof File
      ? garminRecords(parseCsv(await garminFile.text()), user.userId, importedAt)
      : [];
    const result = combine(peloton, garmin);
    if (!result.records.length) return Response.json({ error: "No workout rows were found." }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: existingRows, error: existingError } = await supabase
      .from("records")
      .select("id,owner,kind,day,payload")
      .eq("owner", user.userId)
      .eq("kind", "health");
    if (existingError) throw existingError;
    const existing = (existingRows ?? []) as ImportedRecord[];
    let matchedExisting = 0;
    for (const record of result.records) {
      const sourceId = record.payload.sourceId;
      const match = existing.find((candidate) =>
        (typeof sourceId === "string" && candidate.payload.sourceId === sourceId) || sameSession(candidate, record),
      );
      if (!match) continue;
      record.id = match.id;
      record.payload = /garmin/i.test(String(record.payload.provider))
        ? { ...match.payload, ...record.payload }
        : { ...record.payload, ...match.payload };
      matchedExisting += 1;
    }

    for (let index = 0; index < result.records.length; index += 100) {
      const { error } = await supabase.from("records").upsert(result.records.slice(index, index + 100), { onConflict: "id" });
      if (error) throw error;
    }

    return Response.json({
      ok: true,
      imported: result.records.length,
      peloton: peloton.length,
      garmin: garmin.length,
      deduplicated: result.deduplicated + matchedExisting,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && /expected|unsupported/i.test(error.message)
      ? error.message
      : "History import failed. No source files were changed; please retry.";
    return Response.json({ error: message }, { status: 400 });
  }
}
