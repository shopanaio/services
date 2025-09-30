import { Service, ServiceSchema, Context } from "moleculer";
import { Knex } from "knex";
import { FastifyInstance } from "fastify";

import { Kernel } from "@src/kernel/Kernel";
import { dumboPool, knexInstance } from "@src/infrastructure/db/database";
import { SlotsRepository } from "@src/infrastructure/repositories/slotsRepository";
import { startServer } from "@src/api/server";
import { MoleculerLogger } from "@src/infrastructure/logger/logger";
import { AppsPluginManager } from "@src/infrastructure/plugins/pluginManager";
import { Domain } from "@shopana/plugin-sdk";

import {
  getInstalledAppsScript,
  GetInstalledAppsParams,
  GetInstalledAppsResult,
} from "@src/scripts/getInstalledAppsScript";
import {
  installAppScript,
  InstallAppParams,
  InstallAppResult,
} from "@src/scripts/installAppScript";
import {
  uninstallAppScript,
  UninstallAppParams,
  UninstallAppResult,
} from "@src/scripts/uninstallAppScript";
import {
  getAvailableAppsScript,
  GetAvailableAppsParams,
  GetAvailableAppsResult,
} from "@src/scripts/getAvailableAppsScript";
import {
  getSlotsScript,
  GetSlotsParams,
  GetSlotsResult,
} from "@src/scripts/getSlotsScript";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
  db: Knex;
  graphqlServer: FastifyInstance;
  pluginManager: AppsPluginManager;
};

// operation is passed directly and equals provider method name

const AppsService: ServiceSchema<any> = {
  name: "apps",

  /**
   * Service actions
   * Now uses simplified calls without external tracing - Moleculer handles this internally
   */
  actions: {
    execute: {
      params: {
        domain: { type: "string", enum: [Domain.SHIPPING, Domain.PAYMENT, Domain.PRICING] },
        operation: { type: "string", min: 1 },
        provider: { type: "string", optional: true },
        params: { type: "object", optional: true },
      },
      async handler(this: ServiceThis, ctx: Context<{ domain: Domain; operation: string; provider?: string; params?: any }>) {
        const { domain, operation, provider } = ctx.params;
        const params = ctx.params.params || {};
        const projectId = params.projectId as string | undefined;
        if (!projectId) {
          throw new Error("projectId is required in params");
        }

        const { slotsRepository } = this.kernel.getServices();
        const slots = await slotsRepository.findAllSlots(projectId, domain);
        const targetSlots = provider ? slots.filter((s: any) => s.provider === provider) : slots;

        const operationId = operation;
        const warnings: Array<{ code: string; message: string; details?: unknown }> = [];

        // Target a single provider if specified
        if (provider) {
          const s = targetSlots[0];
          if (!s) {
            throw new Error(`Provider ${provider} not installed for domain ${domain}`);
          }
          const data = await this.pluginManager.executeOnProvider({
            domain,
            operationId,
            pluginCode: s.provider,
            rawConfig: (s.data ?? {}) as any,
            projectId,
            input: params,
          });
          return { data, warnings };
        }

        // Execute on all providers for the domain
        const exec = await this.pluginManager.executeOnAll({
          domain,
          operationId,
          slots: targetSlots as any,
          projectId,
          input: params,
        });

        warnings.push(
          ...exec.warnings.map((w) => ({
            code: "PROVIDER_ERROR",
            message: w.message,
            details: { provider: w.provider, error: w.error },
          }))
        );

        const data = ([] as any[]).concat(...exec.results);
        return { data, warnings };
      },
    },
    install(
      this: ServiceThis,
      ctx: Context<InstallAppParams>
    ): Promise<InstallAppResult> {
      return this.kernel.executeScript(installAppScript, ctx.params);
    },

    uninstall(
      this: ServiceThis,
      ctx: Context<UninstallAppParams>
    ): Promise<UninstallAppResult> {
      return this.kernel.executeScript(uninstallAppScript, ctx.params);
    },

    getInstalled(
      this: ServiceThis,
      ctx: Context<GetInstalledAppsParams>
    ): Promise<GetInstalledAppsResult> {
      return this.kernel.executeScript(
        getInstalledAppsScript,
        ctx.params
      );
    },

    getAvailable(
      this: ServiceThis,
      ctx: Context<GetAvailableAppsParams>
    ): Promise<GetAvailableAppsResult> {
      return this.kernel.executeScript(
        getAvailableAppsScript,
        ctx.params
      );
    },

    getSlots: {
      params: {
        projectId: { type: "string", min: 1 },
        domain: { type: "string", optional: true }
      },
      handler(
        this: ServiceThis,
        ctx: Context<GetSlotsParams>
      ): Promise<GetSlotsResult> {
        return this.kernel.executeScript(getSlotsScript, ctx.params);
      }
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    this.logger.info("Apps service creating...");

    // First initialize the database connection
    this.db = knexInstance;

    // Then create the repository with the properly initialized knex instance
    const slotsRepository = new SlotsRepository(
      dumboPool.execute,
      this.db
    );

    this.kernel = new Kernel(
      slotsRepository,
      this.logger,
      this.broker
    );

    // Initialize single instance of AppsPluginManager and reuse it in executor
    this.pluginManager = new AppsPluginManager(new MoleculerLogger(this.logger));

    this.logger.info("Apps service created.");
  },

  async started() {
    this.logger.info("Apps service starting...");
    try {
      // Check database connection
      await this.db.raw("SELECT 1");
      this.logger.info(
        "Database connection has been established successfully."
      );

      // Start GraphQL server
      this.logger.info("Starting GraphQL server...");
      this.graphqlServer = await startServer(this.broker);
      this.logger.info("GraphQL server started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      this.broker.stop();
    }
  },

  async stopped() {
    this.logger.info("Apps service stopping...");

    // Close GraphQL server
    if (this.graphqlServer) {
      try {
        this.logger.info("Closing GraphQL server...");
        await this.graphqlServer.close();
        this.logger.info("GraphQL server closed successfully");
      } catch (error) {
        this.logger.error("Error closing GraphQL server:", error);
      }
    }

    // Close database connection
    await this.db.destroy();
    this.logger.info("Database connection has been closed.");
  },
};

export default AppsService;
