import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import type { FastifyInstance } from "fastify";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";
import { getServiceConfig } from "@shopana/shared-service-config";
import { startIamHttpServer } from "./api/http/server.js";
import { resolveIamHttpRuntimeConfiguration } from "./api/http/iamHttpConfiguration.js";
import {
  APPLICATION_AUTH_EMAIL_DELIVERY_PORT,
  type ApplicationAuthEmailDeliveryPort,
} from "./services/ApplicationAuthEmailDeliveryPort.js";
import {
  APPLICATION_AUTH_RATE_LIMIT_PORT,
  type ApplicationAuthRateLimitPort,
} from "./services/ApplicationAuthRateLimiter.js";

const { service, global } = getServiceConfig("iam");

@Injectable()
export class IamNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamNestService.name);
  private kernel!: Kernel;
  private httpServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("iam") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient,
    @Optional()
    @Inject(APPLICATION_AUTH_EMAIL_DELIVERY_PORT)
    private readonly applicationAuthEmailDelivery?: ApplicationAuthEmailDeliveryPort,
    @Optional()
    @Inject(APPLICATION_AUTH_RATE_LIMIT_PORT)
    private readonly applicationAuthRateLimit?: ApplicationAuthRateLimitPort
  ) {}

  async onModuleInit() {
    this.logger.debug("IAM onModuleInit started");

    const http = resolveIamHttpRuntimeConfiguration({ service, global });
    if (http.deprecatedAdminGraphqlPortAliasUsed) {
      this.logger.warn(
        "IAM ports.admin_graphql is deprecated; use ports.iam_http for the shared listener"
      );
    }
    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient, {
      applicationAuthPublicBaseUrl: http.publicBaseUrl,
      applicationAuthEmailDelivery: this.applicationAuthEmailDelivery,
      applicationAuthRateLimit: this.applicationAuthRateLimit,
    });
    this.logger.debug("Kernel created");

    this.httpServer = await startIamHttpServer({
      kernel: this.kernel,
      global,
      http,
    });
    this.logger.debug("IAM HTTP server started");
  }

  async onModuleDestroy() {
    if (this.httpServer) {
      await this.httpServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("IAM service stopped");
  }
}
