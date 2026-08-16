import { describe, expect, it, jest } from "@jest/globals";
import type {
  DbosTransactionBridge,
  PostgresTransactionOptions,
} from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { Repository } from "./Repository.js";

describe("Catalog Repository transactional-step wiring", () => {
  it("shares one transaction manager across the entire repository graph", async () => {
    const db = {
      transaction: jest.fn(),
    } as unknown as Database;
    const bridge: DbosTransactionBridge<
      Database,
      PostgresTransactionOptions
    > = {
      async runTransaction<TResult>(): Promise<TResult> {
        throw new Error("Bridge execution is not part of repository wiring");
      },
    };

    const repository = await Repository.create({
      db,
      dbosTransactionBridge: bridge,
    });
    const childRepositories = [
      repository.product,
      repository.vendor,
      repository.variant,
      repository.category,
      repository.tag,
      repository.pricing,
      repository.option,
      repository.optionCategory,
      repository.feature,
      repository.translation,
      repository.media,
      repository.bulkEditJob,
      repository.bulkEditItem,
      repository.bulkFence,
      repository.facetCandidate,
      repository.listingFacetAffectedProduct,
      repository.collection,
      repository.collectionItem,
      repository.collectionRule,
      repository.inventoryItem,
      repository.inventoryWidget,
      repository.cost,
      repository.physical,
      repository.stock,
      repository.warehouse,
      repository.component,
    ];

    for (const child of childRepositories) {
      expect(
        (child as unknown as { txManager: unknown }).txManager,
      ).toBe(repository.txManager);
    }
    expect(repository.dbosTransactionBridge).toBe(bridge);
  });
});
