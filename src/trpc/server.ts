import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/db";
import { gymMemberships } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { GymRole } from "@/db/schema";

export type Context = {
  userId: string | null;
  db: typeof db;
};

export async function createContext(): Promise<Context> {
  const { userId } = await auth();
  return {
    userId,
    db,
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

const GYM_ROLE_HIERARCHY: Record<GymRole, number> = {
  member: 0,
  setter: 1,
  admin: 2,
  owner: 3,
};

export function hasRole(userRole: GymRole, minRole: GymRole): boolean {
  return GYM_ROLE_HIERARCHY[userRole] >= GYM_ROLE_HIERARCHY[minRole];
}

export const requireGymRole = (minRole: GymRole) =>
  t.middleware(async ({ ctx, input: rawInput, next }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    const input = rawInput as { gymId?: string };
    if (!input.gymId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "gymId required" });
    }

    const member = await db.query.gymMemberships.findFirst({
      where: and(
        eq(gymMemberships.gymId, input.gymId),
        // gymMemberships stores userId referencing users.clerkId via our sync
        eq(gymMemberships.userId, ctx.userId as unknown as string)
      ),
    });

    if (!member || !hasRole(member.role, minRole)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({ ctx: { ...ctx, gymRole: member.role } });
  });
