import { workspace } from "./actions";
import Dashboard from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { db, user, member } = await workspace();
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error("Unable to load prospects. Please try again.");
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return (
    <Dashboard
      prospects={rows.map((p) => ({
        ...p,
        last_contacted: p.last_contacted ?? "",
        next_follow_up: p.next_follow_up ?? "",
      }))}
      account={{ name: member.name, email: user.email!, role: member.role }}
    />
  );
}
