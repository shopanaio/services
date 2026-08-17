import { Buffer } from "node:buffer";
import type { Customers } from "@shopana/broker-types";
import { GraphQLError } from "graphql";
import { CatalogType } from "./CatalogType.js";
import type { ProductComparisonColumnsArgs } from "./generated/types.js";

interface ComparisonColumn {
  productId: string;
  variantId: string;
  position: number;
}

interface ComparisonGroup {
  categoryId: string;
  columns: ComparisonColumn[];
}

interface CustomerComparisonsData {
  revision: number;
  groups: ComparisonGroup[];
  itemCount: number;
}

export class CustomerProductComparisonsResolver extends CatalogType<
  string,
  CustomerComparisonsData
> {
  async $preload(): Promise<CustomerComparisonsData> {
    if (this.$ctx.customer?.id !== this.$props) {
      throw new GraphQLError("Customer comparison selection is unavailable", {
        extensions: { code: "FORBIDDEN" },
      });
    }

    const selection = await this.$ctx.kernel.getServices().broker.call<
      Customers.GetCustomerComparisonSelectionResult,
      Customers.GetCustomerComparisonSelectionParams
    >("customers.getCustomerComparisonSelection", {
      storeId: this.$ctx.store.id,
      customerId: this.$props,
    });
    if (!selection.ok) {
      throw new GraphQLError(selection.message, {
        extensions: {
          code: selection.code,
          retryable: selection.retryable,
        },
      });
    }

    const currentVariants =
      await this.$ctx.kernel.repository.variant.getPublishedComparisonVariants(
        selection.items.map((item) => item.variantId),
      );
    const currentByVariantId = new Map(
      currentVariants.map((variant) => [variant.variantId, variant] as const),
    );
    const validColumns = selection.items.flatMap((item) => {
      const current = currentByVariantId.get(item.variantId);
      return current && current.productId === item.productId
        ? [{ ...item }]
        : [];
    });

    const groupsByCategory = new Map<string, ComparisonColumn[]>();
    for (const column of validColumns) {
      const categoryId = currentByVariantId.get(
        column.variantId,
      )?.primaryCategoryId;
      if (!categoryId) continue;
      const columns = groupsByCategory.get(categoryId) ?? [];
      columns.push({ ...column, position: columns.length });
      groupsByCategory.set(categoryId, columns);
    }

    return {
      revision: selection.revision,
      groups: [...groupsByCategory].map(([categoryId, columns]) => ({
        categoryId,
        columns,
      })),
      itemCount: validColumns.length,
    };
  }

  revision() {
    return this.$get("revision");
  }

  async nodes() {
    const groups = (await this.$get("groups")) ?? [];
    return groups.map(
      (group) => new ProductComparisonResolver(group, this.$ctx),
    );
  }

  async totalCount() {
    return ((await this.$get("groups")) ?? []).length;
  }

  async itemCount() {
    return (await this.$get("itemCount")) ?? 0;
  }
}

export class ProductComparisonResolver extends CatalogType<ComparisonGroup> {
  key() {
    return Buffer.from(
      `catalog-comparison:${this.$props.categoryId}`,
      "utf8",
    ).toString("base64url");
  }

  category() {
    return this.resolvers.category(this.$props.categoryId);
  }

  title() {
    return null;
  }

  columns(args: ProductComparisonColumnsArgs) {
    return new ProductComparisonColumnConnectionResolver(
      {
        categoryId: this.$props.categoryId,
        columns: this.$props.columns,
        ...args,
      },
      this.$ctx,
    );
  }
}

interface ComparisonConnectionInput extends ProductComparisonColumnsArgs {
  categoryId: string;
  columns: ComparisonColumn[];
}

interface ComparisonConnectionData {
  rows: Array<{ cursor: string; column: ComparisonColumn }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

export class ProductComparisonColumnConnectionResolver extends CatalogType<
  ComparisonConnectionInput,
  ComparisonConnectionData
> {
  $preload(): ComparisonConnectionData {
    const prefix = `category:${this.$props.categoryId}`;
    const { start, end } = connectionBounds(
      this.$props.columns.length,
      this.$props,
      prefix,
    );
    const rows = this.$props.columns.slice(start, end).map((column, offset) => ({
      cursor: encodeCursor(prefix, start + offset),
      column,
    }));
    return {
      rows,
      pageInfo: {
        hasNextPage: end < this.$props.columns.length,
        hasPreviousPage: start > 0,
        startCursor: rows[0]?.cursor ?? null,
        endCursor: rows.at(-1)?.cursor ?? null,
      },
      totalCount: this.$props.columns.length,
    };
  }

  async edges() {
    return ((await this.$get("rows")) ?? []).map((row) => ({
      cursor: row.cursor,
      node: new ProductComparisonColumnResolver(row.column, this.$ctx),
    }));
  }

  async nodes() {
    return ((await this.$get("rows")) ?? []).map(
      (row) => new ProductComparisonColumnResolver(row.column, this.$ctx),
    );
  }

  pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }

  groups() {
    // Canonical profile rows are intentionally empty until the category has a
    // configured comparison profile. Header columns remain useful and valid.
    return [];
  }
}

class ProductComparisonColumnResolver extends CatalogType<ComparisonColumn> {
  key() {
    return Buffer.from(
      `catalog-comparison-column:${this.$props.variantId}`,
      "utf8",
    ).toString("base64url");
  }

  position() {
    return this.$props.position;
  }

  product() {
    return this.resolvers.product(this.$props.productId);
  }

  variant() {
    return this.resolvers.productVariant(this.$props.variantId);
  }

  async featuredMedia() {
    return (
      await this.resolvers.productVariant(this.$props.variantId)
    ).featuredMedia();
  }

  async price() {
    return (await this.resolvers.productVariant(this.$props.variantId)).price();
  }

  async compareAtPrice() {
    return (
      await this.resolvers.productVariant(this.$props.variantId)
    ).compareAtPrice();
  }

  async availableForSale() {
    return (
      await this.resolvers.productVariant(this.$props.variantId)
    ).availableForSale();
  }

  savedForComparison() {
    return true;
  }
}

function connectionBounds(
  total: number,
  args: ProductComparisonColumnsArgs,
  prefix: string,
): { start: number; end: number } {
  if (args.first != null && args.last != null) {
    throw badPagination("Use either first or last, not both");
  }
  if ((args.first ?? 0) < 0 || (args.last ?? 0) < 0) {
    throw badPagination("Connection limits cannot be negative");
  }
  if ((args.first ?? 0) > 100 || (args.last ?? 0) > 100) {
    throw badPagination("Comparison connection limit cannot exceed 100");
  }

  let start = args.after ? decodeCursor(args.after, prefix) + 1 : 0;
  let end = args.before ? decodeCursor(args.before, prefix) : total;
  start = Math.min(Math.max(start, 0), total);
  end = Math.min(Math.max(end, start), total);
  if (args.first != null) end = Math.min(end, start + args.first);
  else if (args.last != null) start = Math.max(start, end - args.last);
  else end = Math.min(end, start + 20);
  return { start, end };
}

function encodeCursor(prefix: string, index: number): string {
  return Buffer.from(`catalog-comparison:${prefix}:${index}`, "utf8").toString(
    "base64url",
  );
}

function decodeCursor(cursor: string, prefix: string): number {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const marker = `catalog-comparison:${prefix}:`;
  const index = decoded.startsWith(marker)
    ? Number(decoded.slice(marker.length))
    : Number.NaN;
  if (!Number.isSafeInteger(index) || index < 0) {
    throw badPagination("Invalid comparison connection cursor");
  }
  return index;
}

function badPagination(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}
