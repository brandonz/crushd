import { z } from "zod";
import { eq, and, isNull, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../server";
import { comments } from "@/db/schema";

export const commentRouter = router({
  list: publicProcedure
    .input(
      z.object({
        routeId: z.string().uuid(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const topLevel = await ctx.db.query.comments.findMany({
        where: and(
          eq(comments.routeId, input.routeId),
          isNull(comments.parentId),
          eq(comments.isDeleted, false)
        ),
        orderBy: [asc(comments.createdAt)],
        limit: input.limit,
      });
      return topLevel;
    }),

  create: protectedProcedure
    .input(
      z.object({
        routeId: z.string().uuid(),
        body: z.string().min(1).max(2000),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .insert(comments)
        .values({
          routeId: input.routeId,
          userId: ctx.userId as unknown as string,
          body: input.body,
          parentId: input.parentId,
        })
        .returning();
      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.query.comments.findFirst({
        where: eq(comments.id, input.id),
      });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
      if (comment.userId !== (ctx.userId as unknown as string)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db
        .update(comments)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(comments.id, input.id));
      return { success: true };
    }),
});
