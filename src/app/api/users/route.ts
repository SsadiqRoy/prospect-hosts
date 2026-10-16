import { workspace } from "@/app/actions";
import { NextResponse } from "next/server";
async function forward(request: Request) {
  try {
    const { db, member } = await workspace();
    if (member.role !== "admin")
      return NextResponse.json(
        { error: "Administrator access required" },
        { status: 403 },
      );
    if (
      request.method === "POST" &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const {
      data: { session },
    } = await db.auth.getSession();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        },
        ...(request.method === "POST"
          ? { body: JSON.stringify(await request.json()) }
          : {}),
        cache: "no-store",
      },
    );
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to manage users. Please sign in again." },
      { status: 401 },
    );
  }
}
export const GET = forward;
export const POST = forward;
