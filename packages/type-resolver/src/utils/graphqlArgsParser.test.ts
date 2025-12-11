import { describe, it, expect, beforeEach, vi } from "vitest";
import { GraphQLResolveInfo } from "graphql";

// Mock graphql-parse-resolve-info
vi.mock("graphql-parse-resolve-info", () => ({
  parseResolveInfo: vi.fn(),
}));

// Import after mock
import { parseResolveInfo } from "graphql-parse-resolve-info";
import { parseGraphqlInfo } from "./graphqlArgsParser.js";

const mockParseResolveInfo = parseResolveInfo as ReturnType<typeof vi.fn>;

// Helper to create a ResolveTree field
const mockField = (
  name: string,
  opts: {
    args?: Record<string, unknown>;
    fieldsByTypeName?: Record<string, Record<string, unknown>>;
  } = {}
) => ({
  name,
  alias: name,
  args: opts.args ?? {},
  fieldsByTypeName: opts.fieldsByTypeName ?? {},
});

// Helper to create an aliased field
const mockAliasedField = (
  alias: string,
  name: string,
  opts: {
    args?: Record<string, unknown>;
    fieldsByTypeName?: Record<string, Record<string, unknown>>;
  } = {}
) => ({
  name,
  alias,
  args: opts.args ?? {},
  fieldsByTypeName: opts.fieldsByTypeName ?? {},
});

describe("parseGraphqlInfo", () => {
  const mockInfo = {} as GraphQLResolveInfo;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("basic parsing", () => {
    it("returns empty object when parseResolveInfo returns null", () => {
      mockParseResolveInfo.mockReturnValue(null);

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({});
    });

    it("parses scalar fields into fields array", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            title: mockField("title"),
            handle: mockField("handle"),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id", "title", "handle"],
      });
    });

    it("skips introspection fields", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            __typename: mockField("__typename"),
            id: mockField("id"),
            name: mockField("name"),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id", "name"],
      });
      expect(result.fields).not.toContain("__typename");
    });
  });

  describe("fields with args", () => {
    it("puts fields with args into populate", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            variants: mockField("variants", {
              args: { first: 10, after: "cursor123" },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id"],
        populate: {
          variants: {
            args: { first: 10, after: "cursor123" },
          },
        },
      });
    });
  });

  describe("nested fields (relations)", () => {
    it("puts fields with children into populate with nested structure", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            variants: mockField("variants", {
              fieldsByTypeName: {
                Variant: {
                  id: mockField("id"),
                  sku: mockField("sku"),
                },
              },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id"],
        populate: {
          variants: {
            fields: ["id", "sku"],
          },
        },
      });
    });

    it("handles deeply nested fields (3+ levels)", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            variants: mockField("variants", {
              args: { first: 10 },
              fieldsByTypeName: {
                Variant: {
                  id: mockField("id"),
                  sku: mockField("sku"),
                  stock: mockField("stock", {
                    args: { warehouseId: "wh-1" },
                    fieldsByTypeName: {
                      Stock: {
                        quantity: mockField("quantity"),
                        warehouse: mockField("warehouse", {
                          fieldsByTypeName: {
                            Warehouse: {
                              id: mockField("id"),
                              name: mockField("name"),
                            },
                          },
                        }),
                      },
                    },
                  }),
                },
              },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id"],
        populate: {
          variants: {
            args: { first: 10 },
            fields: ["id", "sku"],
            populate: {
              stock: {
                args: { warehouseId: "wh-1" },
                fields: ["quantity"],
                populate: {
                  warehouse: {
                    fields: ["id", "name"],
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe("alias support", () => {
    it("includes fieldName when field is aliased", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            firstFive: mockAliasedField("firstFive", "variants", {
              args: { first: 5 },
            }),
            allVariants: mockAliasedField("allVariants", "variants", {
              args: { first: 100 },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        populate: {
          firstFive: {
            fieldName: "variants",
            args: { first: 5 },
          },
          allVariants: {
            fieldName: "variants",
            args: { first: 100 },
          },
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

      const result = parseGraphqlInfo(mockInfo);

      // fieldName should be undefined when not aliased
      expect(result.populate?.variants?.fieldName).toBeUndefined();
    });

    it("handles aliases with nested children", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            topVariants: mockAliasedField("topVariants", "variants", {
              args: { first: 3 },
              fieldsByTypeName: {
                Variant: {
                  id: mockField("id"),
                  sku: mockField("sku"),
                },
              },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        populate: {
          topVariants: {
            fieldName: "variants",
            args: { first: 3 },
            fields: ["id", "sku"],
          },
        },
      });
    });

    it("handles multiple aliases for same field with different args", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            published: mockAliasedField("published", "variants", {
              args: { where: { isPublished: true } },
              fieldsByTypeName: {
                Variant: {
                  id: mockField("id"),
                },
              },
            }),
            drafts: mockAliasedField("drafts", "variants", {
              args: { where: { isPublished: false } },
              fieldsByTypeName: {
                Variant: {
                  id: mockField("id"),
                  sku: mockField("sku"),
                },
              },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        populate: {
          published: {
            fieldName: "variants",
            args: { where: { isPublished: true } },
            fields: ["id"],
          },
          drafts: {
            fieldName: "variants",
            args: { where: { isPublished: false } },
            fields: ["id", "sku"],
          },
        },
      });
    });

    it("puts aliased scalar fields into populate", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            productName: mockAliasedField("productName", "title"),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        populate: {
          productName: {
            fieldName: "title",
          },
        },
      });
    });
  });

  describe("fieldName parameter", () => {
    it("extracts sub-fields when fieldName is provided", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          ProductCreatePayload: {
            product: mockField("product", {
              fieldsByTypeName: {
                Product: {
                  id: mockField("id"),
                  title: mockField("title"),
                  variants: mockField("variants", {
                    args: { first: 5 },
                    fieldsByTypeName: {
                      Variant: {
                        sku: mockField("sku"),
                      },
                    },
                  }),
                },
              },
            }),
            userErrors: mockField("userErrors", {
              fieldsByTypeName: {
                UserError: {
                  field: mockField("field"),
                  message: mockField("message"),
                },
              },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo, "product");

      expect(result).toEqual({
        fields: ["id", "title"],
        populate: {
          variants: {
            args: { first: 5 },
            fields: ["sku"],
          },
        },
      });
    });

    it("returns empty object when fieldName not found", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          ProductCreatePayload: {
            product: mockField("product", {
              fieldsByTypeName: {
                Product: {
                  id: mockField("id"),
                },
              },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo, "nonexistent");

      expect(result).toEqual({});
    });
  });

  describe("merging fields from multiple types (union/interface)", () => {
    it("merges fields from all types in fieldsByTypeName", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            title: mockField("title"),
          },
          DigitalProduct: {
            downloadUrl: mockField("downloadUrl"),
          },
          PhysicalProduct: {
            weight: mockField("weight"),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id", "title", "downloadUrl", "weight"],
      });
    });
  });

  describe("edge cases", () => {
    it("handles empty fieldsByTypeName", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {},
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({});
    });

    it("handles field with empty args object", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            variants: mockField("variants", { args: {} }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      // variants has no args and no children, so it goes to fields
      expect(result).toEqual({
        fields: ["id", "variants"],
      });
    });

    it("handles field with empty children", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            id: mockField("id"),
            variants: mockField("variants", { fieldsByTypeName: {} }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      expect(result).toEqual({
        fields: ["id", "variants"],
      });
    });

    it("omits undefined fields and populate when empty", () => {
      mockParseResolveInfo.mockReturnValue({
        fieldsByTypeName: {
          Product: {
            variants: mockField("variants", {
              args: { first: 10 },
            }),
          },
        },
      });

      const result = parseGraphqlInfo(mockInfo);

      // No scalar fields, so fields should be undefined
      expect(result).toEqual({
        populate: {
          variants: {
            args: { first: 10 },
          },
        },
      });
      expect(result.fields).toBeUndefined();
    });
  });
});
