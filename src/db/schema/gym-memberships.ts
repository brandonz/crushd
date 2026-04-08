import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { gyms } from "./gyms";

export const gymRoleEnum = pgEnum("gym_role", [
  "owner",
  "admin",
  "setter",
  "member",
]);

export const gymMemberships = pgTable(
  "gym_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: gymRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    invitedBy: uuid("invited_by").references(() => users.id),
  },
  (table) => [
    unique().on(table.gymId, table.userId),
    index("idx_gym_memberships_user").on(table.userId),
  ]
);

export type GymMembership = typeof gymMemberships.$inferSelect;
export type NewGymMembership = typeof gymMemberships.$inferInsert;
export type GymRole = (typeof gymRoleEnum.enumValues)[number];
