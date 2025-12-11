import { describe, it, expect, beforeEach, vi } from "vitest";
import { GraphQLResolveInfo } from "graphql";
import type { TypeClass } from "../types.js";

// Mock graphql-parse-resolve-info
vi.mock("graphql-parse-resolve-info", () => ({
  parseResolveInfo: vi.fn(),
}));

// Import after mock
import { parseResolveInfo } from "graphql-parse-resolve-info";
import { parseGraphQLInfo, parseGraphQLInfoDeep } from "./graphqlArgsParser.js";

const mockParseResolveInfo = parseResolveInfo as ReturnType<typeof vi.fn>;

// Mock TypeClass for testing
const createMockTypeClass = (fields: Record<string, () => TypeClass>): TypeClass => {
  return { fields } as unknown as TypeClass;
};

// Helper to create a ResolveTree field
const mockField = (name: string, opts: { args?: Record<string, unknown>; fieldsByTypeName?: Record<string, Record<string, unknown>> } = {}) => ({
  name,
  alias: name,
  args: opts.args ?? {},
  fieldsByTypeName: opts.fieldsByTypeName ?? {},
});

// Helper to create an aliased field
const mockAliasedField = (alias: string, name: string, opts: { args?: Record<string, unknown>; fieldsByTypeName?: Record<string, Record<string, unknown>> } = {}) => ({
  name,
  alias,
  args: opts.args ?? {},
  fieldsByTypeName: opts.fieldsByTypeName ?? {},
});

describe("graphqlArgsParser", () => {
  const mockInfo = {} as GraphQLResolveInfo;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("parseGraphQLInfo", () => {
    it("returns empty object when parseResolveInfo returns null", () => {
      mockParseResolveInfo.mockReturnValue(null);

      const MockType = createMockTypeClass({});
      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({});
    });

    it("parses fields with arguments", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            variants: mockField("variants", { args: { first: 10, after: "cursor123" } }),
          },
        },
      });

      const VariantType = createMockTypeClass({});
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({
        variants: {
          args: { first: 10, after: "cursor123" },
        },
      });
    });

    it("includes all requested fields (even without args)", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            name: mockField("name"),
            title: mockField("title"),
          },
        },
      });

      const MockType = createMockTypeClass({});
      const result = parseGraphQLInfo(mockInfo, MockType);

      // All requested fields are included so executor knows to resolve them
      expect(result).toEqual({
        name: {},
        title: {},
      });
    });

    it("skips introspection fields", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            __typename: mockField("__typename"),
            name: mockField("name", { args: { format: "upper" } }),
          },
        },
      });

      const MockType = createMockTypeClass({});
      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({
        name: { args: { format: "upper" } },
      });
    });

    it("includes children when field has nested selection", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            variants: mockField("variants", {
              args: { first: 5 },
              fieldsByTypeName: {
                Variant: {
                  sku: mockField("sku"),
                  stock: mockField("stock", { args: { warehouseId: "wh-1" } }),
                },
              },
            }),
          },
        },
      });

      const StockType = createMockTypeClass({});
      const VariantType = createMockTypeClass({
        stock: () => StockType,
      });
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({
        variants: {
          args: { first: 5 },
          children: {
            sku: {},
            stock: {
              args: { warehouseId: "wh-1" },
            },
          },
        },
      });
    });
  });

  describe("parseGraphQLInfoDeep", () => {
    it("collects fields from nested type hierarchy", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            variants: mockField("variants", {
              args: { first: 10 },
              fieldsByTypeName: {
                Variant: {
                  sku: mockField("sku"),
                  stock: mockField("stock", {
                    args: { warehouseId: "wh-1" },
                    fieldsByTypeName: {
                      Stock: {
                        quantity: mockField("quantity"),
                      },
                    },
                  }),
                },
              },
            }),
          },
        },
      });

      const StockType = createMockTypeClass({});
      const VariantType = createMockTypeClass({
        stock: () => StockType,
      });
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfoDeep(mockInfo, MockType);

      expect(result).toEqual({
        variants: {
          args: { first: 10 },
          children: {
            sku: {},
            stock: {
              args: { warehouseId: "wh-1" },
              children: {
                quantity: {},
              },
            },
          },
        },
      });
    });

    it("handles circular type references", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Category: {
            children: mockField("children", {
              args: { first: 5 },
              fieldsByTypeName: {
                Category: {
                  name: mockField("name"),
                },
              },
            }),
          },
        },
      });

      // Create circular reference
      const CategoryType: TypeClass = createMockTypeClass({});
      (CategoryType as unknown as { fields: Record<string, () => TypeClass> }).fields = {
        children: () => CategoryType,
      };

      const result = parseGraphQLInfoDeep(mockInfo, CategoryType);

      expect(result).toEqual({
        children: {
          args: { first: 5 },
          children: {
            name: {},
          },
        },
      });
    });

    it("returns empty object when parseResolveInfo returns null", () => {
      mockParseResolveInfo.mockReturnValue(null);

      const MockType = createMockTypeClass({});
      const result = parseGraphQLInfoDeep(mockInfo, MockType);

      expect(result).toEqual({});
    });
  });

  describe("alias support", () => {
    it("includes fieldName when field is aliased", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            firstFive: mockAliasedField("firstFive", "variants", { args: { first: 5 } }),
            allVariants: mockAliasedField("allVariants", "variants", { args: { first: 100 } }),
          },
        },
      });

      const VariantType = createMockTypeClass({});
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({
        firstFive: {
          fieldName: "variants",
          args: { first: 5 },
        },
        allVariants: {
          fieldName: "variants",
          args: { first: 100 },
        },
      });
    });

    it("does not include fieldName when field is not aliased", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            variants: mockField("variants", { args: { first: 10 } }),
          },
        },
      });

      const VariantType = createMockTypeClass({});
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfo(mockInfo, MockType);

      // No fieldName when alias === name
      expect((result as Record<string, unknown>).variants).not.toHaveProperty("fieldName");
    });

    it("handles aliases with nested children", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            topVariants: mockAliasedField("topVariants", "variants", {
              args: { first: 3 },
              fieldsByTypeName: {
                Variant: {
                  sku: mockField("sku"),
                },
              },
            }),
          },
        },
      });

      const VariantType = createMockTypeClass({});
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({
        topVariants: {
          fieldName: "variants",
          args: { first: 3 },
          children: {
            sku: {},
          },
        },
      });
    });
  });

  describe("merging fields from multiple types (union/interface)", () => {
    it("merges fields from all types in fieldsByTypeName", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            name: mockField("name"),
            variants: mockField("variants", { args: { first: 10 } }),
          },
          DigitalProduct: {
            downloadUrl: mockField("downloadUrl", { args: { format: "pdf" } }),
          },
        },
      });

      const VariantType = createMockTypeClass({});
      const MockType = createMockTypeClass({
        variants: () => VariantType,
      });

      const result = parseGraphQLInfo(mockInfo, MockType);

      expect(result).toEqual({
        name: {},
        variants: {
          args: { first: 10 },
        },
        downloadUrl: {
          args: { format: "pdf" },
        },
      });
    });
  });
});
