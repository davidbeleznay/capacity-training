import { isSupabaseConfigured } from "./supabase/config";
import { createServerSupabaseClient } from "./supabase/server";

export type CapacityUser = {
  userId: string;
  displayName: string;
  email: string;
};

export async function getCapacityUser(): Promise<CapacityUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  const fullName = user.user_metadata?.full_name;
  return {
    userId: user.id,
    email: user.email,
    displayName: typeof fullName === "string" ? fullName : user.email,
  };
}
