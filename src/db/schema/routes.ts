import {
  pgTable,
  uuid,
  text,
  smallint,
  integer,
  real,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { gyms } from "./gyms";

export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortCode: text("short_code").unique().notNull(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    setterId: uuid("setter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name"),
    description: text("description"),
    holdColor: text("hold_color"),
    wallSection: text("wall_section"),
    setterGrade: smallint("setter_grade"),
    consensusGrade: smallint("consensus_grade"),
    consensusConfidence: real("consensus_confidence"),
    voteCount: integer("vote_count").default(0),
    thumbnailUrl: text("thumbnail_url"),
    isActive: boolean("is_active").default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_routes_gym_active_created").on(
      table.gymId,
      table.isActive,
      table.createdAt
    ),
    index("idx_routes_setter_active").on(
      table.setterId,
      table.isActive,
      table.createdAt
    ),
  ]
);

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
