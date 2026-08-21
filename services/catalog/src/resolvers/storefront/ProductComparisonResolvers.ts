import { Buffer } from "node:buffer";
import type { Customers } from "@shopana/broker-types";
import { GraphQLError } from "graphql";
import { ProductComparisonMatrixBuilder } from "../../application/comparison/ProductComparisonMatrixBuilder.js";
import { comparisonPolicy } from "../../application/comparison/comparison-policy.js";
import type {
  ComparisonMatrix,
  ComparisonMatrixColumn,
  ComparisonMatrixGroup,
  ComparisonMatrixRow,
  ComparisonMatrixCell,
} from "../../application/comparison/types.js";
import { CatalogType } from "./CatalogType.js";
import type { ProductComparisonColumnsArgs } from "./generated/types.js";

interface GroupInput {
  categoryId: string;
  profileId: string;
  columns: ComparisonMatrixColumn[];
  title?: string;
}
interface CustomerData {
  groups: GroupInput[];
  itemCount: number;
}

export class CustomerProductComparisonsResolver extends CatalogType<string, CustomerData> {
  async $preload(): Promise<CustomerData> {
    if (this.$ctx.customer?.id !== this.$props)
      throw new GraphQLError("Customer comparison selection is unavailable", {
        extensions: { code: "FORBIDDEN" },
      });
    const selection = await this.$ctx.kernel
      .getServices()
      .broker.call<
        Customers.GetCustomerComparisonSelectionResult,
        Customers.GetCustomerComparisonSelectionParams
      >("customers.getCustomerComparisonSelection", {
        storeId: this.$ctx.store.id,
        customerId: this.$props,
      });
    if (!selection.ok)
      throw new GraphQLError(selection.message, {
        extensions: { code: selection.code, retryable: selection.retryable },
      });
    const current =
      await this.$ctx.kernel.repository.variant.getStorefrontVisibleComparisonVariants(
        selection.items.map((item) => item.variantId),
      );
    const currentById = new Map(current.map((row) => [row.variantId, row]));
    const valid = selection.items.flatMap((item) => {
      const row = currentById.get(item.variantId);
      return row?.productId === item.productId && row.primaryCategoryId
        ? [{ ...item, categoryId: row.primaryCategoryId }]
        : [];
    });
    if (valid.length !== selection.items.length)
      this.$ctx.kernel.getServices().logger.warn(
        {
          skippedCount: selection.items.length - valid.length,
          reason: "STALE_OR_INVISIBLE_SELECTION",
        },
        "comparison.matrix.item_skipped",
      );
    const profiles =
      await this.$ctx.kernel.repository.comparisonRead.getEffectiveProfilesByProductIds([
        ...new Set(valid.map((item) => item.productId)),
      ]);
    const profileByProduct = new Map(profiles.map((row) => [row.ownerId, row]));
    const grouped = new Map<string, typeof valid>();
    for (const item of valid)
      grouped.set(item.categoryId, [...(grouped.get(item.categoryId) ?? []), item]);
    const groups: GroupInput[] = [];
    for (const [categoryId, items] of grouped) {
      const resolved = items.map((item) => profileByProduct.get(item.productId));
      const profileId = resolved[0]?.profileId;
      if (!profileId || resolved.some((row) => !row?.enabled || row.profileId !== profileId)) {
        this.$ctx.kernel
          .getServices()
          .logger.warn(
            { categoryId, reason: "INCOMPATIBLE_EFFECTIVE_PROFILE" },
            "comparison.matrix.item_skipped",
          );
        continue;
      }
      groups.push({
        categoryId,
        profileId,
        columns: items.map((item, position) => ({
          productId: item.productId,
          variantId: item.variantId,
          position,
          savedForComparison: true,
        })),
      });
    }
    return {
      groups,
      itemCount: groups.reduce((sum, group) => sum + group.columns.length, 0),
    };
  }
  async nodes() {
    return ((await this.$get("groups")) ?? []).map(
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

export class ProductComparisonResolver extends CatalogType<GroupInput | ComparisonMatrix> {
  private input(): GroupInput {
    const value = this.$props as ComparisonMatrix & GroupInput;
    return {
      categoryId: value.categoryId,
      profileId: value.profileId,
      columns: value.columns,
      title: value.title,
    };
  }
  key() {
    const value = this.input();
    return stable("matrix", `${value.profileId}:${value.categoryId}`);
  }
  category() {
    return this.resolvers.category(this.input().categoryId);
  }
  async title() {
    const value = this.input();
    if (value.title) return value.title;
    return (await this.$ctx.loaders.localizedComparisonProfile.load(value.profileId))?.name ?? null;
  }
  columns(args: ProductComparisonColumnsArgs) {
    return new ProductComparisonColumnConnectionResolver({ ...this.input(), ...args }, this.$ctx);
  }
}

interface ConnectionInput extends GroupInput, ProductComparisonColumnsArgs {}
interface ConnectionData {
  rows: Array<{ cursor: string; column: ComparisonMatrixColumn }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
  matrix: ComparisonMatrix | null;
}
export class ProductComparisonColumnConnectionResolver extends CatalogType<
  ConnectionInput,
  ConnectionData
> {
  async $preload(): Promise<ConnectionData> {
    const { start, end } = bounds(this.$props.columns, this.$props);
    const page = this.$props.columns.slice(start, end);
    const rows = page.map((column) => ({
      cursor: encodeCursor(this.$props.categoryId, column.variantId),
      column,
    }));
    const matrix = await new ProductComparisonMatrixBuilder(
      this.$ctx.kernel.repository,
      this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      this.$ctx.kernel.cache,
      this.$ctx.store.id,
    ).build({
      profileId: this.$props.profileId,
      categoryId: this.$props.categoryId,
      columns: page,
    });
    this.$ctx.kernel.getServices().logger.info(
      {
        profileId: this.$props.profileId,
        categoryId: this.$props.categoryId,
        columns: page.length,
        rows: matrix?.groups.reduce((sum, group) => sum + group.rows.length, 0) ?? 0,
      },
      "comparison.matrix.built",
    );
    return {
      rows,
      matrix,
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
  async groups() {
    return ((await this.$get("matrix"))?.groups ?? []).map(
      (group) => new ProductComparisonGroupResolver(group, this.$ctx),
    );
  }
}

class ProductComparisonColumnResolver extends CatalogType<ComparisonMatrixColumn> {
  key() {
    return stable("column", this.$props.variantId);
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
    return (await this.resolvers.productVariant(this.$props.variantId)).featuredMedia();
  }
  async price() {
    return (await this.resolvers.productVariant(this.$props.variantId)).price();
  }
  async compareAtPrice() {
    return (await this.resolvers.productVariant(this.$props.variantId)).compareAtPrice();
  }
  async availableForSale() {
    return (await this.resolvers.productVariant(this.$props.variantId)).availableForSale();
  }
  savedForComparison() {
    return this.$props.savedForComparison;
  }
}
class ProductComparisonGroupResolver extends CatalogType<ComparisonMatrixGroup> {
  key() {
    return this.$props.key;
  }
  name() {
    return this.$props.name;
  }
  rows() {
    return this.$props.rows.map((row) => new ProductComparisonRowResolver(row, this.$ctx));
  }
}
class ProductComparisonRowResolver extends CatalogType<ComparisonMatrixRow> {
  key() {
    return this.$props.key;
  }
  name() {
    return this.$props.name;
  }
  description() {
    return this.$props.description;
  }
  hasDifferences() {
    return this.$props.hasDifferences;
  }
  cells() {
    return this.$props.cells.map((cell) => new ProductComparisonCellResolver(cell, this.$ctx));
  }
}
class ProductComparisonCellResolver extends CatalogType<ComparisonMatrixCell> {
  status() {
    return this.$props.status;
  }
  displayValue() {
    return this.$props.displayValue;
  }
}

function bounds(columns: ComparisonMatrixColumn[], args: ConnectionInput) {
  if (args.first != null && args.last != null) throw bad("Use either first or last");
  if ((args.first ?? 0) < 0 || (args.last ?? 0) < 0)
    throw bad("Connection limits cannot be negative");
  if (
    (args.first ?? 0) > comparisonPolicy.relayPageHardMaximum ||
    (args.last ?? 0) > comparisonPolicy.relayPageHardMaximum
  )
    throw bad(`Comparison connection limit cannot exceed ${comparisonPolicy.relayPageHardMaximum}`);
  let start = args.after ? locate(columns, decodeCursor(args.after, args.categoryId), true) : 0;
  let end = args.before
    ? locate(columns, decodeCursor(args.before, args.categoryId), false)
    : columns.length;
  if (args.first != null) end = Math.min(end, start + args.first);
  else if (args.last != null) start = Math.max(start, end - args.last);
  else end = Math.min(end, start + comparisonPolicy.productPageDefaultColumns);
  return { start, end };
}
function locate(columns: ComparisonMatrixColumn[], cursor: { variantId: string }, after: boolean) {
  const index = columns.findIndex((column) => column.variantId === cursor.variantId);
  if (index < 0) throw bad("Stale comparison connection cursor");
  return after ? index + 1 : index;
}
function encodeCursor(categoryId: string, variantId: string) {
  return Buffer.from(
    JSON.stringify({ v: comparisonPolicy.cursorVersion, c: categoryId, k: variantId }),
  ).toString("base64url");
}
function decodeCursor(cursor: string, categoryId: string) {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      value.v !== comparisonPolicy.cursorVersion ||
      value.c !== categoryId ||
      typeof value.k !== "string"
    )
      throw new Error();
    return { variantId: value.k as string };
  } catch {
    throw bad("Invalid comparison connection cursor");
  }
}
function stable(kind: string, id: string) {
  return Buffer.from(`catalog-comparison:${kind}:${id}`).toString("base64url");
}
function bad(message: string) {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}
