import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import {
  getServiceConfig,
  buildDatabaseUrl,
} from "@shopana/shared-service-config";
import { SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { Repository } from "./repositories/Repository.js";
import { ProjectCreateWorkflow } from "./workflows/index.js";
import type { CurrencyCode, LocaleCode, ProjectStatus } from "./repositories/models/index.js";

const { service } = getServiceConfig("project");

interface CreateProjectParams {
  id: string;
  name: string;
  slug: string;
  locales: LocaleCode[];
  defaultCurrency: CurrencyCode;
  status?: ProjectStatus;
  timezone?: string;
  email?: string;
}

interface SaveIntegrationParams {
  projectId: string;
  type: 'iam' | 'payment' | 'shipping' | 'storage' | 'email' | 'analytics';
  provider: string;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

interface AddMemberParams {
  projectId: string;
  userId: string;
  role: string;
}

@Injectable()
export class ProjectNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectNestService.name);
  private graphqlServer: FastifyInstance | null = null;
  private repository: Repository | null = null;

  constructor(
    @Inject(SERVICE_BROKER) private readonly broker: ServiceBroker,
    @Optional() @Inject(WORKFLOW_REGISTRY) private readonly workflow?: WorkflowRegistry,
  ) {}

  async onModuleInit() {
    const databaseUrl = service.db ? buildDatabaseUrl(service.db) : "";

    // Initialize repository for broker actions
    if (databaseUrl) {
      this.repository = await Repository.create({ databaseUrl });
    }

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      repository: databaseUrl ? { databaseUrl } : undefined,
    });

    // Register broker actions for project operations (used by workflows)
    this.broker.register<CreateProjectParams, { id: string }>(
      'create',
      async (params) => {
        if (!this.repository) {
          throw new Error('Project repository not initialized');
        }

        const project = await this.repository.project.create({
          id: params.id,
          name: params.name,
          slug: params.slug,
          locales: params.locales,
          defaultCurrency: params.defaultCurrency,
          status: params.status,
          timezone: params.timezone,
          email: params.email,
        });

        this.logger.debug(`Created project: ${project.id}`);
        return { id: project.id };
      }
    );

    this.broker.register<SaveIntegrationParams, { id: string }>(
      'saveIntegration',
      async (params) => {
        if (!this.repository) {
          throw new Error('Project repository not initialized');
        }

        const integration = await this.repository.integration.upsert({
          projectId: params.projectId,
          type: params.type,
          provider: params.provider,
          config: params.config,
          credentials: params.credentials,
        });

        this.logger.debug(`Saved ${params.type} integration for project ${params.projectId}`);
        return { id: integration.id };
      }
    );

    this.broker.register<AddMemberParams, { success: boolean }>(
      'addMember',
      async (params) => {
        if (!this.repository) {
          throw new Error('Project repository not initialized');
        }

        // TODO: Implement project member management
        this.logger.debug(`Added member ${params.userId} to project ${params.projectId} as ${params.role}`);
        return { success: true };
      }
    );

    // Register workflows (if WorkflowModule is available)
    if (this.workflow) {
      this.workflow.register('projectCreate', new ProjectCreateWorkflow({
        broker: this.broker,
        logger: this.logger,
      }));
      this.logger.debug('Registered workflow: projectCreate');
    }

    this.logger.log("Project service started");
  }

  async onModuleDestroy() {
    // Deregister workflows
    if (this.workflow) {
      this.workflow.deregister('projectCreate');
    }

    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.repository) {
      await this.repository.close();
    }

    this.logger.log("Project service stopped");
  }
}
