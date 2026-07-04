import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import {
  ListingIndexItemStateRepository,
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
import {
  StorefrontFacetAggregationRepository,
  StorefrontFacetResolutionRepository,
  StorefrontListingQueryRepository,
  StorefrontPostingBitmapQueryRepository,
  StorefrontProductSortCollectorRepository,
  StorefrontProductTitleSearchQueryRepository,
  StorefrontVariantPriceCollectorRepository,
  StorefrontVariantProjectionQueryRepository,
} from "./storefront/index.js";
import { FacetRepository } from "./facet/FacetRepository.js";
import { FacetValueRepository } from "./facet/FacetValueRepository.js";
import { FacetSwatchRepository } from "./facet/FacetSwatchRepository.js";
import { CatalogFacetCandidateClient } from "./facet/CatalogFacetCandidateClient.js";
import type { ServiceBroker } from "@shopana/shared-kernel";

export interface RepositoryConfig {
  db: Database;
  broker: ServiceBroker;
  heavyOptionFacetCountsEnabled?: boolean;
  facetCountsProfilingEnabled?: boolean;
}

export type { Database };

const LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED_DEFAULT = false;
const LISTING_FACET_COUNTS_PROFILING_ENABLED_DEFAULT = false;

export class Repository {
  public readonly listingIndexItemState: ListingIndexItemStateRepository;
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
  public readonly facet: FacetRepository;
  public readonly facetValue: FacetValueRepository;
  public readonly facetSwatch: FacetSwatchRepository;
  public readonly storefrontFacetResolution: StorefrontFacetResolutionRepository;
  public readonly storefrontPostingBitmapQuery: StorefrontPostingBitmapQueryRepository;
  public readonly storefrontVariantProjectionQuery: StorefrontVariantProjectionQueryRepository;
  public readonly storefrontProductSortCollector: StorefrontProductSortCollectorRepository;
  public readonly storefrontVariantPriceCollector: StorefrontVariantPriceCollectorRepository;
  public readonly storefrontProductTitleSearchQuery: StorefrontProductTitleSearchQueryRepository;
  public readonly storefrontFacetAggregation: StorefrontFacetAggregationRepository;
  public readonly storefrontListingQuery: StorefrontListingQueryRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    listingIndexItemState: ListingIndexItemStateRepository,
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
    facet: FacetRepository,
    facetValue: FacetValueRepository,
    facetSwatch: FacetSwatchRepository,
    storefrontFacetResolution: StorefrontFacetResolutionRepository,
    storefrontPostingBitmapQuery: StorefrontPostingBitmapQueryRepository,
    storefrontVariantProjectionQuery: StorefrontVariantProjectionQueryRepository,
    storefrontProductSortCollector: StorefrontProductSortCollectorRepository,
    storefrontVariantPriceCollector: StorefrontVariantPriceCollectorRepository,
    storefrontProductTitleSearchQuery: StorefrontProductTitleSearchQueryRepository,
    storefrontFacetAggregation: StorefrontFacetAggregationRepository,
    storefrontListingQuery: StorefrontListingQueryRepository,
    txManager: TransactionManager<Database>
  ) {
    this.listingIndexItemState = listingIndexItemState;
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
    this.facet = facet;
    this.facetValue = facetValue;
    this.facetSwatch = facetSwatch;
    this.storefrontFacetResolution = storefrontFacetResolution;
    this.storefrontPostingBitmapQuery = storefrontPostingBitmapQuery;
    this.storefrontVariantProjectionQuery = storefrontVariantProjectionQuery;
    this.storefrontProductSortCollector = storefrontProductSortCollector;
    this.storefrontVariantPriceCollector = storefrontVariantPriceCollector;
    this.storefrontProductTitleSearchQuery = storefrontProductTitleSearchQuery;
    this.storefrontFacetAggregation = storefrontFacetAggregation;
    this.storefrontListingQuery = storefrontListingQuery;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db, broker } = config;
    const heavyOptionFacetCountsEnabled =
      config.heavyOptionFacetCountsEnabled ??
      LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED_DEFAULT;
    const facetCountsProfilingEnabled =
      config.facetCountsProfilingEnabled ??
      LISTING_FACET_COUNTS_PROFILING_ENABLED_DEFAULT;
    const txManager = new TransactionManager(db);

    const listingIndexItemState = new ListingIndexItemStateRepository(
      db,
      txManager
    );
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
    const facetCandidateClient = new CatalogFacetCandidateClient(broker);
    const facet = new FacetRepository(db, txManager, facetCandidateClient);
    const facetValue = new FacetValueRepository(db, txManager);
    const facetSwatch = new FacetSwatchRepository(db, txManager);
    const storefrontFacetResolution = new StorefrontFacetResolutionRepository(
      db,
      txManager
    );
    const storefrontPostingBitmapQuery =
      new StorefrontPostingBitmapQueryRepository(db, txManager);
    const storefrontVariantProjectionQuery =
      new StorefrontVariantProjectionQueryRepository(db, txManager);
    const storefrontProductSortCollector =
      new StorefrontProductSortCollectorRepository(db, txManager);
    const storefrontVariantPriceCollector =
      new StorefrontVariantPriceCollectorRepository(db, txManager);
    const storefrontProductTitleSearchQuery =
      new StorefrontProductTitleSearchQueryRepository(db, txManager);
    const storefrontFacetAggregation = new StorefrontFacetAggregationRepository(
      db,
      txManager
    );
    const storefrontListingQuery = new StorefrontListingQueryRepository(
      db,
      txManager,
      storefrontFacetResolution,
      storefrontPostingBitmapQuery,
      storefrontVariantProjectionQuery,
      storefrontProductSortCollector,
      storefrontVariantPriceCollector,
      storefrontProductTitleSearchQuery,
      storefrontFacetAggregation,
      heavyOptionFacetCountsEnabled,
      facetCountsProfilingEnabled
    );

    return new Repository(
      listingIndexItemState,
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
      facet,
      facetValue,
      facetSwatch,
      storefrontFacetResolution,
      storefrontPostingBitmapQuery,
      storefrontVariantProjectionQuery,
      storefrontProductSortCollector,
      storefrontVariantPriceCollector,
      storefrontProductTitleSearchQuery,
      storefrontFacetAggregation,
      storefrontListingQuery,
      txManager
    );
  }

  runListingIndexItemTransaction<TResult>(
    fn: () => Promise<TResult>
  ): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
