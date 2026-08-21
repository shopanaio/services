import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  CanonicalCollectionRule,
  CollectionDefaultSort,
  CollectionDefaultSortDirection,
  CollectionType,
} from "@shopana/broker-types";
import { listingSchema } from "./schema.js";

export const collectionState = listingSchema.table(
  "collection_state",
  {
    storeId: uuid("store_id").notNull(),
    collectionId: uuid("collection_id").notNull(),
    collectionType: varchar("collection_type", { length: 16 }).$type<CollectionType>().notNull(),
    defaultSort: varchar("default_sort", { length: 32 }).$type<CollectionDefaultSort>().notNull(),
    defaultSortDirection: varchar("default_sort_direction", {
      length: 4,
    })
      .$type<CollectionDefaultSortDirection>()
      .notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
      mode: "string",
    }),
    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
      mode: "string",
    }),
    rulesJson: jsonb("rules_json").$type<CanonicalCollectionRule[]>().notNull(),
    rulesHash: text("rules_hash").notNull(),
    payloadHash: text("payload_hash").notNull(),
    eventSequence: bigint("event_sequence", { mode: "number" }).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    projectedAt: timestamp("projected_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.collectionId] }),
    check("collection_state_type_check", sql`${table.collectionType} IN ('manual', 'rule')`),
    check(
      "collection_state_sort_check",
      sql`${table.defaultSort} IN ('manual', 'price', 'newest', 'name')`,
    ),
    check(
      "collection_state_sort_direction_check",
      sql`${table.defaultSortDirection} IN ('asc', 'desc')`,
    ),
    check(
      "collection_state_sort_pair_check",
      sql`(${table.defaultSort} = 'manual' AND ${table.defaultSortDirection} = 'asc')
        OR (${table.defaultSort} = 'newest' AND ${table.defaultSortDirection} = 'desc')
        OR (${table.defaultSort} IN ('price', 'name') AND ${table.defaultSortDirection} IN ('asc', 'desc'))`,
    ),
    check(
      "collection_state_rule_sort_check",
      sql`${table.collectionType} != 'rule' OR ${table.defaultSort} != 'manual'`,
    ),
    check(
      "collection_state_manual_rules_check",
      sql`${table.collectionType} != 'manual' OR ${table.rulesJson} = '[]'::jsonb`,
    ),
    check(
      "collection_state_event_sequence_check",
      sql`${table.eventSequence} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      "collection_state_rules_hash_check",
      sql`${table.rulesHash} ~ '^sha256:v1:[0-9a-f]{64}$'`,
    ),
    check(
      "collection_state_payload_hash_check",
      sql`${table.payloadHash} ~ '^sha256:v1:[0-9a-f]{64}$'`,
    ),
    index("idx_collection_state_visibility").on(
      table.storeId,
      table.publishedAt,
      table.effectiveFrom,
      table.effectiveTo,
    ),
  ],
);

export const collectionTombstone = listingSchema.table(
  "collection_tombstone",
  {
    storeId: uuid("store_id").notNull(),
    collectionId: uuid("collection_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    eventSequence: bigint("event_sequence", { mode: "number" }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    projectedAt: timestamp("projected_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.collectionId] }),
    check(
      "collection_tombstone_event_sequence_check",
      sql`${table.eventSequence} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      "collection_tombstone_payload_hash_check",
      sql`${table.payloadHash} ~ '^sha256:v1:[0-9a-f]{64}$'`,
    ),
  ],
);

export type CollectionState = typeof collectionState.$inferSelect;
export type CollectionTombstone = typeof collectionTombstone.$inferSelect;
