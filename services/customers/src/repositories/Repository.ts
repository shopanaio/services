import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { CustomerAddressRepository } from "./address/CustomerAddressRepository.js";
import { CustomerGroupRepository } from "./classification/CustomerGroupRepository.js";
import { CustomerSegmentRepository } from "./classification/CustomerSegmentRepository.js";
import { CustomerSegmentEvaluationRepository } from "./classification/CustomerSegmentEvaluationRepository.js";
import { CustomerSegmentMaterializationRepository } from "./classification/CustomerSegmentMaterializationRepository.js";
import { CustomerSegmentStoreContextRepository } from "./classification/CustomerSegmentStoreContextRepository.js";
import { CustomerTagRepository } from "./classification/CustomerTagRepository.js";
import { CustomerConsentRepository } from "./consent/CustomerConsentRepository.js";
import { CustomerComparisonRepository } from "./comparison/CustomerComparisonRepository.js";
import { CustomerCheckoutEligibilityRepository } from "./checkout/CustomerCheckoutEligibilityRepository.js";
import { CustomerRepository } from "./customer/CustomerRepository.js";
import { CustomerExternalReferenceRepository } from "./integration/CustomerExternalReferenceRepository.js";
import { CustomerLifecycleRepository } from "./lifecycle/CustomerLifecycleRepository.js";
import { CustomerMergeRepository } from "./merge/CustomerMergeRepository.js";
import { CustomerPrivacyRepository } from "./privacy/CustomerPrivacyRepository.js";
import { CustomerStatisticsRepository } from "./statistics/CustomerStatisticsRepository.js";
import { CustomerTaxExemptionRepository } from "./tax/CustomerTaxExemptionRepository.js";
import { CustomerTaxIdentifierRepository } from "./tax/CustomerTaxIdentifierRepository.js";
import { StorefrontAuthConfigurationRepository } from "./storefront-auth/StorefrontAuthConfigurationRepository.js";
import { CustomerWishlistRepository } from "./wishlist/CustomerWishlistRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

export class Repository {
  public readonly customer: CustomerRepository;
  public readonly address: CustomerAddressRepository;
  public readonly taxIdentifier: CustomerTaxIdentifierRepository;
  public readonly taxExemption: CustomerTaxExemptionRepository;
  public readonly consent: CustomerConsentRepository;
  public readonly group: CustomerGroupRepository;
  public readonly tag: CustomerTagRepository;
  public readonly segment: CustomerSegmentRepository;
  public readonly segmentEvaluation: CustomerSegmentEvaluationRepository;
  public readonly segmentMaterialization: CustomerSegmentMaterializationRepository;
  public readonly segmentStoreContext: CustomerSegmentStoreContextRepository;
  public readonly statistics: CustomerStatisticsRepository;
  public readonly lifecycle: CustomerLifecycleRepository;
  public readonly merge: CustomerMergeRepository;
  public readonly privacy: CustomerPrivacyRepository;
  public readonly externalReference: CustomerExternalReferenceRepository;
  public readonly storefrontAuth: StorefrontAuthConfigurationRepository;
  public readonly checkoutEligibility: CustomerCheckoutEligibilityRepository;
  public readonly wishlist: CustomerWishlistRepository;
  public readonly comparison: CustomerComparisonRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    customer: CustomerRepository,
    address: CustomerAddressRepository,
    taxIdentifier: CustomerTaxIdentifierRepository,
    taxExemption: CustomerTaxExemptionRepository,
    consent: CustomerConsentRepository,
    group: CustomerGroupRepository,
    tag: CustomerTagRepository,
    segment: CustomerSegmentRepository,
    segmentEvaluation: CustomerSegmentEvaluationRepository,
    segmentMaterialization: CustomerSegmentMaterializationRepository,
    segmentStoreContext: CustomerSegmentStoreContextRepository,
    statistics: CustomerStatisticsRepository,
    lifecycle: CustomerLifecycleRepository,
    merge: CustomerMergeRepository,
    privacy: CustomerPrivacyRepository,
    externalReference: CustomerExternalReferenceRepository,
    storefrontAuth: StorefrontAuthConfigurationRepository,
    checkoutEligibility: CustomerCheckoutEligibilityRepository,
    wishlist: CustomerWishlistRepository,
    comparison: CustomerComparisonRepository,
    txManager: TransactionManager<Database>,
  ) {
    this.customer = customer;
    this.address = address;
    this.taxIdentifier = taxIdentifier;
    this.taxExemption = taxExemption;
    this.consent = consent;
    this.group = group;
    this.tag = tag;
    this.segment = segment;
    this.segmentEvaluation = segmentEvaluation;
    this.segmentMaterialization = segmentMaterialization;
    this.segmentStoreContext = segmentStoreContext;
    this.statistics = statistics;
    this.lifecycle = lifecycle;
    this.merge = merge;
    this.privacy = privacy;
    this.externalReference = externalReference;
    this.storefrontAuth = storefrontAuth;
    this.checkoutEligibility = checkoutEligibility;
    this.wishlist = wishlist;
    this.comparison = comparison;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    return new Repository(
      new CustomerRepository(config.db, txManager),
      new CustomerAddressRepository(config.db, txManager),
      new CustomerTaxIdentifierRepository(config.db, txManager),
      new CustomerTaxExemptionRepository(config.db, txManager),
      new CustomerConsentRepository(config.db, txManager),
      new CustomerGroupRepository(config.db, txManager),
      new CustomerTagRepository(config.db, txManager),
      new CustomerSegmentRepository(config.db, txManager),
      new CustomerSegmentEvaluationRepository(config.db, txManager),
      new CustomerSegmentMaterializationRepository(config.db, txManager),
      new CustomerSegmentStoreContextRepository(config.db, txManager),
      new CustomerStatisticsRepository(config.db, txManager),
      new CustomerLifecycleRepository(config.db, txManager),
      new CustomerMergeRepository(config.db, txManager),
      new CustomerPrivacyRepository(config.db, txManager),
      new CustomerExternalReferenceRepository(config.db, txManager),
      new StorefrontAuthConfigurationRepository(config.db, txManager),
      new CustomerCheckoutEligibilityRepository(config.db, txManager),
      new CustomerWishlistRepository(config.db, txManager),
      new CustomerComparisonRepository(config.db, txManager),
      txManager,
    );
  }
}
