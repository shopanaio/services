import { initialRank, midpointRank, nextRank, rebalanceRanks } from "../scripts/shared/rank.js";

export type LexoRankMoveFailureCode =
  | "AFTER_ITEM_NOT_FOUND"
  | "BEFORE_ITEM_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "INVALID_AFTER_BEFORE"
  | "INVALID_AFTER_SELF"
  | "INVALID_BEFORE_SELF"
  | "RANK_SPACE_EXHAUSTED";

export type LexoRankMoveResult<TItem> =
  | {
      ok: true;
      item: TItem;
      lexoRank: string;
    }
  | {
      ok: false;
      code: LexoRankMoveFailureCode;
    };

interface LexoRankItemParams {
  itemId: string;
  scopeId?: string;
}

interface LexoRankUpdateParams extends LexoRankItemParams {
  lexoRank: string;
}

interface LexoRankMoveParams extends LexoRankItemParams {
  afterItemId?: string | null;
  beforeItemId?: string | null;
}

interface LexoRankRepositoryConfig<TItem> {
  findOrderedItems: (scopeId?: string) => Promise<TItem[]>;
  findItem: (params: LexoRankItemParams) => Promise<TItem | null>;
  updateRank: (params: LexoRankUpdateParams) => Promise<TItem | null>;
  getItemId: (item: TItem) => string;
  getLexoRank: (item: TItem) => string;
}

interface EffectiveRanks {
  afterRank: string | null;
  beforeRank: string | null;
}

export class LexoRankRepository<TItem> {
  constructor(private readonly config: LexoRankRepositoryConfig<TItem>) {}

  async getNextRank(scopeId?: string): Promise<string> {
    const items = await this.config.findOrderedItems(scopeId);
    const lastItem = items[items.length - 1];
    return lastItem ? nextRank(this.config.getLexoRank(lastItem)) : initialRank();
  }

  async rebalance(scopeId?: string): Promise<TItem[]> {
    const items = await this.config.findOrderedItems(scopeId);
    const ranks = rebalanceRanks(items.length);

    for (let i = 0; i < items.length; i++) {
      await this.config.updateRank({
        scopeId,
        itemId: this.config.getItemId(items[i]),
        lexoRank: ranks[i],
      });
    }

    return items;
  }

  async move(params: LexoRankMoveParams): Promise<LexoRankMoveResult<TItem>> {
    const afterItemId = params.afterItemId ?? undefined;
    const beforeItemId = params.beforeItemId ?? undefined;

    if (afterItemId && afterItemId === beforeItemId) {
      return { ok: false, code: "INVALID_AFTER_BEFORE" };
    }

    if (afterItemId === params.itemId) {
      return { ok: false, code: "INVALID_AFTER_SELF" };
    }

    if (beforeItemId === params.itemId) {
      return { ok: false, code: "INVALID_BEFORE_SELF" };
    }

    const [targetItem, afterItem, beforeItem] = await Promise.all([
      this.config.findItem({ scopeId: params.scopeId, itemId: params.itemId }),
      afterItemId
        ? this.config.findItem({ scopeId: params.scopeId, itemId: afterItemId })
        : Promise.resolve(null),
      beforeItemId
        ? this.config.findItem({ scopeId: params.scopeId, itemId: beforeItemId })
        : Promise.resolve(null),
    ]);

    if (!targetItem) {
      return { ok: false, code: "ITEM_NOT_FOUND" };
    }

    if (afterItemId && !afterItem) {
      return { ok: false, code: "AFTER_ITEM_NOT_FOUND" };
    }

    if (beforeItemId && !beforeItem) {
      return { ok: false, code: "BEFORE_ITEM_NOT_FOUND" };
    }

    const needNeighborLookup = Boolean(
      (beforeItemId && !afterItemId) || (afterItemId && !beforeItemId),
    );

    let effectiveRanks = await this.resolveEffectiveRanks({
      scopeId: params.scopeId,
      itemId: params.itemId,
      afterItemId,
      beforeItemId,
      afterItem,
      beforeItem,
      needNeighborLookup,
    });

    let lexoRank = midpointRank(
      effectiveRanks.afterRank,
      effectiveRanks.beforeRank,
    );

    if (!lexoRank) {
      await this.rebalance(params.scopeId);
      const [afterRebalanced, beforeRebalanced] = await Promise.all([
        afterItemId
          ? this.config.findItem({ scopeId: params.scopeId, itemId: afterItemId })
          : Promise.resolve(null),
        beforeItemId
          ? this.config.findItem({ scopeId: params.scopeId, itemId: beforeItemId })
          : Promise.resolve(null),
      ]);

      effectiveRanks = await this.resolveEffectiveRanks({
        scopeId: params.scopeId,
        itemId: params.itemId,
        afterItemId,
        beforeItemId,
        afterItem: afterRebalanced,
        beforeItem: beforeRebalanced,
        needNeighborLookup,
      });
      lexoRank = midpointRank(effectiveRanks.afterRank, effectiveRanks.beforeRank);
    }

    if (!lexoRank) {
      return { ok: false, code: "RANK_SPACE_EXHAUSTED" };
    }

    const updatedItem = await this.config.updateRank({
      scopeId: params.scopeId,
      itemId: params.itemId,
      lexoRank,
    });

    return updatedItem
      ? { ok: true, item: updatedItem, lexoRank }
      : { ok: false, code: "ITEM_NOT_FOUND" };
  }

  private async resolveEffectiveRanks(params: {
    scopeId?: string;
    itemId: string;
    afterItemId?: string;
    beforeItemId?: string;
    afterItem: TItem | null;
    beforeItem: TItem | null;
    needNeighborLookup: boolean;
  }): Promise<EffectiveRanks> {
    let afterRank = params.afterItem ? this.config.getLexoRank(params.afterItem) : null;
    let beforeRank = params.beforeItem
      ? this.config.getLexoRank(params.beforeItem)
      : null;

    if (!params.needNeighborLookup) {
      return { afterRank, beforeRank };
    }

    const orderedItems = (
      await this.config.findOrderedItems(params.scopeId)
    ).filter((item) => this.config.getItemId(item) !== params.itemId);

    if (params.beforeItemId && !params.afterItemId) {
      afterRank = this.findPreviousNeighborRank(orderedItems, params.beforeItemId);
    }

    if (params.afterItemId && !params.beforeItemId) {
      beforeRank = this.findNextNeighborRank(orderedItems, params.afterItemId);
    }

    return { afterRank, beforeRank };
  }

  private findPreviousNeighborRank(
    orderedItems: TItem[],
    beforeItemId: string,
  ): string | null {
    const index = orderedItems.findIndex(
      (item) => this.config.getItemId(item) === beforeItemId,
    );
    if (index <= 0) {
      return null;
    }
    return this.config.getLexoRank(orderedItems[index - 1]);
  }

  private findNextNeighborRank(
    orderedItems: TItem[],
    afterItemId: string,
  ): string | null {
    const index = orderedItems.findIndex(
      (item) => this.config.getItemId(item) === afterItemId,
    );
    if (index < 0 || index >= orderedItems.length - 1) {
      return null;
    }
    return this.config.getLexoRank(orderedItems[index + 1]);
  }
}
