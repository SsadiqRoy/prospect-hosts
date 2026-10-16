"use server";
import { createClient } from "@/lib/supabase/server";
import { prospectSchema, duplicateKey } from "@/lib/prospects";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
export async function workspace() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  const { data: member, error } = await db
    .from("workspace_members")
    .select("user_id,role,name")
    .eq("user_id", user.id)
    .single();
  if (error || !member)
    throw new Error("You do not have access to this workspace.");
  return { db, user, member };
}
export async function login(email: string, password: string) {
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };
  try {
    await workspace();
  } catch {
    await db.auth.signOut();
    return { error: "Your account does not have workspace access." };
  }
  revalidatePath("/");
  return { ok: true };
}
export async function logout() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
export async function saveProspect(input: unknown, id?: string) {
  try {
    const p = prospectSchema.parse(input);
    const { db, user } = await workspace();
    const payload = {
      ...p,
      last_contacted: p.last_contacted || null,
      next_follow_up: p.next_follow_up || null,
    };
    const query = id
      ? db.from("prospects").update(payload).eq("id", z.uuid().parse(id))
      : db.from("prospects").insert({ ...payload, created_by: user.id });
    const { error } = await query.select("id").single();
    if (error) throw error;
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not save prospect.",
    };
  }
}
export async function changeProspect(
  id: string,
  change: { status?: string; archived?: boolean } | "remove",
) {
  try {
    z.uuid().parse(id);
    const { db } = await workspace();
    let query;
    if (change === "remove") {
      query = db.from("prospects").delete().eq("id", id);
    } else {
      const patch = z
        .object({
          status: prospectSchema.shape.status.optional(),
          archived: z.boolean().optional(),
        })
        .strict()
        .parse(change);
      query = db.from("prospects").update(patch).eq("id", id);
    }
    const { error } = await query.select("id").single();
    if (error) throw error;
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not update prospect.",
    };
  }
}
export async function importProspects(input: unknown) {
  try {
    const rows = z.array(prospectSchema).min(1).max(2000).parse(input);
    const { db, user } = await workspace();
    const { data: existing, error: readError } = await db
      .from("prospects")
      .select("name,location");
    if (readError) throw readError;
    const seen = new Set((existing ?? []).map(duplicateKey));
    const fresh = rows.filter((p) => {
      const key = duplicateKey(p);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fresh.length) {
      const { error } = await db
        .from("prospects")
        .insert(
          fresh.map((p) => ({
            ...p,
            created_by: user.id,
            last_contacted: p.last_contacted || null,
            next_follow_up: p.next_follow_up || null,
          })),
        );
      if (error) throw error;
    }
    revalidatePath("/");
    return {
      ok: true,
      added: fresh.length,
      skipped: rows.length - fresh.length,
    };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Import failed. No rows were imported.",
    };
  }
}
export async function updateAccount(input: {
  name: string;
  email: string;
  password: string;
  currentPassword: string;
}) {
  try {
    const p = z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.email(),
        password: z.union([z.literal(""), z.string().min(8).max(128)]),
        currentPassword: z.string().min(1),
      })
      .parse(input);
    const { db, user } = await workspace();
    const { error: check } = await db.auth.signInWithPassword({
      email: user.email!,
      password: p.currentPassword,
    });
    if (check) throw new Error("Current password is incorrect.");
    const { error } = await db.auth.updateUser({
      data: { name: p.name },
      ...(p.email !== user.email ? { email: p.email } : {}),
      ...(p.password ? { password: p.password } : {}),
    });
    if (error) throw error;
    const { error: profileError } = await db
      .from("workspace_members")
      .update({ name: p.name })
      .eq("user_id", user.id);
    if (profileError) throw profileError;
    revalidatePath("/");
    return {
      ok: true,
      message:
        p.email !== user.email
          ? "Saved. Confirm the email change using the links sent to your current and new email addresses."
          : "Account updated.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not update account.",
    };
  }
}
