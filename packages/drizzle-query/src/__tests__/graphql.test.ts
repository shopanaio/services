import { describe, it, expect } from "vitest";
import { pgTable, text, timestamp, boolean, uuid, integer } from "drizzle-orm/pg-core";
import {
  createQuery,
  createRelayQuery,
  generateGraphQLTypes,
  generateBaseFilterTypes,
  generateWhereInputType,
  generateOrderByInputType,
} from "../index.js";

// Test table
const warehouses = pgTable("warehouses", {
  projectId: uuid("project_id").notNull(),
  id: uuid("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Create query
const warehouseQuery = createQuery(warehouses).maxLimit(100).defaultLimit(20);
const warehouseRelayQuery = createRelayQuery(warehouseQuery, { tieBreaker: "id" });

describe("GraphQL type generation", () => {
  describe("generateGraphQLTypes", () => {
    it("should generate all type definitions", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse");

      expect(types.fields).toContain("id");
      expect(types.fields).toContain("name");
      expect(types.fields).toContain("code");
      expect(types.fields).toContain("isDefault");
      expect(types.fields).toContain("createdAt");

      // Check WhereInput
      expect(types.whereInput).toContain("input WarehouseWhereInput");
      expect(types.whereInput).toContain("AND: [WarehouseWhereInput!]");
      expect(types.whereInput).toContain("OR: [WarehouseWhereInput!]");
      expect(types.whereInput).toContain("NOT: WarehouseWhereInput");
      expect(types.whereInput).toContain("id: IDFilter");
      expect(types.whereInput).toContain("name: StringFilter");
      expect(types.whereInput).toContain("isDefault: BooleanFilter");
      expect(types.whereInput).toContain("createdAt: DateTimeFilter");

      // Check OrderByInput
      expect(types.orderByInput).toContain("enum WarehouseOrderField");
      expect(types.orderByInput).toContain("input WarehouseOrderByInput");
      expect(types.orderByInput).toContain("field: WarehouseOrderField!");
      expect(types.orderByInput).toContain("direction: SortDirection!");

      // Check order enum
      expect(types.orderEnum).toContain("enum WarehouseSortOrder");
      expect(types.orderEnum).toContain("ID_ASC");
      expect(types.orderEnum).toContain("ID_DESC");
      expect(types.orderEnum).toContain("NAME_ASC");

      // Check query input
      expect(types.queryInput).toContain("input WarehouseQueryInput");
      expect(types.queryInput).toContain("where: WarehouseWhereInput");
      expect(types.queryInput).toContain("orderBy: [WarehouseOrderByInput!]");
      expect(types.queryInput).toContain("limit: Int");
      expect(types.queryInput).toContain("offset: Int");

      // Check relay input
      expect(types.relayInput).toContain("input WarehouseConnectionInput");
      expect(types.relayInput).toContain("first: Int");
      expect(types.relayInput).toContain("after: String");
      expect(types.relayInput).toContain("last: Int");
      expect(types.relayInput).toContain("before: String");
    });

    it("should include base types by default", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse");

      expect(types.typeDefs).toContain("input StringFilter");
      expect(types.typeDefs).toContain("input IDFilter");
      expect(types.typeDefs).toContain("input IntFilter");
      expect(types.typeDefs).toContain("input FloatFilter");
      expect(types.typeDefs).toContain("input BooleanFilter");
      expect(types.typeDefs).toContain("input DateTimeFilter");
      expect(types.typeDefs).toContain("enum SortDirection");
    });

    it("should exclude base types when requested", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        includeBaseTypes: false,
      });

      expect(types.typeDefs).not.toContain("input StringFilter");
      expect(types.typeDefs).toContain("input WarehouseWhereInput");
    });

    it("should work with RelayQueryBuilder", () => {
      const types = generateGraphQLTypes(warehouseRelayQuery, "Warehouse");

      expect(types.fields).toContain("id");
      expect(types.whereInput).toContain("input WarehouseWhereInput");
    });

    it("should respect field type overrides", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        fieldTypes: {
          code: "ID",
          itemCount: "Int",
        },
        includeBaseTypes: false,
      });

      expect(types.whereInput).toContain("code: IDFilter");
      expect(types.whereInput).toContain("itemCount: IntFilter");
    });

    it("should exclude specified fields via options", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        excludeFields: ["projectId", "updatedAt"],
        includeBaseTypes: false,
      });

      expect(types.whereInput).not.toContain("projectId:");
      expect(types.whereInput).not.toContain("updatedAt:");
      expect(types.whereInput).toContain("id:");
      expect(types.whereInput).toContain("createdAt:");
    });

    it("should exclude fields from query.excludeFromFilter()", () => {
      // Create query with excludeFromFilter
      const queryWithExclude = createQuery(warehouses)
        .excludeFromFilter(["projectId", "updatedAt"]);

      const types = generateGraphQLTypes(queryWithExclude, "Warehouse", {
        includeBaseTypes: false,
      });

      expect(types.whereInput).not.toContain("projectId:");
      expect(types.whereInput).not.toContain("updatedAt:");
      expect(types.whereInput).toContain("id:");
      expect(types.whereInput).toContain("createdAt:");

      // Also check orderBy
      expect(types.orderByInput).not.toContain("PROJECTID");
      expect(types.orderByInput).not.toContain("UPDATEDAT");
      expect(types.orderByInput).toContain("ID");
      expect(types.orderByInput).toContain("CREATEDAT");
    });

    it("should merge excludeFields from options and query config", () => {
      const queryWithExclude = createQuery(warehouses)
        .excludeFromFilter(["projectId"]);

      const types = generateGraphQLTypes(queryWithExclude, "Warehouse", {
        excludeFields: ["updatedAt"], // additional exclude via options
        includeBaseTypes: false,
      });

      // Both should be excluded
      expect(types.whereInput).not.toContain("projectId:");
      expect(types.whereInput).not.toContain("updatedAt:");
      expect(types.whereInput).toContain("id:");
      expect(types.whereInput).toContain("createdAt:");
    });

    it("should generate without descriptions", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        includeDescriptions: false,
        includeBaseTypes: false,
      });

      expect(types.whereInput).not.toContain('"""');
    });
  });

  describe("generateBaseFilterTypes", () => {
    it("should generate all base filter types", () => {
      const baseTypes = generateBaseFilterTypes();

      expect(baseTypes).toContain("input StringFilter");
      expect(baseTypes).toContain("eq: String");
      expect(baseTypes).toContain("contains: String");
      expect(baseTypes).toContain("containsi: String");

      expect(baseTypes).toContain("input IDFilter");
      expect(baseTypes).toContain("in: [ID!]");

      expect(baseTypes).toContain("input IntFilter");
      expect(baseTypes).toContain("gt: Int");
      expect(baseTypes).toContain("between: [Int!]");

      expect(baseTypes).toContain("input FloatFilter");
      expect(baseTypes).toContain("lte: Float");

      expect(baseTypes).toContain("input BooleanFilter");

      expect(baseTypes).toContain("input DateTimeFilter");
      expect(baseTypes).toContain("between: [DateTime!]");

      expect(baseTypes).toContain("enum SortDirection");
      expect(baseTypes).toContain("ASC");
      expect(baseTypes).toContain("DESC");
    });
  });

  describe("generateWhereInputType", () => {
    it("should generate only where input", () => {
      const whereInput = generateWhereInputType(warehouseQuery, "Warehouse");

      expect(whereInput).toContain("input WarehouseWhereInput");
      expect(whereInput).not.toContain("enum");
      expect(whereInput).not.toContain("OrderBy");
    });
  });

  describe("generateOrderByInputType", () => {
    it("should generate only order input", () => {
      const orderInput = generateOrderByInputType(warehouseQuery, "Warehouse");

      expect(orderInput).toContain("enum WarehouseOrderField");
      expect(orderInput).toContain("input WarehouseOrderByInput");
      expect(orderInput).not.toContain("WhereInput");
    });
  });

  describe("field type inference", () => {
    it("should infer ID type for id fields", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        includeBaseTypes: false,
      });

      expect(types.whereInput).toContain("id: IDFilter");
      expect(types.whereInput).toContain("projectId: IDFilter");
    });

    it("should infer DateTime type for timestamp fields", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        includeBaseTypes: false,
      });

      expect(types.whereInput).toContain("createdAt: DateTimeFilter");
      expect(types.whereInput).toContain("updatedAt: DateTimeFilter");
    });

    it("should infer Boolean type for is* fields", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        includeBaseTypes: false,
      });

      expect(types.whereInput).toContain("isDefault: BooleanFilter");
    });

    it("should infer Int type for *Count fields", () => {
      const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
        includeBaseTypes: false,
      });

      expect(types.whereInput).toContain("itemCount: IntFilter");
    });
  });
});

describe("Generated GraphQL output example", () => {
  it("should produce valid GraphQL schema", () => {
    const types = generateGraphQLTypes(warehouseQuery, "Warehouse", {
      excludeFields: ["projectId"],
    });

    // Print for inspection
    console.log("\n=== Generated GraphQL Types ===\n");
    console.log(types.typeDefs);
    console.log("\n=== End ===\n");

    // Basic validation
    expect(types.typeDefs.length).toBeGreaterThan(0);
    expect(types.typeDefs).toContain("input");
    expect(types.typeDefs).toContain("enum");
  });
});
