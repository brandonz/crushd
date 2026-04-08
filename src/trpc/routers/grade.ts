import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../server";
import { gradeVotes } from "@/db/schema";

export const gradeRouter = router({
  vote: protectedProcedure
    .input(
      z.object({
        routeId: z.string().uuid(),
        grade: z.number().int().min(0).max(17),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [vote] = await ctx.db
        .insert(gradeVotes)
        .values({
          routeId: input.routeId,
          userId: ctx.userId as unknown as string,
          grade: input.grade,
        })
        .onConflictDoUpdate({
          target: [gradeVotes.routeId, gradeVotes.userId],
          set: { grade: input.grade, updatedAt: new Date() },
        })
        .returning();
      return vote;
    }),

  myVote: protectedProcedure
    .input(z.object({ routeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.gradeVotes.findFirst({
        where: and(
          eq(gradeVotes.routeId, input.routeId),
          eq(gradeVotes.userId, ctx.userId as unknown as string)
        ),
      });
    }),

  distribution: publicProcedure
    .input(z.object({ routeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const votes = await ctx.db.query.gradeVotes.findMany({
        where: eq(gradeVotes.routeId, input.routeId),
      });
      const distribution: Record<number, number> = {};
      for (const vote of votes) {
        distribution[vote.grade] = (distribution[vote.grade] ?? 0) + 1;
      }
      return { votes: votes.length, distribution };
    }),
});
