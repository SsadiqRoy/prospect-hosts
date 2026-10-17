import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
Deno.serve(async (req) => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    const { data: member } = await admin
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (member?.role !== "admin")
      return json({ error: "Administrator access required" }, 403);
    if (req.method === "GET") {
      const { data: members, error } = await admin
        .from("workspace_members")
        .select("*")
        .order("created_at");
      if (error) throw error;
      const users = await Promise.all(
        members.map(async (m) => {
          const { data } = await admin.auth.admin.getUserById(m.user_id);
          return { ...m, email: data.user?.email ?? "" };
        }),
      );
      return json({ users });
    }
    if (req.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    const p = await req.json();
    if (
      typeof p.email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(p.email) ||
      typeof p.password !== "string" ||
      p.password.length < 8 ||
      p.password.length > 128 ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 100 ||
      !["member", "admin"].includes(p.role)
    )
      return json(
        {
          error:
            "Enter a valid name, email, role and password of at least 8 characters.",
        },
        400,
      );
    const { data, error: createError } = await admin.auth.admin.createUser({
      email: p.email,
      password: p.password,
      email_confirm: true,
      user_metadata: { name: p.name.trim() },
    });
    if (createError) return json({ error: createError.message }, 400);
    const { error: memberError } = await admin
      .from("workspace_members")
      .insert({ user_id: data.user.id, name: p.name.trim(), role: p.role });
    if (memberError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw memberError;
    }
    return json({ ok: true }, 201);
  } catch {
    return json({ error: "Unable to complete user management request." }, 500);
  }
});
