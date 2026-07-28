import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { AppRepository } from "./app/AppRepository.js";
import { AppCapabilityRepository } from "./capability/AppCapabilityRepository.js";
import { AppInstallationRepository } from "./installation/AppInstallationRepository.js";
import { AppLifecycleOperationRepository } from "./lifecycle/AppLifecycleOperationRepository.js";
import { AppManifestSnapshotRepository } from "./manifest/AppManifestSnapshotRepository.js";
import { AppInstallationScopeRepository } from "./scope/AppInstallationScopeRepository.js";
import { AppInstallationSecretRepository } from "./secret/AppInstallationSecretRepository.js";

export interface RepositoryConfig {
  readonly db: Database;
}

export type { Database };

export class Repository {
  public readonly app: AppRepository;
  public readonly installation: AppInstallationRepository;
  public readonly lifecycleOperation: AppLifecycleOperationRepository;
  public readonly manifestSnapshot: AppManifestSnapshotRepository;
  public readonly scope: AppInstallationScopeRepository;
  public readonly secret: AppInstallationSecretRepository;
  public readonly capability: AppCapabilityRepository;
  public readonly txManager: TransactionManager<Database>;

  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    app: AppRepository,
    installation: AppInstallationRepository,
    lifecycleOperation: AppLifecycleOperationRepository,
    manifestSnapshot: AppManifestSnapshotRepository,
    scope: AppInstallationScopeRepository,
    secret: AppInstallationSecretRepository,
    capability: AppCapabilityRepository,
    txManager: TransactionManager<Database>,
  ) {
    this.app = app;
    this.installation = installation;
    this.lifecycleOperation = lifecycleOperation;
    this.manifestSnapshot = manifestSnapshot;
    this.scope = scope;
    this.secret = secret;
    this.capability = capability;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    const app = new AppRepository(config.db, txManager);
    const installation = new AppInstallationRepository(
      config.db,
      txManager,
    );
    const lifecycleOperation = new AppLifecycleOperationRepository(
      config.db,
      txManager,
    );
    const manifestSnapshot = new AppManifestSnapshotRepository(
      config.db,
      txManager,
    );
    const scope = new AppInstallationScopeRepository(
      config.db,
      txManager,
    );
    const secret = new AppInstallationSecretRepository(
      config.db,
      txManager,
    );
    const capability = new AppCapabilityRepository(
      config.db,
      txManager,
    );
    return new Repository(
      app,
      installation,
      lifecycleOperation,
      manifestSnapshot,
      scope,
      secret,
      capability,
      txManager,
    );
  }
}
