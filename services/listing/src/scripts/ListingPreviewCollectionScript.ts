import type {
  CanonicalCollectionRule,
  PreviewCollectionRulesResult,
} from "@shopana/broker-types";
import { sql } from "drizzle-orm";
import { BaseScript, Transactional } from "../kernel/BaseScript.js";

export interface ListingPreviewCollectionInput {
  rules: readonly CanonicalCollectionRule[];
  rulesHash: string;
}

export class ListingPreviewCollectionScript extends BaseScript<
  ListingPreviewCollectionInput,
  PreviewCollectionRulesResult
> {
  @Transactional()
  protected async execute(
    input: ListingPreviewCollectionInput,
  ): Promise<PreviewCollectionRulesResult> {
    const startedAt = Date.now();
    await this.repository.db.execute(sql`SET LOCAL statement_timeout = '5s'`);
    const result = await this.repository.collectionRuleEvaluation.evaluate({
      rules: input.rules,
      currency: this.context.store.currencyCode,
      universe: "storefront",
      definitionKey: { kind: "transient", rulesHash: input.rulesHash },
    });
    this.logger.info(
      {
        result: "success",
        count: result.cardinality,
        durationMs: Date.now() - startedAt,
      },
      "Collection rule preview completed",
    );
    return {
      ok: true,
      count: result.cardinality,
      rulesHash: input.rulesHash,
      indexObservedAt: new Date().toISOString(),
    };
  }

  protected handleError(error: unknown): PreviewCollectionRulesResult {
    this.logger.error({ error }, "Collection preview failed");
    return {
      ok: false,
      code:
        error instanceof Error &&
        /statement timeout|canceling statement/i.test(error.message)
          ? "COLLECTION_PREVIEW_TIMEOUT"
          : "COLLECTION_PREVIEW_UNAVAILABLE",
      message: "Collection rule preview is temporarily unavailable",
      retryable: true,
    };
  }
}
