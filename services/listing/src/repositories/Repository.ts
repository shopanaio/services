import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import {
  ListingIndexItemStateRepository,
  ListingSearchIndexRepository,
  ListingDocIdAllocatorRepository,
  ProductListingIndexRepository,
  ProductListingPriceIndexRepository,
  VariantListingIndexRepository,
  VariantListingPriceIndexRepository,
  ListingPostingBitmapRepository,
  ListingPostingProductSortRepository,
  ListingPostingVariantProjectionBlockRepository,
} from "./listing/index.js";
import {
  StorefrontFacetResolutionRepository,
  StorefrontListingQueryRepository,
} from "./storefront/index.js";
import { FacetRepository } from "./facet/FacetRepository.js";
import { FacetValueRepository } from "./facet/FacetValueRepository.js";
import { FacetSwatchRepository } from "./facet/FacetSwatchRepository.js";
import { CatalogFacetCandidateClient } from "./facet/CatalogFacetCandidateClient.js";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  SearchIdentifierRepository,
  SearchProductBoostRepository,
  SearchSettingsRepository,
  SearchSynonymRepository,
  SearchTermRepository,
  SearchTextElementRepository,
} from "./search/index.js";

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
  public readonly listingSearchIndex: ListingSearchIndexRepository;
  public readonly listingDocIdAllocator: ListingDocIdAllocatorRepository;
  public readonly productListingIndex: ProductListingIndexRepository;
  public readonly productListingPriceIndex: ProductListingPriceIndexRepository;
  public readonly variantListingIndex: VariantListingIndexRepository;
  public readonly variantListingPriceIndex: VariantListingPriceIndexRepository;
  public readonly listingPostingBitmap: ListingPostingBitmapRepository;
  public readonly listingPostingProductSort: ListingPostingProductSortRepository;
  public readonly listingPostingVariantProjectionBlock: ListingPostingVariantProjectionBlockRepository;
  public readonly facet: FacetRepository;
  public readonly facetValue: FacetValueRepository;
  public readonly facetSwatch: FacetSwatchRepository;
  public readonly storefrontFacetResolution: StorefrontFacetResolutionRepository;
  public readonly storefrontListingQuery: StorefrontListingQueryRepository;
  public readonly searchTextElement: SearchTextElementRepository;
  public readonly searchIdentifier: SearchIdentifierRepository;
  public readonly searchTerm: SearchTermRepository;
  public readonly searchSettings: SearchSettingsRepository;
  public readonly searchSynonym: SearchSynonymRepository;
  public readonly searchProductBoost: SearchProductBoostRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    listingIndexItemState: ListingIndexItemStateRepository,
    listingSearchIndex: ListingSearchIndexRepository,
    listingDocIdAllocator: ListingDocIdAllocatorRepository,
    productListingIndex: ProductListingIndexRepository,
    productListingPriceIndex: ProductListingPriceIndexRepository,
    variantListingIndex: VariantListingIndexRepository,
    variantListingPriceIndex: VariantListingPriceIndexRepository,
    listingPostingBitmap: ListingPostingBitmapRepository,
    listingPostingProductSort: ListingPostingProductSortRepository,
    listingPostingVariantProjectionBlock: ListingPostingVariantProjectionBlockRepository,
    facet: FacetRepository,
    facetValue: FacetValueRepository,
    facetSwatch: FacetSwatchRepository,
    storefrontFacetResolution: StorefrontFacetResolutionRepository,
    storefrontListingQuery: StorefrontListingQueryRepository,
    searchTextElement: SearchTextElementRepository,
    searchIdentifier: SearchIdentifierRepository,
    searchTerm: SearchTermRepository,
    searchSettings: SearchSettingsRepository,
    searchSynonym: SearchSynonymRepository,
    searchProductBoost: SearchProductBoostRepository,
    txManager: TransactionManager<Database>
  ) {
    this.listingIndexItemState = listingIndexItemState;
    this.listingSearchIndex = listingSearchIndex;
    this.listingDocIdAllocator = listingDocIdAllocator;
    this.productListingIndex = productListingIndex;
    this.productListingPriceIndex = productListingPriceIndex;
    this.variantListingIndex = variantListingIndex;
    this.variantListingPriceIndex = variantListingPriceIndex;
    this.listingPostingBitmap = listingPostingBitmap;
    this.listingPostingProductSort = listingPostingProductSort;
    this.listingPostingVariantProjectionBlock = listingPostingVariantProjectionBlock;
    this.facet = facet;
    this.facetValue = facetValue;
    this.facetSwatch = facetSwatch;
    this.storefrontFacetResolution = storefrontFacetResolution;
    this.storefrontListingQuery = storefrontListingQuery;
    this.searchTextElement = searchTextElement;
    this.searchIdentifier = searchIdentifier;
    this.searchTerm = searchTerm;
    this.searchSettings = searchSettings;
    this.searchSynonym = searchSynonym;
    this.searchProductBoost = searchProductBoost;
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

    const listingIndexItemState = new ListingIndexItemStateRepository(db, txManager);
    const searchTextElement = new SearchTextElementRepository(db, txManager);
    const searchIdentifier = new SearchIdentifierRepository(db, txManager);
    const searchTerm = new SearchTermRepository(db, txManager);
    const listingSearchIndex = new ListingSearchIndexRepository(
      db,
      txManager,
      searchTextElement,
      searchIdentifier,
      searchTerm
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
    const listingPostingVariantProjectionBlock =
      new ListingPostingVariantProjectionBlockRepository(db, txManager);
    const facetCandidateClient = new CatalogFacetCandidateClient(broker);
    const facet = new FacetRepository(db, txManager, facetCandidateClient);
    const facetValue = new FacetValueRepository(db, txManager);
    const facetSwatch = new FacetSwatchRepository(db, txManager);
    const storefrontFacetResolution = new StorefrontFacetResolutionRepository(
      db,
      txManager
    );
    const storefrontListingQuery = new StorefrontListingQueryRepository(
      db,
      txManager,
      storefrontFacetResolution,
      heavyOptionFacetCountsEnabled,
      facetCountsProfilingEnabled
    );
    const searchSettings = new SearchSettingsRepository(db, txManager);
    const searchSynonym = new SearchSynonymRepository(db, txManager);
    const searchProductBoost = new SearchProductBoostRepository(db, txManager);

    return new Repository(
      listingIndexItemState,
      listingSearchIndex,
      listingDocIdAllocator,
      productListingIndex,
      productListingPriceIndex,
      variantListingIndex,
      variantListingPriceIndex,
      listingPostingBitmap,
      listingPostingProductSort,
      listingPostingVariantProjectionBlock,
      facet,
      facetValue,
      facetSwatch,
      storefrontFacetResolution,
      storefrontListingQuery,
      searchTextElement,
      searchIdentifier,
      searchTerm,
      searchSettings,
      searchSynonym,
      searchProductBoost,
      txManager
    );
  }

  runListingIndexItemTransaction<TResult>(
    fn: () => Promise<TResult>
  ): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
