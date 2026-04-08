import {
  pgTable,
  uuid,
  smallint,
  timestamp,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { routes } from "./routes";

export const gradeVotes = pgTable(
  "grade_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique().on(table.routeId, table.userId),
    index("idx_grade_votes_route").on(table.routeId),
    check("grade_range", sql`${table.grade} BETWEEN 0 AND 17`),
  ]
);

export type GradeVote = typeof gradeVotes.$inferSelect;
export type NewGradeVote = typeof gradeVotes.$inferInsert;
