import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "./api/graphql-admin/server.js";

const { service } = getServiceConfig("iam");

/**
 * Black box interface for provisioning an IAM tenant.
 * Callers don't need to know about the underlying identity provider.
 */
interface ProvisionTenantParams {
  projectId: string;
  slug: string;
  displayName: string;
  redirectUri?: string;
}

interface ProvisionTenantResult {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

@Injectable()
export class IamNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.kernel = await Kernel.create(this.broker);

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });

    /**
     * Provision IAM tenant (black box action)
     *
     * Internally creates:
     * - Casdoor organization for the project
     * - Casdoor application with OAuth2 credentials
     *
     * Callers only see: tenantId, clientId, clientSecret
     */
    this.broker.register<ProvisionTenantParams, ProvisionTenantResult>(
      'provisionTenant',
      async (params) => {
        const repository = this.kernel.repository;

        const orgName = params.slug;
        const appName = `${params.slug}-app`;
        const clientId = crypto.randomUUID();
        const clientSecret = crypto.randomUUID();

        // Step 1: Create Casdoor organization
        const organization = {
          owner: 'admin',
          name: orgName,
          displayName: params.displayName,
          websiteUrl: `https://${params.slug}.shopana.io`,
          favicon: '',
          enableSoftDeletion: true,
        };

        const orgResult = await repository.client.sdk.addOrganization(organization);
        if (orgResult.data !== 'Affected') {
          throw new Error(`Failed to create IAM organization: ${orgResult.data}`);
        }
        this.logger.debug(`Created IAM organization: ${orgName}`);

        // Step 2: Create Casdoor application
        const application = {
          owner: 'admin',
          name: appName,
          displayName: `${params.displayName} App`,
          organization: orgName,
          clientId,
          clientSecret,
          enablePassword: true,
          enableSignUp: true,
          redirectUris: params.redirectUri ? [params.redirectUri] : [],
          providers: [],
          signupItems: [
            { name: 'ID', visible: false, required: true, rule: 'Random' },
            { name: 'Username', visible: true, required: true, rule: 'None' },
            { name: 'Display name', visible: true, required: true, rule: 'None' },
            { name: 'Password', visible: true, required: true, rule: 'None' },
            { name: 'Confirm password', visible: true, required: true, rule: 'None' },
            { name: 'Email', visible: true, required: true, rule: 'None' },
          ],
        };

        const appResult = await repository.client.sdk.addApplication(application);
        if (appResult.data !== 'Affected') {
          // Rollback: delete the organization we just created
          try {
            await repository.client.sdk.deleteOrganization({ owner: 'admin', name: orgName });
          } catch (e) {
            this.logger.warn(`Failed to rollback organization ${orgName}: ${e}`);
          }
          throw new Error(`Failed to create IAM application: ${appResult.data}`);
        }
        this.logger.debug(`Created IAM application: ${appName}`);

        // Return black box result - no Casdoor-specific details exposed
        return {
          tenantId: orgName,  // tenantId is the org name (opaque to caller)
          clientId,
          clientSecret,
        };
      }
    );

    this.logger.log("IAM service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("IAM service stopped");
  }
}
