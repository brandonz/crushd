import { z } from "zod";
import { eq, isNull, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../server";
import { posts } from "@/db/schema";

export const postRouter = router({
  list: publicProcedure
    .input(
      z.object({
        gymId: z.string().uuid().optional(),
        routeId: z.string().uuid().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.posts.findMany({
        where: input.gymId
          ? eq(posts.gymId, input.gymId)
          : input.routeId
            ? eq(posts.routeId, input.routeId)
            : isNull(posts.deletedAt),
        limit: input.limit + 1,
        orderBy: [desc(posts.createdAt)],
      });
      const hasMore = results.length > input.limit;
      return { posts: results.slice(0, input.limit), hasMore };
    }),

  create: protectedProcedure
    .input(
      z.object({
        gymId: z.string().uuid(),
        routeId: z.string().uuid().optional(),
        type: z.enum(["text", "image", "video", "instagram"]),
        body: z.string().max(5000).optional(),
        mediaUrl: z.string().optional(),
        instagramUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .insert(posts)
        .values({
          gymId: input.gymId,
          routeId: input.routeId,
          userId: ctx.userId as unknown as string,
          type: input.type,
          body: input.body,
          mediaUrl: input.mediaUrl,
          instagramUrl: input.instagramUrl,
        })
        .returning();
      return post;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.id),
      });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.userId !== (ctx.userId as unknown as string)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(eq(posts.id, input.id));
      return { success: true };
    }),
});
