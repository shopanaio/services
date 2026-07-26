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
  type ApplicationAuthEmailDeliveryRequest,
} from "./services/ApplicationAuthEmailDeliveryPort.js";
import {
  APPLICATION_AUTH_RATE_LIMIT_PORT,
  InMemoryApplicationAuthRateLimitAdapter,
  type ApplicationAuthRateLimitPort,
} from "./services/ApplicationAuthRateLimiter.js";
import {
  APPLICATION_AUTH_AUDIT_PORT,
  type ApplicationAuthAuditPort,
} from "./services/ApplicationAuthAuditService.js";
import {
  APPLICATION_AUTH_ADMIN_AUDIT_PORT,
  type ApplicationAuthAdminAuditPort,
} from "./services/ApplicationAuthAdminAuditPort.js";
import {
  APPLICATION_AUTH_PROVIDER_VALIDATION_PORT,
  e2eApplicationAuthProviderValidationPort,
  type ApplicationAuthProviderValidationPort,
} from "./services/ApplicationAuthProviderValidationPort.js";
import {
  APPLICATION_AUTH_LIVE_STATE_INVALIDATION_PORT,
  type ApplicationAuthLiveStateInvalidationPort,
} from "./events/application-auth/index.js";

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
    private readonly applicationAuthRateLimit?: ApplicationAuthRateLimitPort,
    @Optional()
    @Inject(APPLICATION_AUTH_AUDIT_PORT)
    private readonly applicationAuthAudit?: ApplicationAuthAuditPort,
    @Optional()
    @Inject(APPLICATION_AUTH_ADMIN_AUDIT_PORT)
    private readonly applicationAuthAdminAudit?: ApplicationAuthAdminAuditPort,
    @Optional()
    @Inject(APPLICATION_AUTH_PROVIDER_VALIDATION_PORT)
    private readonly applicationAuthProviderValidation?: ApplicationAuthProviderValidationPort,
    @Optional()
    @Inject(APPLICATION_AUTH_LIVE_STATE_INVALIDATION_PORT)
    private readonly applicationAuthLiveStateInvalidation?: ApplicationAuthLiveStateInvalidationPort
  ) {}

  async onModuleInit() {
    this.logger.debug("IAM onModuleInit started");

    const http = resolveIamHttpRuntimeConfiguration({ service, global });
    const applicationAuthRateLimit =
      this.applicationAuthRateLimit ??
      (global.environment === "development"
        ? new InMemoryApplicationAuthRateLimitAdapter()
        : undefined);
    const applicationAuthEmailDelivery =
      this.applicationAuthEmailDelivery ??
      (process.env.IAM_E2E_EMAIL_DELIVERY === "true"
        ? e2eApplicationAuthEmailDelivery
        : undefined);
    if (!this.applicationAuthRateLimit && applicationAuthRateLimit) {
      this.logger.warn(
        "Using single-process application auth rate limiting in development"
      );
    }
    if (http.deprecatedAdminGraphqlPortAliasUsed) {
      this.logger.warn(
        "IAM ports.admin_graphql is deprecated; use ports.iam_http for the shared listener"
      );
    }
    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient, {
      applicationAuthPublicBaseUrl: http.publicBaseUrl,
      applicationAuthEmailDelivery,
      applicationAuthRateLimit,
      applicationAuthAudit: this.applicationAuthAudit,
      applicationAuthAdminAudit: this.applicationAuthAdminAudit,
      applicationAuthProviderValidation:
        this.applicationAuthProviderValidation ??
        (process.env.IAM_E2E_PROVIDER_VALIDATION === "true"
          ? e2eApplicationAuthProviderValidationPort
          : undefined),
      applicationAuthLiveStateInvalidation:
        this.applicationAuthLiveStateInvalidation,
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

const e2eApplicationAuthEmailDelivery: ApplicationAuthEmailDeliveryPort = {
  async enqueue(request: ApplicationAuthEmailDeliveryRequest) {
    return {
      accepted: true,
      messageId: `e2e:${request.idempotencyKey}`,
    };
  },
};
