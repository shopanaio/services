import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import {
  ListingDocIdAllocatorRepository,
  ProductListingIndexRepository,
  ProductListingPriceIndexRepository,
  VariantListingIndexRepository,
  VariantListingPriceIndexRepository,
  ListingPostingBitmapRepository,
  ListingPostingProductSortRepository,
  ListingPostingVariantPriceRepository,
  ListingPostingVariantProjectionBlockRepository,
  ProductTitleBm25SearchIndexRepository,
} from "./listing/index.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

export class Repository {
  public readonly listingDocIdAllocator: ListingDocIdAllocatorRepository;
  public readonly productListingIndex: ProductListingIndexRepository;
  public readonly productListingPriceIndex: ProductListingPriceIndexRepository;
  public readonly variantListingIndex: VariantListingIndexRepository;
  public readonly variantListingPriceIndex: VariantListingPriceIndexRepository;
  public readonly listingPostingBitmap: ListingPostingBitmapRepository;
  public readonly listingPostingProductSort: ListingPostingProductSortRepository;
  public readonly listingPostingVariantPrice: ListingPostingVariantPriceRepository;
  public readonly listingPostingVariantProjectionBlock: ListingPostingVariantProjectionBlockRepository;
  public readonly productTitleBm25SearchIndex: ProductTitleBm25SearchIndexRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    listingDocIdAllocator: ListingDocIdAllocatorRepository,
    productListingIndex: ProductListingIndexRepository,
    productListingPriceIndex: ProductListingPriceIndexRepository,
    variantListingIndex: VariantListingIndexRepository,
    variantListingPriceIndex: VariantListingPriceIndexRepository,
    listingPostingBitmap: ListingPostingBitmapRepository,
    listingPostingProductSort: ListingPostingProductSortRepository,
    listingPostingVariantPrice: ListingPostingVariantPriceRepository,
    listingPostingVariantProjectionBlock: ListingPostingVariantProjectionBlockRepository,
    productTitleBm25SearchIndex: ProductTitleBm25SearchIndexRepository,
    txManager: TransactionManager<Database>
  ) {
    this.listingDocIdAllocator = listingDocIdAllocator;
    this.productListingIndex = productListingIndex;
    this.productListingPriceIndex = productListingPriceIndex;
    this.variantListingIndex = variantListingIndex;
    this.variantListingPriceIndex = variantListingPriceIndex;
    this.listingPostingBitmap = listingPostingBitmap;
    this.listingPostingProductSort = listingPostingProductSort;
    this.listingPostingVariantPrice = listingPostingVariantPrice;
    this.listingPostingVariantProjectionBlock = listingPostingVariantProjectionBlock;
    this.productTitleBm25SearchIndex = productTitleBm25SearchIndex;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;
    const txManager = new TransactionManager(db);

    const listingDocIdAllocator = new ListingDocIdAllocatorRepository(
      db,
      txManager
    );
    const productListingIndex = new ProductListingIndexRepository(db, txManager);
    const productListingPriceIndex = new ProductListingPriceIndexRepository(
      db,
      txManager
    );
    const variantListingIndex = new VariantListingIndexRepository(db, txManager);
    const variantListingPriceIndex = new VariantListingPriceIndexRepository(
      db,
      txManager
    );
    const listingPostingBitmap = new ListingPostingBitmapRepository(
      db,
      txManager
    );
    const listingPostingProductSort = new ListingPostingProductSortRepository(
      db,
      txManager
    );
    const listingPostingVariantPrice = new ListingPostingVariantPriceRepository(
      db,
      txManager
    );
    const listingPostingVariantProjectionBlock =
      new ListingPostingVariantProjectionBlockRepository(db, txManager);
    const productTitleBm25SearchIndex =
      new ProductTitleBm25SearchIndexRepository(db, txManager);

    return new Repository(
      listingDocIdAllocator,
      productListingIndex,
      productListingPriceIndex,
      variantListingIndex,
      variantListingPriceIndex,
      listingPostingBitmap,
      listingPostingProductSort,
      listingPostingVariantPrice,
      listingPostingVariantProjectionBlock,
      productTitleBm25SearchIndex,
      txManager
    );
  }
}
