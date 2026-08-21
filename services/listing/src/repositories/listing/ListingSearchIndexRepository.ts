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
  readonly textElements: readonly Omit<SearchTextElementInput, "productDocId">[];
  readonly identifiers: readonly ListingSearchIndexIdentifierWriteModel[];
  readonly terms: readonly SearchTermInput[];
}

export interface ListingSearchIndexIdentifierWriteModel extends Omit<
  SearchIdentifierInput,
  "productDocId"
> {
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
}

export interface ListingSearchIndexAllocatedProductWriteModel {
  readonly productDocId: number;
  readonly writeModel: ListingSearchIndexProductWriteModel;
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
    productDocId: number,
    writeModel: ListingSearchIndexProductWriteModel,
  ): Promise<ListingSearchIndexWriteResult> {
    this.assertProductWriteModel(productId, writeModel);
    const allocated = this.attachProductDocId(productDocId, writeModel);

    const textElements = await this.textElements.replaceForProduct(
      productId,
      allocated.textElements,
    );
    const identifiers = await this.identifiers.replaceForProduct(productId, allocated.identifiers);
    const terms = await this.terms.upsertMany(writeModel.terms);

    return { textElements, identifiers, terms };
  }

  @Transactional()
  async replaceForProducts(
    writeModelsByProductId: ReadonlyMap<string, ListingSearchIndexAllocatedProductWriteModel>,
  ): Promise<ListingSearchIndexWriteResult> {
    if (writeModelsByProductId.size === 0) {
      return { textElements: [], identifiers: [], terms: [] };
    }

    const textElementsByProductId = new Map<string, readonly SearchTextElementInput[]>();
    const identifiersByProductId = new Map<string, readonly SearchIdentifierInput[]>();
    const terms: SearchTermInput[] = [];

    for (const [productId, allocatedWriteModel] of writeModelsByProductId) {
      const { productDocId, writeModel } = allocatedWriteModel;
      this.assertProductWriteModel(productId, writeModel);
      const allocated = this.attachProductDocId(productDocId, writeModel);
      textElementsByProductId.set(productId, allocated.textElements);
      identifiersByProductId.set(productId, allocated.identifiers);
      terms.push(...writeModel.terms);
    }

    const textElements = await this.textElements.replaceForProducts(textElementsByProductId);
    const identifiers = await this.identifiers.replaceForProducts(identifiersByProductId);
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
    for (const row of writeModel.textElements) {
      if (row.productId !== productId) {
        throw new Error("Search text element productId must match listing write key");
      }
    }
    for (const row of writeModel.identifiers) {
      if (row.productId !== productId) {
        throw new Error("Search identifier productId must match listing write key");
      }
    }
  }

  private attachProductDocId(
    productDocId: number,
    writeModel: ListingSearchIndexProductWriteModel,
  ): {
    textElements: SearchTextElementInput[];
    identifiers: SearchIdentifierInput[];
  } {
    if (!Number.isInteger(productDocId) || productDocId <= 0) {
      throw new Error("Search index productDocId must be a positive integer");
    }

    return {
      textElements: writeModel.textElements.map((row) => ({
        ...row,
        productDocId,
      })),
      identifiers: writeModel.identifiers.map((row) => ({
        productId: row.productId,
        productDocId,
        locale: row.locale,
        elementId: row.elementId,
        kind: row.kind,
        normalizedValue: row.normalizedValue,
      })),
    };
  }
}
