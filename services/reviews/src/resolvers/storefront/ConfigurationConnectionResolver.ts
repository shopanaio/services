import type { RatingCriterionRelayInput } from "../../repositories/configuration/ConfigurationRepository.js";
import type { Catalog } from "@shopana/broker-types";
import type { ServiceContext } from "../../context/types.js";
import type { RatingCriterion } from "../../repositories/models/index.js";
import { BaseConnectionResolver, type ConnectionData } from "./connection/BaseConnectionResolver.js";

export class RatingCriterionConnectionResolver extends BaseConnectionResolver<RatingCriterionRelayInput> {
  $preload(): Promise<ConnectionData> {
    const where: RatingCriterionRelayInput["where"] = { _and: [
      { isActive: { _eq: true } }, ...(this.$props.where ? [this.$props.where] : []),
    ] };
    return this.$ctx.kernel.repository.configuration.getCriterionConnection({ ...this.$props, where });
  }
  protected createNodeResolver(id: string) { return this.resolvers.ratingCriterion(id); }
}

export type ApplicableCriterionConnectionInput = {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  productId: string;
};

export class ApplicableRatingCriterionConnectionResolver extends BaseConnectionResolver<ApplicableCriterionConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const criteria = await getApplicableCriteria(this.$ctx, this.$props.productId);
    const edges = criteria.map((row) => ({ cursor: criterionCursor(row.id), nodeId: row.id }));
    const after = this.$props.after ? edges.findIndex((edge) => edge.cursor === this.$props.after) + 1 : 0;
    const beforeIndex = this.$props.before ? edges.findIndex((edge) => edge.cursor === this.$props.before) : edges.length;
    const before = beforeIndex < 0 ? edges.length : beforeIndex;
    const bounded = edges.slice(after, before);
    const selected = this.$props.last != null
      ? bounded.slice(Math.max(0, bounded.length - this.$props.last))
      : bounded.slice(0, this.$props.first ?? 20);
    const startIndex = selected[0] ? edges.findIndex((edge) => edge.cursor === selected[0]!.cursor) : -1;
    const endIndex = selected.at(-1) ? edges.findIndex((edge) => edge.cursor === selected.at(-1)!.cursor) : -1;
    return {
      edges: selected,
      totalCount: edges.length,
      pageInfo: {
        hasPreviousPage: startIndex > 0,
        hasNextPage: endIndex >= 0 && endIndex < edges.length - 1,
        startCursor: selected[0]?.cursor ?? null,
        endCursor: selected.at(-1)?.cursor ?? null,
      },
    };
  }
  protected createNodeResolver(id: string) { return this.resolvers.ratingCriterion(id); }
}

export async function getApplicableCriteria(ctx: ServiceContext, productId: string): Promise<RatingCriterion[]> {
  const catalog = await ctx.kernel.getServices().broker.call<
    Catalog.CatalogQueryResult,
    Catalog.CatalogQueryParams
  >("catalog.query", {
    storeId: ctx.store.id,
    selection: {
      populate: {
        products: {
          args: { first: 1, where: { id: { _eq: productId } } },
          populate: {
            edges: {
              populate: {
                node: {
                  fields: ["id"],
                  populate: { categories: { fields: ["id"] } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!catalog.ok) throw new Error(`Catalog product categories could not be resolved: ${catalog.code}`);
  const product = catalog.data.products?.edges?.[0]?.node;
  const categoryIds = new Set((product?.categories ?? []).map((category) => category.id));
  const connection = await ctx.kernel.repository.configuration.getCriterionConnection({ first: 100, where: { isActive: { _eq: true } } });
  const rows = (await ctx.loaders.ratingCriterion.loadMany(connection.edges.map((edge) => edge.nodeId)))
    .filter((row): row is RatingCriterion => !(row instanceof Error) && !!row);
  const assignments = await Promise.all(rows.map((row) => ctx.loaders.ratingCriterionAssignments.load(row.id)));
  return rows.filter((row, index) => row.appliesToAllProducts || assignments[index]!.some((assignment) =>
    assignment.targetType === "PRODUCT"
      ? assignment.targetId === productId
      : categoryIds.has(assignment.targetId)
  ));
}

function criterionCursor(id: string) {
  return Buffer.from(`reviews:criterion:${id}`).toString("base64url");
}
