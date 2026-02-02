import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { ProductRepository } from "./product/ProductRepository.js";
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

export interface RepositoryConfig {
  db: Database;
}

// Re-export Database type for scripts that need to access it
export type { Database };

/**
 * Repository aggregator для Catalog Service.
 * Не содержит inventory-related repositories (cost, physical, stock, warehouse).
 */
export class Repository {
  public readonly product: ProductRepository;
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
  public readonly txManager: TransactionManager<Database>;
  private readonly _db: Database;

  /**
   * Get the current database connection (transaction-aware).
   * Use this for operations that need raw database access.
   */
  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    product: ProductRepository,
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
    txManager: TransactionManager<Database>
  ) {
    this.product = product;
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

    return new Repository(
      product,
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
      txManager
    );
  }
}
