import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  real,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { routes } from "./routes";
import { gyms } from "./gyms";
import { posts } from "./posts";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: uuid("uploader_id")
    .notNull()
    .references(() => users.id),
  routeId: uuid("route_id").references(() => routes.id, {
    onDelete: "set null",
  }),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "set null" }),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
  type: mediaTypeEnum("type").notNull(),
  storageKey: text("storage_key").unique().notNull(),
  cdnUrl: text("cdn_url").notNull(),
  thumbnailKey: text("thumbnail_key"),
  width: integer("width"),
  height: integer("height"),
  durationSecs: real("duration_secs"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
