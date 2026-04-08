import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { gyms } from "./gyms";
import { routes } from "./routes";

export const postTypeEnum = pgEnum("post_type", [
  "text",
  "image",
  "video",
  "instagram",
]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id").references(() => routes.id, {
      onDelete: "cascade",
    }),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: postTypeEnum("type").notNull(),
    body: text("body"),
    mediaUrl: text("media_url"),
    mediaThumbnailUrl: text("media_thumbnail_url"),
    instagramUrl: text("instagram_url"),
    instagramMediaId: text("instagram_media_id"),
    oembedPayload: jsonb("oembed_payload"),
    oembedCachedAt: timestamp("oembed_cached_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_posts_gym_created").on(table.gymId, table.createdAt),
    index("idx_posts_user_created").on(table.userId, table.createdAt),
    index("idx_posts_route_created").on(table.routeId, table.createdAt),
  ]
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
