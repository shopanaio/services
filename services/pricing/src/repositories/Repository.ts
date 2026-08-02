import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { DiscountRepository } from "./DiscountRepository.js";
import { PricingCheckoutQuoteRepository } from "../checkout-pipeline/infrastructure/PricingCheckoutQuoteRepository.js";
import { DiscountEvaluationRepository } from "../checkout-pipeline/infrastructure/DiscountEvaluationRepository.js";
import { PricingFunctionBindingRepository } from "../checkout-pipeline/infrastructure/PricingFunctionBindingRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

/** Aggregate for pricing repositories. Add domain repositories as readonly fields. */
export class Repository {
  public readonly discount: DiscountRepository;
  public readonly txManager: TransactionManager<Database>;
  public readonly checkoutQuote: PricingCheckoutQuoteRepository;
  public readonly discountEvaluation: DiscountEvaluationRepository;
  public readonly functionBinding: PricingFunctionBindingRepository;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    discount: DiscountRepository,
    txManager: TransactionManager<Database>,
    checkoutQuote: PricingCheckoutQuoteRepository,
    discountEvaluation: DiscountEvaluationRepository,
    functionBinding: PricingFunctionBindingRepository,
  ) {
    this.discount = discount;
    this.txManager = txManager;
    this.checkoutQuote = checkoutQuote;
    this.discountEvaluation = discountEvaluation;
    this.functionBinding = functionBinding;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    const discount = new DiscountRepository(config.db, txManager);
    const checkoutQuote = new PricingCheckoutQuoteRepository(config.db);
    const discountEvaluation = new DiscountEvaluationRepository(config.db);
    const functionBinding = new PricingFunctionBindingRepository(config.db);
    return new Repository(discount, txManager, checkoutQuote, discountEvaluation, functionBinding);
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}
