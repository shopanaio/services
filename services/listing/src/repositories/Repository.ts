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
  CollectionStateRepository,
  CollectionRuleEvaluationRepository,
} from "./listing/index.js";
import {
  StorefrontFacetResolutionRepository,
  StorefrontListingQueryRepository,
  StorefrontRecommendationQueryRepository,
} from "./storefront/index.js";
import {
  ManualProductRecommendationRepository,
  RecommendationAnchorCollectorRepository,
  RecommendationBuildRequestRepository,
  RecommendationCalculationAccumulatorRepository,
  RecommendationCalculationRunRepository,
  RecommendationCandidateSourceRepository,
  RecommendationIngestionCursorRepository,
  RecommendationMaintenanceRepository,
  RecommendationOrderFactRepository,
  RecommendationPlacementPolicyRepository,
  RecommendationSnapshotRepository,
} from "./recommendation/index.js";
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
  public readonly collectionState: CollectionStateRepository;
  public readonly collectionRuleEvaluation: CollectionRuleEvaluationRepository;
  public readonly facet: FacetRepository;
  public readonly facetValue: FacetValueRepository;
  public readonly facetSwatch: FacetSwatchRepository;
  public readonly storefrontFacetResolution: StorefrontFacetResolutionRepository;
  public readonly storefrontListingQuery: StorefrontListingQueryRepository;
  public readonly storefrontRecommendationQuery: StorefrontRecommendationQueryRepository;
  public readonly recommendationPlacementPolicy: RecommendationPlacementPolicyRepository;
  public readonly manualProductRecommendation: ManualProductRecommendationRepository;
  public readonly recommendationIngestionCursor: RecommendationIngestionCursorRepository;
  public readonly recommendationOrderFact: RecommendationOrderFactRepository;
  public readonly recommendationCalculationRun: RecommendationCalculationRunRepository;
  public readonly recommendationCalculationAccumulator: RecommendationCalculationAccumulatorRepository;
  public readonly recommendationCandidateSource: RecommendationCandidateSourceRepository;
  public readonly recommendationSnapshot: RecommendationSnapshotRepository;
  public readonly recommendationMaintenance: RecommendationMaintenanceRepository;
  public readonly recommendationBuildRequest: RecommendationBuildRequestRepository;
  public readonly recommendationAnchorCollector: RecommendationAnchorCollectorRepository;
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
    collectionState: CollectionStateRepository,
    collectionRuleEvaluation: CollectionRuleEvaluationRepository,
    facet: FacetRepository,
    facetValue: FacetValueRepository,
    facetSwatch: FacetSwatchRepository,
    storefrontFacetResolution: StorefrontFacetResolutionRepository,
    storefrontListingQuery: StorefrontListingQueryRepository,
    storefrontRecommendationQuery: StorefrontRecommendationQueryRepository,
    recommendationPlacementPolicy: RecommendationPlacementPolicyRepository,
    manualProductRecommendation: ManualProductRecommendationRepository,
    recommendationIngestionCursor: RecommendationIngestionCursorRepository,
    recommendationOrderFact: RecommendationOrderFactRepository,
    recommendationCalculationRun: RecommendationCalculationRunRepository,
    recommendationCalculationAccumulator: RecommendationCalculationAccumulatorRepository,
    recommendationCandidateSource: RecommendationCandidateSourceRepository,
    recommendationSnapshot: RecommendationSnapshotRepository,
    recommendationMaintenance: RecommendationMaintenanceRepository,
    recommendationBuildRequest: RecommendationBuildRequestRepository,
    recommendationAnchorCollector: RecommendationAnchorCollectorRepository,
    searchTextElement: SearchTextElementRepository,
    searchIdentifier: SearchIdentifierRepository,
    searchTerm: SearchTermRepository,
    searchSettings: SearchSettingsRepository,
    searchSynonym: SearchSynonymRepository,
    searchProductBoost: SearchProductBoostRepository,
    txManager: TransactionManager<Database>,
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
    this.collectionState = collectionState;
    this.collectionRuleEvaluation = collectionRuleEvaluation;
    this.facet = facet;
    this.facetValue = facetValue;
    this.facetSwatch = facetSwatch;
    this.storefrontFacetResolution = storefrontFacetResolution;
    this.storefrontListingQuery = storefrontListingQuery;
    this.storefrontRecommendationQuery = storefrontRecommendationQuery;
    this.recommendationPlacementPolicy = recommendationPlacementPolicy;
    this.manualProductRecommendation = manualProductRecommendation;
    this.recommendationIngestionCursor = recommendationIngestionCursor;
    this.recommendationOrderFact = recommendationOrderFact;
    this.recommendationCalculationRun = recommendationCalculationRun;
    this.recommendationCalculationAccumulator = recommendationCalculationAccumulator;
    this.recommendationCandidateSource = recommendationCandidateSource;
    this.recommendationSnapshot = recommendationSnapshot;
    this.recommendationMaintenance = recommendationMaintenance;
    this.recommendationBuildRequest = recommendationBuildRequest;
    this.recommendationAnchorCollector = recommendationAnchorCollector;
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
      config.heavyOptionFacetCountsEnabled ?? LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED_DEFAULT;
    const facetCountsProfilingEnabled =
      config.facetCountsProfilingEnabled ?? LISTING_FACET_COUNTS_PROFILING_ENABLED_DEFAULT;
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
      searchTerm,
    );
    const listingDocIdAllocator = new ListingDocIdAllocatorRepository(db, txManager);
    const productListingIndex = new ProductListingIndexRepository(db, txManager);
    const productListingPriceIndex = new ProductListingPriceIndexRepository(db, txManager);
    const variantListingIndex = new VariantListingIndexRepository(db, txManager);
    const variantListingPriceIndex = new VariantListingPriceIndexRepository(db, txManager);
    const listingPostingBitmap = new ListingPostingBitmapRepository(db, txManager);
    const listingPostingProductSort = new ListingPostingProductSortRepository(db, txManager);
    const listingPostingVariantProjectionBlock = new ListingPostingVariantProjectionBlockRepository(
      db,
      txManager,
    );
    const collectionState = new CollectionStateRepository(db, txManager);
    const collectionRuleEvaluation = new CollectionRuleEvaluationRepository(db, txManager);
    const facetCandidateClient = new CatalogFacetCandidateClient(broker);
    const facet = new FacetRepository(db, txManager, facetCandidateClient);
    const facetValue = new FacetValueRepository(db, txManager);
    const facetSwatch = new FacetSwatchRepository(db, txManager);
    const storefrontFacetResolution = new StorefrontFacetResolutionRepository(db, txManager);
    const storefrontListingQuery = new StorefrontListingQueryRepository(
      db,
      txManager,
      storefrontFacetResolution,
      heavyOptionFacetCountsEnabled,
      facetCountsProfilingEnabled,
    );
    const storefrontRecommendationQuery = new StorefrontRecommendationQueryRepository(
      db,
      txManager,
    );
    const recommendationPlacementPolicy = new RecommendationPlacementPolicyRepository(
      db,
      txManager,
    );
    const manualProductRecommendation = new ManualProductRecommendationRepository(db, txManager);
    const recommendationIngestionCursor = new RecommendationIngestionCursorRepository(
      db,
      txManager,
    );
    const recommendationOrderFact = new RecommendationOrderFactRepository(db, txManager);
    const recommendationCalculationRun = new RecommendationCalculationRunRepository(db, txManager);
    const recommendationCalculationAccumulator = new RecommendationCalculationAccumulatorRepository(
      db,
      txManager,
    );
    const recommendationCandidateSource = new RecommendationCandidateSourceRepository(
      db,
      txManager,
    );
    const recommendationSnapshot = new RecommendationSnapshotRepository(db, txManager);
    const recommendationMaintenance = new RecommendationMaintenanceRepository(db, txManager);
    const recommendationBuildRequest = new RecommendationBuildRequestRepository(db, txManager);
    const recommendationAnchorCollector = new RecommendationAnchorCollectorRepository(
      db,
      txManager,
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
      collectionState,
      collectionRuleEvaluation,
      facet,
      facetValue,
      facetSwatch,
      storefrontFacetResolution,
      storefrontListingQuery,
      storefrontRecommendationQuery,
      recommendationPlacementPolicy,
      manualProductRecommendation,
      recommendationIngestionCursor,
      recommendationOrderFact,
      recommendationCalculationRun,
      recommendationCalculationAccumulator,
      recommendationCandidateSource,
      recommendationSnapshot,
      recommendationMaintenance,
      recommendationBuildRequest,
      recommendationAnchorCollector,
      searchTextElement,
      searchIdentifier,
      searchTerm,
      searchSettings,
      searchSynonym,
      searchProductBoost,
      txManager,
    );
  }

  runListingIndexItemTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
