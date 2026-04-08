import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const gyms = pgTable(
  "gyms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").unique().notNull(),
    name: text("name").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country").default("US"),
    instagramHandle: text("instagram_handle"),
    websiteUrl: text("website_url"),
    timezone: text("timezone").default("America/Los_Angeles"),
    isVerified: boolean("is_verified").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("idx_gyms_slug").on(table.slug)]
);

export type Gym = typeof gyms.$inferSelect;
export type NewGym = typeof gyms.$inferInsert;
