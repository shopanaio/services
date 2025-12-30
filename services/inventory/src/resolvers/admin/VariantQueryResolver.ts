import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { InventoryType } from "./InventoryType.js";
import { VariantResolver } from "./VariantResolver.js";

/**
 * VariantQuery namespace resolver.
 * Handles all variant-related queries.
 */
export class VariantQueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Get a single variant by ID.
   */
  variant(args: { id: string }) {
    return new VariantResolver(args.id, this.ctx);
  }

  /**
   * Get a paginated list of variants.
   */
  async variants(args: VariantRelayInput) {
    const services = this.ctx.kernel.getServices();
    const first = args.first ?? 10;

    const variants = await services.repository.variant.getMany({
      limit: first + 1,
    });

    const hasNextPage = variants.length > first;
    const resultVariants = hasNextPage ? variants.slice(0, first) : variants;

    const edges = resultVariants.map((variant) => ({
      node: new VariantResolver(variant.id, this.ctx),
      cursor: Buffer.from(variant.id).toString("base64"),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: resultVariants.length,
    };
  }
}
