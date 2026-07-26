import { TransactionManager } from "@shopana/shared-kernel";
import { createHeadlessDatabase } from "./database.js";
import type { HeadlessDatabase } from "./database.js";
import { HeadlessStorefrontConnectionRepository } from "./HeadlessStorefrontConnectionRepository.js";
import { StorefrontAccessPolicyRepository } from "./StorefrontAccessPolicyRepository.js";
import { StorefrontCredentialRepository } from "./StorefrontCredentialRepository.js";
import { StorefrontMutationIdempotencyRepository } from "./StorefrontMutationIdempotencyRepository.js";

export class HeadlessStorefrontRepository {
  readonly connection: HeadlessStorefrontConnectionRepository;
  readonly accessPolicy: StorefrontAccessPolicyRepository;
  readonly credential: StorefrontCredentialRepository;
  readonly idempotency: StorefrontMutationIdempotencyRepository;
  readonly txManager: TransactionManager<HeadlessDatabase>;

  private constructor(database: HeadlessDatabase) {
    this.txManager = new TransactionManager(database);
    this.connection = new HeadlessStorefrontConnectionRepository(
      database,
      this.txManager,
    );
    this.accessPolicy = new StorefrontAccessPolicyRepository(
      database,
      this.txManager,
    );
    this.credential = new StorefrontCredentialRepository(
      database,
      this.txManager,
    );
    this.idempotency = new StorefrontMutationIdempotencyRepository(
      database,
      this.txManager,
    );
  }

  static create(databaseClient: unknown): HeadlessStorefrontRepository {
    return new HeadlessStorefrontRepository(
      createHeadlessDatabase(databaseClient),
    );
  }

  runInTransaction<TResult>(
    callback: () => Promise<TResult>,
  ): Promise<TResult> {
    return this.txManager.run(callback);
  }
}
