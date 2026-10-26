import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Accounts. Email is stored lowercased and unique. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_unique").on(t.email)]);

/** Opaque session tokens stored as a SHA-256 hash. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

/** One public card per account. */
export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  headline: text("headline"),
  company: text("company"),
  bio: text("bio"),
  location: text("location"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  github: text("github"),
  instagram: text("instagram"),
  accent: text("accent").notNull().default("lime"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  links: jsonb("links").$type<{ label: string; url: string }[]>().notNull().default([]),
  isPublic: boolean("is_public").notNull().default(true),
  collectLeads: boolean("collect_leads").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("cards_slug_unique").on(t.slug), uniqueIndex("cards_user_unique").on(t.userId)]);

/** Avatar images kept out of the main card row. Base64 in Postgres keeps setup dependency-free. */
export const avatars = pgTable("avatars", {
  cardId: uuid("card_id")
    .primaryKey()
    .references(() => cards.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every public card visit, used for the dashboard numbers. */
export const cardViews = pgTable("card_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("card_views_card_idx").on(t.cardId, t.createdAt)]);

/** Shared fixed-window counters for abuse-sensitive API routes. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (t) => [index("rate_limits_reset_at_idx").on(t.resetAt)]);

/** People in a user's wallet. cardId points at their Tappd card when they have one. */
export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cardId: uuid("card_id").references(() => cards.id, { onDelete: "set null" }),
  connectionUserId: uuid("connection_user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  headline: text("headline"),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  location: text("location"),
  bio: text("bio"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  notes: text("notes"),
  /** Local calendar date to follow up; ISO YYYY-MM-DD avoids timezone shifts. */
  followUpDate: text("follow_up_date"),
  favorite: boolean("favorite").notNull().default(false),
  source: text("source").notNull().default("manual"),
  metAt: timestamp("met_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("connections_owner_idx").on(t.ownerId, t.updatedAt),
  index("connections_follow_up_idx").on(t.ownerId, t.followUpDate),
  uniqueIndex("connections_owner_card_unique").on(t.ownerId, t.cardId),
]);

export const usersRelations = relations(users, ({ one, many }) => ({
  card: one(cards, { fields: [users.id], references: [cards.userId] }),
  connections: many(connections),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
  avatar: one(avatars, { fields: [cards.id], references: [avatars.cardId] }),
}));

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type CardLink = { label: string; url: string };
