import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { AppsGraphQLIngress } from "@shopana/app-runtime";
import {
  InjectBroker,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { AppInstallationStore } from "./control-plane/AppInstallationStore.js";
import { AppLifecycleService } from "./control-plane/AppLifecycleService.js";
import { Repository } from "./repositories/Repository.js";
import { AppRuntimeRegistry } from "./runtime/AppRuntimeRegistry.js";

interface AppsServiceConfig {
  readonly ports?: {
    readonly admin_graphql?: number;
    readonly app_admin_graphql?: number;
    readonly app_storefront_graphql?: number;
  };
}

@Injectable()
export class AppsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppsNestService.name);
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("apps") private readonly broker: ServiceBroker,
    @Inject(Repository)
    private readonly repository: Repository,
    @Inject(AppInstallationStore)
    private readonly installations: AppInstallationStore,
    @Inject(AppLifecycleService)
    private readonly lifecycle: AppLifecycleService,
    @Inject(AppRuntimeRegistry)
    private readonly runtimes: AppRuntimeRegistry,
    @Inject(AppsGraphQLIngress)
    private readonly graphqlIngress: AppsGraphQLIngress,
  ) {}

  async onModuleInit() {
    await this.repository.db.execute(sql`SELECT 1`);
    const service = getServiceConfig("apps").service as AppsServiceConfig;
    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      broker: this.broker,
      repository: this.repository,
      installations: this.installations,
      lifecycle: this.lifecycle,
      runtimes: this.runtimes,
    });
    await this.graphqlIngress.start({
      admin: service.ports?.app_admin_graphql,
      storefront: service.ports?.app_storefront_graphql,
    });
    this.logger.log("Apps service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
      this.graphqlServer = null;
    }
    await this.graphqlIngress.stop();
  }
}
