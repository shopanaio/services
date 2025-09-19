import { Service, ServiceSchema, Context } from "moleculer";
import {
  createCoreContextClient,
  defaultGraphqlRequester,
  type CoreContext,
  type FetchContextHeaders,
} from "@shopana/platform-api";
import { config } from "@src/config";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service;

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
    this.logger.info("Platform service started successfully");
  },

  async stopped() {
    this.logger.info("Platform service stopping...");
    this.logger.info("Platform service stopped successfully");
  },
};

export default PlatformService;
