import { Service, ServiceSchema, Context } from "moleculer";
import {
  createCoreContextClient,
  defaultGraphqlRequester,
  type CoreContext,
  type FetchContextHeaders,
} from "@shopana/platform-api";
import { config } from "@src/config";
import { startHealthServer } from "@src/healthServer";
import type { Server } from "http";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  healthServer: Server;
};

const PlatformService: ServiceSchema<any> = {
  name: "platform",

  /**
   * Service actions
   * Platform service provides context and platform-related functionality
   */
  actions: {
    /**
     * Fetch context from platform API
     */
    async context(
      this: ServiceThis,
      ctx: Context<FetchContextHeaders>
    ): Promise<Required<CoreContext> | null> {
      this.logger.info("Fetching platform context", {
        headers: ctx.params,
      });

      try {
        const client = createCoreContextClient({
          config: {
            getCoreAppsGraphqlUrl: () => config.coreAppsGraphqlUrl!,
          },
          requester: defaultGraphqlRequester,
        });

        return await client.fetchContext(ctx.params);
      } catch (error) {
        this.logger.error("Failed to fetch platform context", error);
        throw error;
      }
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    this.logger.info("Platform service creating...");
    this.logger.info("Platform service created.");
  },

  async started() {
    this.logger.info("Platform service starting...");

    try {
      // Start health check server
      this.healthServer = await startHealthServer(config.port);

      this.logger.info("Platform service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Platform service stopping...");

    // Close health server
    if (this.healthServer) {
      try {
        this.logger.info("Closing health server...");
        await new Promise<void>((resolve, reject) => {
          this.healthServer.close((err?: Error) => (err ? reject(err) : resolve()));
        });
        this.logger.info("Health server closed successfully");
      } catch (error) {
        this.logger.error("Error closing health server:", error);
      }
    }

    this.logger.info("Platform service stopped successfully");
  },
};

export default PlatformService;
