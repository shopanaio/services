import {
  ApplicationAuthConfigurationRepository,
  type ProvisionApplicationInput,
  type ProvisionedApplication,
} from "../repositories/ApplicationAuthConfigurationRepository.js";

/** Trusted domain boundary for atomic application realm provisioning/backfill. */
export class ApplicationAuthProvisioningService {
  constructor(
    private readonly configurations: ApplicationAuthConfigurationRepository
  ) {}

  provision(input: ProvisionApplicationInput): Promise<ProvisionedApplication> {
    return this.configurations.provisionApplication(input);
  }

  backfill(): Promise<number> {
    return this.configurations.backfillMissingConfigurations();
  }
}

