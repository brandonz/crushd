import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  requireGymRole,
} from "../server";
import { routes } from "@/db/schema";
import { generateShortCode } from "@/lib/short-code";

export const routeRouter = router({
  list: publicProcedure
    .input(
      z.object({
        gymId: z.string().uuid(),
        includeArchived: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(30),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.routes.findMany({
        where: input.includeArchived
          ? eq(routes.gymId, input.gymId)
          : and(eq(routes.gymId, input.gymId), eq(routes.isActive, true)),
        limit: input.limit + 1,
        orderBy: (routes, { desc }) => [desc(routes.createdAt)],
      });
      const hasMore = results.length > input.limit;
      return { routes: results.slice(0, input.limit), hasMore };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const route = await ctx.db.query.routes.findFirst({
        where: eq(routes.id, input.id),
      });
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });
      return route;
    }),

  byShortCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const route = await ctx.db.query.routes.findFirst({
        where: eq(routes.shortCode, input.code),
      });
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });
      return route;
    }),

  create: protectedProcedure
    .input(
      z.object({
        gymId: z.string().uuid(),
        name: z.string().max(100).optional(),
        description: z.string().max(1000).optional(),
        holdColor: z.string().max(50).optional(),
        wallSection: z.string().max(100).optional(),
        setterGrade: z.number().int().min(0).max(17).optional(),
      })
    )
    .use(requireGymRole("setter"))
    .mutation(async ({ ctx, input }) => {
      let shortCode: string;
      let attempts = 0;
      while (true) {
        shortCode = generateShortCode();
        const existing = await ctx.db.query.routes.findFirst({
          where: eq(routes.shortCode, shortCode),
        });
        if (!existing) break;
        if (++attempts > 5)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate unique short code",
          });
      }

      const [route] = await ctx.db
        .insert(routes)
        .values({
          ...input,
          shortCode: shortCode!,
          setterId: ctx.userId as unknown as string,
        })
        .returning();
      return route;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        gymId: z.string().uuid(),
        name: z.string().max(100).optional(),
        description: z.string().max(1000).optional(),
        holdColor: z.string().max(50).optional(),
        wallSection: z.string().max(100).optional(),
        setterGrade: z.number().int().min(0).max(17).optional(),
      })
    )
    .use(requireGymRole("setter"))
    .mutation(async ({ ctx, input }) => {
      const { id, gymId: _gymId, ...data } = input;
      const [updated] = await ctx.db
        .update(routes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(routes.id, id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), gymId: z.string().uuid() }))
    .use(requireGymRole("setter"))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(routes)
        .set({
          isActive: false,
          archivedAt: new Date(),
          archivedBy: ctx.userId as unknown as string,
          updatedAt: new Date(),
        })
        .where(and(eq(routes.id, input.id), eq(routes.gymId, input.gymId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
