import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  SERVICE_BROKER,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { Repository } from "./repositories/Repository.js";

const { service } = getServiceConfig("iam");

interface CreateOrganizationParams {
  name: string;
  displayName: string;
  owner?: string;
  websiteUrl?: string;
  enableSoftDeletion?: boolean;
}

interface CreateApplicationParams {
  name: string;
  displayName: string;
  organization: string;
  enablePassword?: boolean;
  enableSignUp?: boolean;
  redirectUris?: string[];
}

@Injectable()
export class IamNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamNestService.name);
  private graphqlServer: FastifyInstance | null = null;
  private repository: Repository | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    const casdoor = service.casdoor;
    console.log("[IAM] casdoor config:", casdoor ? "present" : "missing");

    if (casdoor) {
      this.repository = await Repository.create({
        endpoint: casdoor.endpoint,
        clientId: casdoor.client_id,
        clientSecret: casdoor.client_secret,
        certificate: casdoor.certificate,
        organizationName: casdoor.organization_name,
        applicationName: casdoor.application_name,
      });
    }

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      repository: casdoor
        ? {
            endpoint: casdoor.endpoint,
            clientId: casdoor.client_id,
            clientSecret: casdoor.client_secret,
            certificate: casdoor.certificate,
            organizationName: casdoor.organization_name,
            applicationName: casdoor.application_name,
          }
        : undefined,
    });

    // Register broker actions for Casdoor organization and application management
    this.broker.register<CreateOrganizationParams, { name: string }>(
      'createOrganization',
      async (params) => {
        if (!this.repository) {
          throw new Error('IAM repository not initialized');
        }

        const organization = {
          owner: params.owner ?? 'admin',
          name: params.name,
          displayName: params.displayName,
          websiteUrl: params.websiteUrl ?? '',
          favicon: '',
          enableSoftDeletion: params.enableSoftDeletion ?? true,
        };

        const result = await this.repository.client.sdk.addOrganization(organization);
        if (result.data !== 'Affected') {
          throw new Error(`Failed to create organization: ${result.data}`);
        }

        this.logger.debug(`Created Casdoor organization: ${params.name}`);
        return { name: params.name };
      }
    );

    this.broker.register<CreateApplicationParams, { name: string; clientId: string }>(
      'createApplication',
      async (params) => {
        if (!this.repository) {
          throw new Error('IAM repository not initialized');
        }

        const clientId = crypto.randomUUID();
        const clientSecret = crypto.randomUUID();

        const application = {
          owner: 'admin',
          name: params.name,
          displayName: params.displayName,
          organization: params.organization,
          clientId,
          clientSecret,
          enablePassword: params.enablePassword ?? true,
          enableSignUp: params.enableSignUp ?? true,
          redirectUris: params.redirectUris ?? [],
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

        const result = await this.repository.client.sdk.addApplication(application);
        if (result.data !== 'Affected') {
          throw new Error(`Failed to create application: ${result.data}`);
        }

        this.logger.debug(`Created Casdoor application: ${params.name}`);
        return { name: params.name, clientId };
      }
    );

    this.logger.log("IAM service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    this.logger.log("IAM service stopped");
  }
}
