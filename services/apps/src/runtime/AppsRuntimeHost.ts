import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import {
  AppManifestSchema,
  type AppDeploymentConfig,
  type AppInstallationContextProvider,
  type ShopanaAppDefinition,
} from "@shopana/app-sdk";
import {
  AppSubgraphHost,
  type HostedAppDefinition,
} from "@shopana/app-runtime";
import {
  DATABASE_CLIENT,
  InjectBroker,
  type DatabaseClient,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import { AppBrokerFacadeFactory } from "./AppBrokerFacadeFactory.js";
import { AppContextRunner } from "./AppContextRunner.js";
import { AppRuntimeRegistry } from "./AppRuntimeRegistry.js";
import { bundledApps } from "./bundled-apps.js";
import { APP_INSTALLATION_CONTEXT_PROVIDER } from "./AppInstallationContextProvider.js";
import { getExternallyRoutableActions } from "./AppManifestContracts.js";
import { AppSecretResolverFactory } from "./AppSecretResolverFactory.js";

interface AppsServiceConfig {
  readonly applications?: Record<string, Partial<AppDeploymentConfig>>;
}

@Injectable()
export class AppsRuntimeHost
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AppsRuntimeHost.name);
  private readonly contextRunners = new Map<string, AppContextRunner>();
  private started = false;

  constructor(
    @InjectBroker("apps") private readonly broker: ServiceBroker,
    @Inject(DATABASE_CLIENT)
    private readonly databaseClient: DatabaseClient,
    private readonly brokerFactory: AppBrokerFacadeFactory,
    private readonly registry: AppRuntimeRegistry,
    private readonly secretResolverFactory: AppSecretResolverFactory,
    private readonly subgraphHost: AppSubgraphHost,
    @Inject(APP_INSTALLATION_CONTEXT_PROVIDER)
    private readonly installations: AppInstallationContextProvider,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.stop();
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.validateDefinitions(bundledApps.map(({ definition }) => definition));

    try {
      for (const hosted of bundledApps) {
        const { definition } = hosted;
        const config = this.resolveConfig(definition);
        if (!config.enabled) {
          this.logger.log(`Skipping disabled App "${definition.manifest.code}"`);
          continue;
        }

        try {
          await this.startDefinition(hosted, config);
        } catch (error) {
          await this.failDefinition(definition, error);
          if (config.required) {
            throw error;
          }
          this.logger.error(
            `Optional App "${definition.manifest.code}" failed to start`,
            error,
          );
        }
      }
      this.started = true;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async stop(): Promise<void> {
    const runtimes = [...this.registry.list()].reverse();
    const errors: Error[] = [];
    for (const runtime of runtimes) {
      const appCode = runtime.definition.manifest.code;
      try {
        if (runtime.status === "READY" || runtime.status === "STARTING") {
          await this.subgraphHost.stop(appCode);
          await runtime.app.stop();
        }
      } catch (error) {
        const stopError =
          error instanceof Error ? error : new Error(String(error));
        errors.push(stopError);
        this.logger.error(`Failed to stop App "${appCode}"`, stopError);
      } finally {
        try {
          await this.brokerFactory.release(appCode, this.broker);
        } catch (error) {
          const releaseError =
            error instanceof Error ? error : new Error(String(error));
          errors.push(releaseError);
          this.logger.error(
            `Failed to release App "${appCode}" contracts`,
            releaseError,
          );
        }
        runtime.status = "STOPPED";
        this.registry.remove(appCode);
        this.contextRunners.delete(appCode);
      }
    }
    this.started = false;
    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more Apps failed to stop");
    }
  }

  private async startDefinition(
    hosted: HostedAppDefinition,
    config: AppDeploymentConfig,
  ): Promise<void> {
    const { definition } = hosted;
    const appCode = definition.manifest.code;
    const contextRunner = new AppContextRunner();
    const appBroker = this.brokerFactory.create({
      appCode,
      appVersion: definition.manifest.version,
      manifest: definition.manifest,
      broker: this.broker,
      contextRunner,
      installations: this.installations,
    });
    this.contextRunners.set(appCode, contextRunner);

    const hostContext = {
      broker: appBroker,
      config,
      databaseClient: this.databaseClient,
      logger: new Logger(`App:${appCode}`),
      installations: this.installations,
      executionContext: contextRunner,
      secrets: this.secretResolverFactory.create(appCode, contextRunner),
    } satisfies Parameters<ShopanaAppDefinition["create"]>[0];
    const app = definition.create(hostContext);
    const runtime = this.registry.register({
      definition,
      app,
      broker: appBroker,
      config,
    });

    runtime.status = "STARTING";
    await app.register();
    this.validateRegisteredContracts(definition);
    await app.start();
    await this.subgraphHost.start(hosted, hostContext);
    runtime.status = "READY";
    this.logger.log(`App "${appCode}" is ready`);
  }

  private async failDefinition(
    definition: ShopanaAppDefinition,
    error: unknown,
  ): Promise<void> {
    const appCode = definition.manifest.code;
    const runtime = this.registry.get(appCode);
    if (runtime) {
      try {
        await this.subgraphHost.stop(appCode);
        await runtime.app.stop();
      } catch (stopError) {
        this.logger.error(`Failed to stop App "${appCode}"`, stopError);
      }
      runtime.status = "FAILED";
      runtime.error =
        error instanceof Error ? error : new Error(String(error));
    }
    await this.brokerFactory.release(appCode, this.broker);
    this.contextRunners.delete(appCode);
  }

  private resolveConfig(
    definition: ShopanaAppDefinition,
  ): AppDeploymentConfig {
    const service = getServiceConfig("apps").service as AppsServiceConfig;
    const rawConfig = service.applications?.[definition.manifest.code];
    if (!rawConfig) {
      throw new Error(
        `Missing config services.apps.applications.${definition.manifest.code}`,
      );
    }
    return Object.freeze({
      ...rawConfig,
      enabled: rawConfig.enabled ?? true,
      required: rawConfig.required ?? true,
    });
  }

  private validateDefinitions(
    definitions: readonly ShopanaAppDefinition[],
  ): void {
    const codes = new Set<string>();
    for (const definition of definitions) {
      AppManifestSchema.parse(definition.manifest);
      const appCode = definition.manifest.code;
      if (codes.has(appCode)) {
        throw new Error(`Duplicate bundled App code "${appCode}"`);
      }
      codes.add(appCode);
    }
  }

  private validateRegisteredContracts(
    definition: ShopanaAppDefinition,
  ): void {
    const appCode = definition.manifest.code;
    const lifecycle = definition.manifest.lifecycle;
    const actionNames = [...getExternallyRoutableActions(definition.manifest)];
    const workflowNames = [
      lifecycle.installWorkflow,
      lifecycle.updateWorkflow,
      lifecycle.uninstallWorkflow,
    ].filter((name): name is string => Boolean(name));

    for (const action of actionNames) {
      if (!this.broker.hasAction(`apps.${appCode}.${action}`)) {
        throw new Error(
          `App "${appCode}" did not register manifest action "${action}"`,
        );
      }
    }
    for (const workflow of workflowNames) {
      if (!this.broker.hasWorkflow(`apps.${appCode}.${workflow}`)) {
        throw new Error(
          `App "${appCode}" did not register manifest workflow "${workflow}"`,
        );
      }
    }
  }

  private async rollback(): Promise<void> {
    const appCodes = this.registry
      .list()
      .map((item) => item.definition.manifest.code)
      .reverse();
    for (const appCode of appCodes) {
      const runtime = this.registry.get(appCode);
      if (
        runtime &&
        (runtime.status === "READY" || runtime.status === "STARTING")
      ) {
        try {
          await this.subgraphHost.stop(appCode);
          await runtime.app.stop();
        } catch (error) {
          this.logger.error(`Failed to stop App "${appCode}"`, error);
        }
      }
      await this.brokerFactory.release(appCode, this.broker);
      this.registry.remove(appCode);
      this.contextRunners.delete(appCode);
    }
  }
}
