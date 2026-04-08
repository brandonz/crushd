import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(webhookSecret);
  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, username, first_name, last_name, image_url } = event.data;
    const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || "Climber";
    const finalUsername = username ?? `user_${id.slice(-8)}`;

    await db
      .insert(users)
      .values({
        clerkId: id,
        username: finalUsername,
        displayName,
        avatarUrl: image_url,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          username: finalUsername,
          displayName,
          avatarUrl: image_url,
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({ success: true });
}
