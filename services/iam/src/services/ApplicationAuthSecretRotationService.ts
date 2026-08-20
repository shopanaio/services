import type { ApplicationAuthConfigurationRecord } from "../repositories/models/application-auth.js";
import { ApplicationAuthConfigurationRepository } from "../repositories/ApplicationAuthConfigurationRepository.js";

export interface ApplicationAuthCacheInvalidator {
  invalidate(applicationId: string): void;
}

/** Controlled revoke-and-rebuild and root encryption-key rotation operations. */
export class ApplicationAuthSecretRotationService {
  constructor(
    private readonly configurations: ApplicationAuthConfigurationRepository,
    private readonly cache: ApplicationAuthCacheInvalidator,
  ) {}

  async rotateRealmSecret(input: {
    applicationId: string;
    expectedRevision: number;
    targetKeyVersion: number;
  }): Promise<ApplicationAuthConfigurationRecord> {
    const configuration = await this.configurations.rotateRealmSecret(
      input.applicationId,
      input.expectedRevision,
      input.targetKeyVersion,
    );
    this.cache.invalidate(input.applicationId);
    return configuration;
  }

  reencryptStoredSecrets(input: {
    sourceVersion: number;
    targetVersion: number;
    batchSize?: number;
  }): Promise<{ providers: number; signingKeys: number; remaining: number }> {
    return this.configurations.reencryptStoredSecrets(
      input.sourceVersion,
      input.targetVersion,
      input.batchSize,
    );
  }
}
