import { createCasdoorService, type CasdoorService } from "@shopana/shared-casdoor";
import { UserRepository } from "./user/UserRepository.js";
import { CustomerRepository } from "./customer/CustomerRepository.js";

export interface RepositoryConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  certificate?: string;
  organizationName: string;
  applicationName: string;
}

/**
 * Repository aggregator for users service
 * Uses Casdoor as the backend instead of a database
 */
export class Repository {
  public readonly user: UserRepository;
  public readonly customer: CustomerRepository;
  public readonly casdoor: CasdoorService;

  private readonly _organization: string;
  private readonly _application: string;

  constructor(config: RepositoryConfig) {
    this.casdoor = createCasdoorService({
      endpoint: config.endpoint,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      certificate: config.certificate,
      organizationName: config.organizationName,
      applicationName: config.applicationName,
    });

    this._organization = config.organizationName;
    this._application = config.applicationName;

    this.user = new UserRepository(this.casdoor, this._organization, this._application);
    this.customer = new CustomerRepository(this.casdoor, this._organization, this._application);
  }

  /**
   * Get organization name for casdoor operations
   */
  get organization(): string {
    return this._organization;
  }

  /**
   * Get application name for casdoor operations
   */
  get application(): string {
    return this._application;
  }
}
