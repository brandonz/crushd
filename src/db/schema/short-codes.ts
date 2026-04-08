import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { routes } from "./routes";

export const shortCodes = pgTable("short_codes", {
  code: text("code").primaryKey(),
  routeId: uuid("route_id")
    .unique()
    .notNull()
    .references(() => routes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type ShortCode = typeof shortCodes.$inferSelect;
export type NewShortCode = typeof shortCodes.$inferInsert;
