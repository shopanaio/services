import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { ProductRepository } from "./product/ProductRepository.js";
import { VendorRepository } from "./vendor/VendorRepository.js";
import { VariantRepository } from "./variant/VariantRepository.js";
import { CategoryRepository } from "./category/CategoryRepository.js";
import { TagRepository } from "./tag/TagRepository.js";
import { PricingRepository } from "./pricing/PricingRepository.js";
import { OptionRepository } from "./option/OptionRepository.js";
import { FeatureRepository } from "./feature/FeatureRepository.js";
import { TranslationRepository } from "./translation/TranslationRepository.js";
import { MediaRepository } from "./media/MediaRepository.js";
import { BulkEditJobRepository } from "./BulkEditJobRepository.js";
import { BulkEditItemRepository } from "./BulkEditItemRepository.js";
import { BulkFenceRepository } from "./BulkFenceRepository.js";
import { SearchIndexRepository } from "./listing/SearchIndexRepository.js";
import { VariantSearchIndexRepository } from "./listing/VariantSearchIndexRepository.js";
import { FacetGroupRepository } from "./facet/FacetGroupRepository.js";
import { FacetRepository } from "./facet/FacetRepository.js";
import { FacetValueRepository } from "./facet/FacetValueRepository.js";
import { FacetSwatchRepository } from "./facet/FacetSwatchRepository.js";
import { CollectionRepository } from "./collection/CollectionRepository.js";
import { CollectionItemRepository } from "./collection/CollectionItemRepository.js";
import { CollectionRuleRepository } from "./collection/CollectionRuleRepository.js";
import { CostRepository } from "./cost/CostRepository.js";
import { PhysicalRepository } from "./physical/PhysicalRepository.js";
import { StockRepository } from "./stock/StockRepository.js";
import { WarehouseRepository } from "./warehouse/WarehouseRepository.js";
import { InventoryItemRepository } from "./inventory-item/InventoryItemRepository.js";
import { InventoryWidgetRepository } from "./inventory-widget/InventoryWidgetRepository.js";

export interface RepositoryConfig {
  db: Database;
}

// Re-export Database type for scripts that need to access it
export type { Database };

export class Repository {
  public readonly product: ProductRepository;
  public readonly vendor: VendorRepository;
  public readonly variant: VariantRepository;
  public readonly category: CategoryRepository;
  public readonly tag: TagRepository;
  public readonly pricing: PricingRepository;
  public readonly option: OptionRepository;
  public readonly feature: FeatureRepository;
  public readonly translation: TranslationRepository;
  public readonly media: MediaRepository;
  public readonly bulkEditJob: BulkEditJobRepository;
  public readonly bulkEditItem: BulkEditItemRepository;
  public readonly bulkFence: BulkFenceRepository;
  public readonly searchIndex: SearchIndexRepository;
  public readonly variantSearchIndex: VariantSearchIndexRepository;
  public readonly facetGroup: FacetGroupRepository;
  public readonly facet: FacetRepository;
  public readonly facetValue: FacetValueRepository;
  public readonly facetSwatch: FacetSwatchRepository;
  public readonly collection: CollectionRepository;
  public readonly collectionItem: CollectionItemRepository;
  public readonly collectionRule: CollectionRuleRepository;
  public readonly inventoryItem: InventoryItemRepository;
  public readonly inventoryWidget: InventoryWidgetRepository;
  public readonly cost: CostRepository;
  public readonly physical: PhysicalRepository;
  public readonly stock: StockRepository;
  public readonly warehouse: WarehouseRepository;
  public readonly txManager: TransactionManager<Database>;

  /**
   * Get the current database connection (transaction-aware).
   * Use this for operations that need raw database access.
   */
  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    product: ProductRepository,
    vendor: VendorRepository,
    variant: VariantRepository,
    category: CategoryRepository,
    tag: TagRepository,
    pricing: PricingRepository,
    option: OptionRepository,
    feature: FeatureRepository,
    translation: TranslationRepository,
    media: MediaRepository,
    bulkEditJob: BulkEditJobRepository,
    bulkEditItem: BulkEditItemRepository,
    bulkFence: BulkFenceRepository,
    searchIndex: SearchIndexRepository,
    variantSearchIndex: VariantSearchIndexRepository,
    facetGroup: FacetGroupRepository,
    facet: FacetRepository,
    facetValue: FacetValueRepository,
    facetSwatch: FacetSwatchRepository,
    collection: CollectionRepository,
    collectionItem: CollectionItemRepository,
    collectionRule: CollectionRuleRepository,
    inventoryItem: InventoryItemRepository,
    inventoryWidget: InventoryWidgetRepository,
    cost: CostRepository,
    physical: PhysicalRepository,
    stock: StockRepository,
    warehouse: WarehouseRepository,
    txManager: TransactionManager<Database>
  ) {
    this.product = product;
    this.vendor = vendor;
    this.variant = variant;
    this.category = category;
    this.tag = tag;
    this.pricing = pricing;
    this.option = option;
    this.feature = feature;
    this.translation = translation;
    this.media = media;
    this.bulkEditJob = bulkEditJob;
    this.bulkEditItem = bulkEditItem;
    this.bulkFence = bulkFence;
    this.searchIndex = searchIndex;
    this.variantSearchIndex = variantSearchIndex;
    this.facetGroup = facetGroup;
    this.facet = facet;
    this.facetValue = facetValue;
    this.facetSwatch = facetSwatch;
    this.collection = collection;
    this.collectionItem = collectionItem;
    this.collectionRule = collectionRule;
    this.inventoryItem = inventoryItem;
    this.inventoryWidget = inventoryWidget;
    this.cost = cost;
    this.physical = physical;
    this.stock = stock;
    this.warehouse = warehouse;
    this.txManager = txManager;
  }

  /**
   * Create Repository with database instance
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;

    // Create transaction manager
    const txManager = new TransactionManager(db);

    // Create repositories
    const product = new ProductRepository(db, txManager);
    const vendor = new VendorRepository(db, txManager);
    const variant = new VariantRepository(db, txManager);
    const category = new CategoryRepository(db, txManager);
    const tag = new TagRepository(db, txManager);
    const pricing = new PricingRepository(db, txManager);
    const option = new OptionRepository(db, txManager);
    const feature = new FeatureRepository(db, txManager);
    const translation = new TranslationRepository(db, txManager);
    const media = new MediaRepository(db, txManager);
    const bulkEditJob = new BulkEditJobRepository(db, txManager);
    const bulkEditItem = new BulkEditItemRepository(db, txManager);
    const bulkFence = new BulkFenceRepository(db, txManager);
    const searchIndex = new SearchIndexRepository(db, txManager);
    const variantSearchIndex = new VariantSearchIndexRepository(db, txManager);
    const facetGroup = new FacetGroupRepository(db, txManager);
    const facet = new FacetRepository(db, txManager);
    const facetValue = new FacetValueRepository(db, txManager);
    const facetSwatch = new FacetSwatchRepository(db, txManager);
    const collection = new CollectionRepository(db, txManager);
    const collectionItem = new CollectionItemRepository(db, txManager);
    const collectionRule = new CollectionRuleRepository(db, txManager);
    const inventoryItem = new InventoryItemRepository(db, txManager);
    const inventoryWidget = new InventoryWidgetRepository(db, txManager);
    const cost = new CostRepository(db, txManager);
    const physical = new PhysicalRepository(db, txManager);
    const stock = new StockRepository(db, txManager);
    const warehouse = new WarehouseRepository(db, txManager);

    return new Repository(
      product,
      vendor,
      variant,
      category,
      tag,
      pricing,
      option,
      feature,
      translation,
      media,
      bulkEditJob,
      bulkEditItem,
      bulkFence,
      searchIndex,
      variantSearchIndex,
      facetGroup,
      facet,
      facetValue,
      facetSwatch,
      collection,
      collectionItem,
      collectionRule,
      inventoryItem,
      inventoryWidget,
      cost,
      physical,
      stock,
      warehouse,
      txManager
    );
  }
}
