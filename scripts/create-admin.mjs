// Trusted, local-only bootstrap. Never expose this as an HTTP endpoint.
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Administrator";
if (!url || !key || !email || !password)
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_EMAIL and ADMIN_PASSWORD in your local environment.");
const db = createClient(url, key, { auth: { persistSession: false } });
const { count, error: readError } = await db.from("workspace_members").select("*", { count: "exact", head: true });
if (readError) throw readError;
if (count !== 0) throw new Error("Workspace is already initialized. Use Manage users inside the app.");
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
});

if (error) throw error;
const { error: memberError } = await db.from("workspace_members").insert({ user_id: data.user.id, name, role: "admin" });
if (memberError) {
  await db.auth.admin.deleteUser(data.user.id);
  throw memberError;
}
console.log("Administrator created successfully. Sign in to your app.");
