import { describe, it, expectTypeOf } from "vitest";
import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import {
  createQuery,
  createRelayQuery,
  createCursorQuery,
  type InferWhere,
  type InferOrder,
  type InferOrderPath,
  type InferSelect,
  type InferSelectPath,
  type InferResult,
  type InferExecuteOptions,
  type InferRelayInput,
  type InferCursorInput,
  type FilterOperators,
} from "../index.js";

// Test table
const warehouses = pgTable("warehouses", {
  projectId: uuid("project_id").notNull(),
  id: uuid("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Create queries
const warehouseQuery = createQuery(warehouses).maxLimit(100).defaultLimit(20);
const warehouseRelayQuery = createRelayQuery(warehouseQuery, { tieBreaker: "id" });
const warehouseCursorQuery = createCursorQuery(warehouseQuery, { tieBreaker: "id" });

describe("Type inference utilities", () => {
  describe("InferWhere", () => {
    it("should infer where type with all fields", () => {
      type WarehouseWhere = InferWhere<typeof warehouseQuery>;

      // Should allow simple equality
      expectTypeOf<WarehouseWhere>().toMatchTypeOf<{
        id?: string | FilterOperators<string> | null;
        name?: string | FilterOperators<string> | null;
        code?: string | FilterOperators<string> | null;
        isDefault?: boolean | FilterOperators<boolean> | null;
      }>();

      // Should allow _and, _or, _not
      expectTypeOf<WarehouseWhere>().toMatchTypeOf<{
        _and?: WarehouseWhere[];
        _or?: WarehouseWhere[];
        _not?: WarehouseWhere;
      }>();
    });

    it("should work with RelayQueryBuilder", () => {
      type RelayWhere = InferWhere<typeof warehouseRelayQuery>;

      expectTypeOf<RelayWhere>().toMatchTypeOf<{
        id?: string | FilterOperators<string> | null;
        name?: string | FilterOperators<string> | null;
      }>();
    });

    it("should work with CursorQueryBuilder", () => {
      type CursorWhere = InferWhere<typeof warehouseCursorQuery>;

      expectTypeOf<CursorWhere>().toMatchTypeOf<{
        id?: string | FilterOperators<string> | null;
        name?: string | FilterOperators<string> | null;
      }>();
    });
  });

  describe("InferOrderPath", () => {
    it("should infer order path union", () => {
      type OrderPath = InferOrderPath<typeof warehouseQuery>;

      // Should include field names with optional direction
      expectTypeOf<"id">().toMatchTypeOf<OrderPath>();
      expectTypeOf<"id:asc">().toMatchTypeOf<OrderPath>();
      expectTypeOf<"id:desc">().toMatchTypeOf<OrderPath>();
      expectTypeOf<"name">().toMatchTypeOf<OrderPath>();
      expectTypeOf<"createdAt:desc">().toMatchTypeOf<OrderPath>();
    });
  });

  describe("InferOrder", () => {
    it("should infer order array type", () => {
      type Order = InferOrder<typeof warehouseQuery>;

      expectTypeOf<Order>().toMatchTypeOf<string[]>();
      expectTypeOf<["id:asc", "name:desc"]>().toMatchTypeOf<Order>();
    });
  });

  describe("InferSelectPath", () => {
    it("should infer select path union", () => {
      type SelectPath = InferSelectPath<typeof warehouseQuery>;

      expectTypeOf<"id">().toMatchTypeOf<SelectPath>();
      expectTypeOf<"name">().toMatchTypeOf<SelectPath>();
      expectTypeOf<"code">().toMatchTypeOf<SelectPath>();
      expectTypeOf<"isDefault">().toMatchTypeOf<SelectPath>();
    });
  });

  describe("InferSelect", () => {
    it("should infer select array type", () => {
      type Select = InferSelect<typeof warehouseQuery>;

      expectTypeOf<Select>().toMatchTypeOf<string[]>();
      expectTypeOf<["id", "name", "code"]>().toMatchTypeOf<Select>();
    });
  });

  describe("InferResult", () => {
    it("should infer result type from FluentQueryBuilder", () => {
      type Result = InferResult<typeof warehouseQuery>;

      expectTypeOf<Result>().toMatchTypeOf<{
        id: string;
        name: string;
        code: string;
        isDefault: boolean;
        projectId: string;
        createdAt: Date;
        updatedAt: Date;
      }>();
    });

    it("should infer result type from RelayQueryBuilder", () => {
      type Result = InferResult<typeof warehouseRelayQuery>;

      expectTypeOf<Result>().toMatchTypeOf<{
        id: string;
        name: string;
      }>();
    });

    it("should infer result type from CursorQueryBuilder", () => {
      type Result = InferResult<typeof warehouseCursorQuery>;

      expectTypeOf<Result>().toMatchTypeOf<{
        id: string;
        name: string;
      }>();
    });
  });

  describe("InferExecuteOptions", () => {
    it("should infer full execute options", () => {
      type Options = InferExecuteOptions<typeof warehouseQuery>;

      expectTypeOf<Options>().toMatchTypeOf<{
        where?: InferWhere<typeof warehouseQuery>;
        order?: InferOrder<typeof warehouseQuery>;
        select?: InferSelect<typeof warehouseQuery>;
        limit?: number;
        offset?: number;
      }>();
    });
  });

  describe("InferRelayInput", () => {
    it("should infer relay query input", () => {
      type Input = InferRelayInput<typeof warehouseRelayQuery>;

      expectTypeOf<Input>().toMatchTypeOf<{
        first?: number;
        after?: string;
        last?: number;
        before?: string;
        where?: InferWhere<typeof warehouseRelayQuery>;
        order?: InferOrder<typeof warehouseRelayQuery>;
        select?: InferSelect<typeof warehouseRelayQuery>;
      }>();
    });
  });

  describe("InferCursorInput", () => {
    it("should infer cursor query input", () => {
      type Input = InferCursorInput<typeof warehouseCursorQuery>;

      expectTypeOf<Input>().toMatchTypeOf<{
        limit: number;
        direction: "forward" | "backward";
        cursor?: string;
        where?: InferWhere<typeof warehouseCursorQuery>;
        order?: InferOrder<typeof warehouseCursorQuery>;
        select?: InferSelect<typeof warehouseCursorQuery>;
      }>();
    });
  });
});

// =============================================================================
// Usage examples (compile-time only - type checking)
// =============================================================================

// Example 1: Type-safe where in function signature
type _GetWarehousesWhere = InferWhere<typeof warehouseQuery>;

// Example 2: Type-safe order
type _GetWarehousesOrder = InferOrder<typeof warehouseQuery>;

// Example 3: Combined options
type _QueryWarehousesOptions = InferExecuteOptions<typeof warehouseQuery>;

// Example 4: Relay pagination
type _RelayInput = InferRelayInput<typeof warehouseRelayQuery>;

// Example 5: Cursor pagination
type _CursorInput = InferCursorInput<typeof warehouseCursorQuery>;
