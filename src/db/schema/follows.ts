import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { gyms } from "./gyms";

export const followeeTypeEnum = pgEnum("followee_type", ["user", "gym"]);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeType: followeeTypeEnum("followee_type").notNull(),
    followeeUserId: uuid("followee_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    followeeGymId: uuid("followee_gym_id").references(() => gyms.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique().on(table.followerId, table.followeeType, table.followeeUserId),
    unique().on(table.followerId, table.followeeType, table.followeeGymId),
    index("idx_follows_follower_gym").on(
      table.followerId,
      table.followeeGymId
    ),
    index("idx_follows_follower_user").on(
      table.followerId,
      table.followeeUserId
    ),
    index("idx_follows_followee_user").on(table.followeeUserId),
    check(
      "follows_type_check",
      sql`(${table.followeeType} = 'user' AND ${table.followeeUserId} IS NOT NULL AND ${table.followeeGymId} IS NULL) OR (${table.followeeType} = 'gym' AND ${table.followeeGymId} IS NOT NULL AND ${table.followeeUserId} IS NULL)`
    ),
  ]
);

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
