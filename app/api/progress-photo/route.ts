import { getCapacityUser } from "../../../lib/auth";
import { hasValidOrigin } from "../../../lib/request";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const BUCKET = "progress-photos";
const safeKey = (userId: string, key: string) =>
  key.startsWith(`${userId}/`) && /^[A-Za-z0-9_\-./]+$/.test(key);

export async function POST(request: Request) {
  const user = await getCapacityUser();
  if (!user) return Response.json({ error: "Sign in to upload a photo." }, { status: 401 });
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) return Response.json({ error: "Choose a photo." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Photo must be smaller than 8 MB." }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return Response.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `${user.userId}/${crypto.randomUUID()}.${extension}`;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return Response.json({ key });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Photo upload failed. Please try again." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const user = await getCapacityUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!safeKey(user.userId, key)) return new Response("Not found", { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error || !data) return new Response("Not found", { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
