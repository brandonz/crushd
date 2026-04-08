import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  requireGymRole,
} from "../server";
import { gyms, gymMemberships } from "@/db/schema";

export const gymRouter = router({
  list: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.gyms.findMany({
        where: isNull(gyms.deletedAt),
        limit: input.limit + 1,
        orderBy: (gyms, { desc }) => [desc(gyms.createdAt)],
      });
      const hasMore = results.length > input.limit;
      return {
        gyms: results.slice(0, input.limit),
        hasMore,
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const gym = await ctx.db.query.gyms.findFirst({
        where: and(eq(gyms.slug, input.slug), isNull(gyms.deletedAt)),
      });
      if (!gym) throw new TRPCError({ code: "NOT_FOUND" });
      return gym;
    }),

  create: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        country: z.string().max(10).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [gym] = await ctx.db
        .insert(gyms)
        .values({ ...input })
        .returning();
      // Add creator as owner
      await ctx.db.insert(gymMemberships).values({
        gymId: gym.id,
        userId: ctx.userId as unknown as string,
        role: "owner",
      });
      return gym;
    }),

  update: protectedProcedure
    .input(
      z.object({
        gymId: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        instagramHandle: z.string().optional(),
        websiteUrl: z.string().url().optional(),
      })
    )
    .use(requireGymRole("admin"))
    .mutation(async ({ ctx, input }) => {
      const { gymId, ...data } = input;
      const [updated] = await ctx.db
        .update(gyms)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(gyms.id, gymId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  listMembers: protectedProcedure
    .input(z.object({ gymId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.gymMemberships.findMany({
        where: eq(gymMemberships.gymId, input.gymId),
      });
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        gymId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["admin", "setter", "member"]),
      })
    )
    .use(requireGymRole("owner"))
    .mutation(async ({ ctx, input }) => {
      const [membership] = await ctx.db
        .insert(gymMemberships)
        .values({
          gymId: input.gymId,
          userId: input.userId as unknown as string,
          role: input.role,
          invitedBy: ctx.userId as unknown as string,
        })
        .onConflictDoUpdate({
          target: [gymMemberships.gymId, gymMemberships.userId],
          set: { role: input.role },
        })
        .returning();
      return membership;
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        gymId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .use(requireGymRole("owner"))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(gymMemberships)
        .where(
          and(
            eq(gymMemberships.gymId, input.gymId),
            eq(gymMemberships.userId, input.userId as unknown as string)
          )
        );
      return { success: true };
    }),
});
