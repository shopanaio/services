import { describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  createCursorQuery,
  createQuery,
  createRelayQuery,
  field,
} from "../index.js";
import { encode } from "../cursor/cursor.js";
import { hashFilters } from "../cursor/helpers.js";
import {
  transformWhereInput,
  type WhereFieldMapperScope,
} from "../where-transform.js";
import { categories, products, translations } from "./test/setup.js";

const dialect = new PgDialect();

function sqlParams(sqlObj: SQL): unknown[] {
  return dialect.sqlToQuery(sqlObj).params;
}

function mapperScope(
  scope: Partial<WhereFieldMapperScope>
): WhereFieldMapperScope {
  return {
    mappers: {},
    relations: {},
    ...scope,
  };
}

describe("transformWhereInput", () => {
  it("maps shorthand field filter", () => {
    const where = { id: "gid" };
    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: {
          id: (value) => `db:${String(value)}`,
        },
      })
    );

    expect(mapped).toEqual({ id: "db:gid" });
  });

  it("maps default scalar and array operators", () => {
    const where = {
      id: {
        _eq: "eq",
        _neq: "neq",
        _in: ["in-1", "in-2"],
        _notIn: ["not-in"],
      },
    };

    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: {
          id: (value) => `db:${String(value)}`,
        },
      })
    );

    expect(mapped).toEqual({
      id: {
        _eq: "db:eq",
        _neq: "db:neq",
        _in: ["db:in-1", "db:in-2"],
        _notIn: ["db:not-in"],
      },
    });
  });

  it("maps nested _and, _or, and _not filters", () => {
    const where = {
      _or: [
        { id: { _eq: "a" } },
        {
          _and: [
            { id: { _in: ["b"] } },
            { _not: { id: { _neq: "c" } } },
          ],
        },
      ],
    };

    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: {
          id: (value) => `db:${String(value)}`,
        },
      })
    );

    expect(mapped).toEqual({
      _or: [
        { id: { _eq: "db:a" } },
        {
          _and: [
            { id: { _in: ["db:b"] } },
            { _not: { id: { _neq: "db:c" } } },
          ],
        },
      ],
    });
  });

  it("inherits mapper scope from joined relation builders", () => {
    const contexts: string[] = [];
    const categoryScope = mapperScope({
      mappers: {
        parentId: (value, context) => {
          contexts.push(`${context.path}:${context.operator}`);
          return `category:${String(value)}`;
        },
      },
    });
    const productScope = mapperScope({
      mappers: {
        id: (value) => `product:${String(value)}`,
      },
      relations: {
        category: () => categoryScope,
      },
    });

    const mapped = transformWhereInput(
      {
        id: { _eq: "product-gid" },
        category: { parentId: { _eq: "category-gid" } },
      },
      productScope
    );

    expect(mapped).toEqual({
      id: { _eq: "product:product-gid" },
      category: { parentId: { _eq: "category:category-gid" } },
    });
    expect(contexts).toEqual(["category.parentId:_eq"]);
  });

  it("does not map the same leaf name in another joined scope without a mapper", () => {
    const categoryScope = mapperScope({
      mappers: {
        id: (value) => `category:${String(value)}`,
      },
    });
    const variantScope = mapperScope({});
    const productScope = mapperScope({
      mappers: {
        id: (value) => `product:${String(value)}`,
      },
      relations: {
        category: () => categoryScope,
        variant: () => variantScope,
      },
    });

    const mapped = transformWhereInput(
      {
        id: "product-gid",
        category: { id: "category-gid" },
        variant: { id: "variant-gid" },
      },
      productScope
    );

    expect(mapped).toEqual({
      id: "product:product-gid",
      category: { id: "category:category-gid" },
      variant: { id: "variant-gid" },
    });
  });

  it("does not repair invalid scalar field object shape", () => {
    const mapper = vi.fn((value: unknown) => `db:${String(value)}`);
    const where = { id: { value: "gid" } };

    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: { id: mapper },
      })
    );

    expect(mapped).toBe(where);
    expect(mapper).not.toHaveBeenCalled();
  });

  it("does not map _is or _isNot by default", () => {
    const mapper = vi.fn((value: unknown) => `db:${String(value)}`);
    const where = {
      id: {
        _eq: "gid",
        _is: null,
        _isNot: null,
      },
    };

    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: { id: mapper },
      })
    );

    expect(mapped).toEqual({
      id: {
        _eq: "db:gid",
        _is: null,
        _isNot: null,
      },
    });
    expect(mapper).toHaveBeenCalledTimes(1);
  });

  it("maps nullish operator values only when the operator is explicit", () => {
    const mapper = vi.fn((value: unknown) =>
      value === null ? "mapped-null" : value
    );
    const where = {
      id: {
        _eq: "gid",
        _is: null,
      },
    };

    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: {
          id: {
            map: mapper,
            operators: ["_is"],
          },
        },
      })
    );

    expect(mapped).toEqual({
      id: {
        _eq: "gid",
        _is: "mapped-null",
      },
    });
    expect(mapper).toHaveBeenCalledOnce();
  });

  it("preserves structural sharing for unchanged subtrees", () => {
    const unchangedBranch = [{ handle: { _eq: "shirt" } }];
    const where = {
      id: { _eq: "gid" },
      _and: unchangedBranch,
    };

    const mapped = transformWhereInput(
      where,
      mapperScope({
        mappers: {
          id: (value) => `db:${String(value)}`,
        },
      })
    ) as typeof where;

    expect(mapped).not.toBe(where);
    expect(mapped._and).toBe(unchangedBranch);

    const unchanged = transformWhereInput(
      where,
      mapperScope({
        mappers: {
          id: (value) => value,
        },
      })
    );

    expect(unchanged).toBe(where);
  });
});

describe("where field mapper execution wiring", () => {
  const translationsQuery = createQuery(translations, {
    id: field(translations.id),
    entityId: field(translations.entityId),
    field: field(translations.field),
    value: field(translations.value),
  }).mapWhereField("entityId", (value) => `translation:${String(value)}`);

  const categoriesQuery = createQuery(categories, {
    id: field(categories.id),
    slug: field(categories.slug),
  });

  const productsQuery = createQuery(products, {
    id: field(products.id),
    handle: field(products.handle),
    price: field(products.price),
    translation: field(products.id).leftJoin(
      translationsQuery,
      translations.entityId
    ),
    category: field(products.id).leftJoin(categoriesQuery, categories.id),
  }).mapWhereField("id", (value) => `product:${String(value)}`);

  it("maps defaultWhere in fluent getSql and count entrypoints", async () => {
    const query = createQuery(products, {
      id: field(products.id),
      handle: field(products.handle),
    })
      .mapWhereField("id", (value) => `product:${String(value)}`)
      .defaultWhere({ id: { _eq: "default-gid" } });

    expect(sqlParams(query.getSql({ select: ["id"] }))).toContain(
      "product:default-gid"
    );
    expect(sqlParams(query.getCountSql())).toContain("product:default-gid");

    const executeSpy = vi.fn(async () => []);
    await query.execute({ execute: executeSpy }, { where: { id: "exec-gid" } });
    expect(sqlParams(executeSpy.mock.calls[0][0])).toContain(
      "product:exec-gid"
    );

    const countSpy = vi.fn(async () => [{ count: 1 }]);
    await query.count(
      { execute: countSpy },
      { where: { id: { _eq: "count-gid" } } }
    );
    expect(sqlParams(countSpy.mock.calls[0][0])).toContain(
      "product:count-gid"
    );
  });

  it("uses joined builder mapper scope for relation where", () => {
    const params = sqlParams(
      productsQuery.getSql({
        select: ["id"],
        where: {
          translation: { entityId: { _eq: "translation-gid" } },
          category: { id: { _eq: "category-gid" } },
        },
      })
    );

    expect(params).toContain("translation:translation-gid");
    expect(params).toContain("category-gid");
    expect(params).not.toContain("product:category-gid");
  });

  it("maps Relay and Cursor public where before cursor seek where is merged", () => {
    const mapper = vi.fn((value: unknown) => `product:${String(value)}`);
    const query = createQuery(products, {
      id: field(products.id),
      handle: field(products.handle),
    }).mapWhereField("id", mapper);

    const relayQuery = createRelayQuery(query, {
      name: "product",
      tieBreaker: "id",
    });
    const cursor = encode({
      type: "product",
      filtersHash: hashFilters(undefined),
      seek: [
        { field: "id", value: "cursor-id", direction: "desc" },
        { field: "id", value: "cursor-id", direction: "desc" },
      ],
    });

    const relayParams = sqlParams(
      relayQuery.getSql({
        first: 10,
        after: cursor,
        select: ["id"],
        where: { id: { _eq: "relay-gid" } },
      }).sql as SQL
    );

    expect(relayParams).toContain("product:relay-gid");
    expect(relayParams).toContain("cursor-id");
    expect(relayParams).not.toContain("product:cursor-id");
    expect(mapper).toHaveBeenCalledOnce();

    const cursorQuery = createCursorQuery(query, {
      name: "product",
      tieBreaker: "id",
    });
    const cursorParams = sqlParams(
      cursorQuery.getSql({
        limit: 10,
        direction: "forward",
        select: ["id"],
        where: { id: { _eq: "cursor-gid" } },
      }).sql as SQL
    );

    expect(cursorParams).toContain("product:cursor-gid");
  });
});
