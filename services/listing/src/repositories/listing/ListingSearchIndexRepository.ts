import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import type {
  ProductSearchIdentifier,
  ProductSearchText,
  SearchTermDictionary,
} from "../models/index.js";
import type { SearchIdentifierRepository } from "../search/SearchIdentifierRepository.js";
import type { SearchTermRepository } from "../search/SearchTermRepository.js";
import type { SearchTextElementRepository } from "../search/SearchTextElementRepository.js";
import type {
  SearchIdentifierInput,
  SearchTermInput,
  SearchTextElementInput,
} from "../search/searchRepositoryTypes.js";

export interface ListingSearchIndexProductWriteModel {
  readonly textElements: readonly SearchTextElementInput[];
  readonly identifiers: readonly SearchIdentifierInput[];
  readonly terms: readonly SearchTermInput[];
}

export interface ListingSearchIndexProductSnapshot {
  textElements: ProductSearchText[];
  identifiers: ProductSearchIdentifier[];
}

export interface ListingSearchIndexWriteResult {
  textElements: ProductSearchText[];
  identifiers: ProductSearchIdentifier[];
  terms: SearchTermDictionary[];
}

/**
 * Canonical repository boundary for item-scoped search index writes.
 *
 * Product-bound rows are replaced atomically. Vocabulary rows are only
 * idempotently upserted: stale terms are intentionally left for bounded
 * reconciliation because the dictionary is not a product membership table.
 */
export class ListingSearchIndexRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly textElements: SearchTextElementRepository,
    private readonly identifiers: SearchIdentifierRepository,
    private readonly terms: SearchTermRepository,
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async getByProductId(
    productId: string,
    locale?: string,
  ): Promise<ListingSearchIndexProductSnapshot> {
    const [textElements, identifiers] = await Promise.all([
      this.textElements.getByProductId(productId, locale),
      this.identifiers.getByProductId(productId, locale),
    ]);

    return { textElements, identifiers };
  }

  @Transactional()
  async replaceForProduct(
    productId: string,
    writeModel: ListingSearchIndexProductWriteModel,
  ): Promise<ListingSearchIndexWriteResult> {
    this.assertProductWriteModel(productId, writeModel);

    const textElements = await this.textElements.replaceForProduct(
      productId,
      writeModel.textElements,
    );
    const identifiers = await this.identifiers.replaceForProduct(
      productId,
      writeModel.identifiers,
    );
    const terms = await this.terms.upsertMany(writeModel.terms);

    return { textElements, identifiers, terms };
  }

  @Transactional()
  async replaceForProducts(
    writeModelsByProductId: ReadonlyMap<
      string,
      ListingSearchIndexProductWriteModel
    >,
  ): Promise<ListingSearchIndexWriteResult> {
    if (writeModelsByProductId.size === 0) {
      return { textElements: [], identifiers: [], terms: [] };
    }

    const textElementsByProductId = new Map<
      string,
      readonly SearchTextElementInput[]
    >();
    const identifiersByProductId = new Map<
      string,
      readonly SearchIdentifierInput[]
    >();
    const terms: SearchTermInput[] = [];

    for (const [productId, writeModel] of writeModelsByProductId) {
      this.assertProductWriteModel(productId, writeModel);
      textElementsByProductId.set(productId, writeModel.textElements);
      identifiersByProductId.set(productId, writeModel.identifiers);
      terms.push(...writeModel.terms);
    }

    const textElements = await this.textElements.replaceForProducts(
      textElementsByProductId,
    );
    const identifiers = await this.identifiers.replaceForProducts(
      identifiersByProductId,
    );
    const upsertedTerms = await this.terms.upsertMany(terms);

    return { textElements, identifiers, terms: upsertedTerms };
  }

  @Transactional()
  async deleteByProductId(productId: string): Promise<{
    textElements: number;
    identifiers: number;
  }> {
    const textElements = await this.textElements.deleteByProductId(productId);
    const identifiers = await this.identifiers.deleteByProductId(productId);

    return { textElements, identifiers };
  }

  @Transactional()
  async deleteByProductIds(productIds: readonly string[]): Promise<{
    textElements: number;
    identifiers: number;
  }> {
    if (productIds.length === 0) {
      return { textElements: 0, identifiers: 0 };
    }

    const textElements = await this.textElements.deleteByProductIds(productIds);
    const identifiers = await this.identifiers.deleteByProductIds(productIds);

    return { textElements, identifiers };
  }

  private assertProductWriteModel(
    productId: string,
    writeModel: ListingSearchIndexProductWriteModel,
  ): void {
    let productDocId: number | null = null;
    const assertProductDocId = (value: number): void => {
      if (productDocId === null) {
        productDocId = value;
        return;
      }
      if (productDocId !== value) {
        throw new Error(
          "Search index rows for one product must use one productDocId",
        );
      }
    };

    for (const row of writeModel.textElements) {
      if (row.productId !== productId) {
        throw new Error(
          "Search text element productId must match listing write key",
        );
      }
      assertProductDocId(row.productDocId);
    }
    for (const row of writeModel.identifiers) {
      if (row.productId !== productId) {
        throw new Error(
          "Search identifier productId must match listing write key",
        );
      }
      assertProductDocId(row.productDocId);
    }
  }
}
