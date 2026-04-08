import { NextResponse } from "next/server";
import { db } from "@/db";
import { routes, gyms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const route = await db.query.routes.findFirst({
    where: eq(routes.shortCode, code),
    with: {
      gym: true,
    },
  });

  if (!route) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gym = await db.query.gyms.findFirst({
    where: eq(gyms.id, route.gymId),
  });

  if (!gym) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crushd.app";
  return NextResponse.redirect(
    `${appUrl}/gyms/${gym.slug}/routes/${route.id}`,
    307
  );
}
