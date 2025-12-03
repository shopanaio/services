import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import type { FastifyInstance } from "fastify";
import type {
  InventoryUpdateEntry,
  InventoryUpdateMeta,
  InventoryUpdateTask,
} from "@shopana/import-plugin-sdk";
import {
  assertInventoryUpdateTask,
  inventoryUpdateEntrySchema,
} from "@shopana/import-plugin-sdk";
import { config } from "./config.js";
import {
  InventoryObjectStorage,
  type DownloadedInventoryPayload,
} from "./storage.js";
import { createApolloServer } from "./api/graphql-admin/server.js";
import { gunzip as gunzipCallback } from "node:zlib";
import { promisify } from "node:util";
import {
  getOffers,
  GetOffersParams,
  GetOffersResult,
} from "./scripts/getOffers.js";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
  storageGateway: InventoryObjectStorage;
  graphqlServer: FastifyInstance | null;
};

const gunzip = promisify(gunzipCallback);
const inventoryUpdateEntryListSchema = inventoryUpdateEntrySchema
  .array()
  .min(1);

export async function processInventoryUpdate(
  deps: {
    logger: Service["logger"];
    storageGateway: {
      download(
        descriptor: InventoryUpdateTask["storage"]
      ): Promise<DownloadedInventoryPayload>;
    };
  },
  task: InventoryUpdateTask
): Promise<void> {
  const { storage, meta } = task;
  const payload = await deps.storageGateway.download(storage);
  const effectiveBuffer = await decompressPayload(
    payload.buffer,
    meta?.compression
  );
  const entries = parseInventoryUpdates(effectiveBuffer);

  deps.logger.info(
    {
      pluginCode: task.source.pluginCode,
      integrationId: task.source.integrationId,
      feedType: task.source.feedType,
      issuedAt: task.issuedAt,
      bucket: storage.bucket,
      objectKey: storage.objectKey,
      items: entries.length,
    },
    "Inventory update task received"
  );
}

async function decompressPayload(
  buffer: Buffer,
  compression: InventoryUpdateMeta["compression"] | undefined
): Promise<Buffer> {
  if (!compression || compression === "none") {
    return buffer;
  }

  if (compression === "gzip") {
    return gunzip(buffer);
  }

  throw new Error(
    `Unsupported inventory payload compression: ${compression}`
  );
}

function parseInventoryUpdates(buffer: Buffer): InventoryUpdateEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    throw new Error(
      `Failed to parse inventory payload JSON: ${
        error instanceof Error ? error.message : error
      }`
    );
  }

  return inventoryUpdateEntryListSchema.parse(parsed);
}

const InventoryService: ServiceSchema<any> = {
  name: "inventory",

  events: {
    async "inventory.update.request"(
      this: ServiceThis,
      payload: InventoryUpdateTask
    ) {
      assertInventoryUpdateTask(payload);
      await this.handleInventoryUpdate(payload);
    },
  },

  /**
   * Service actions
   * Exposes inventory operations through Moleculer actions
   */
  actions: {
    /**
     * Get inventory offers for specified items
     */
    async getOffers(
      this: ServiceThis,
      ctx: Context<GetOffersParams>
    ): Promise<GetOffersResult> {
      return this.kernel.executeScript(getOffers, ctx.params);
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    // Create kernel with Moleculer logger and broker only (apps.execute will be used)
    this.kernel = new Kernel(
      this.broker,
      new MoleculerLogger(this.logger)
    );
    this.storageGateway = new InventoryObjectStorage(config.storage);
    this.graphqlServer = null;
  },

  async started() {
    this.logger.info("Inventory service starting...");

    // Start GraphQL server
    const serverConfig = {
      port: config.port,
      grpcHost: config.platformGrpcHost,
    };

    this.graphqlServer = await createApolloServer(serverConfig);

    try {
      const address = await this.graphqlServer.listen({
        port: config.port,
        host: "0.0.0.0",
      });
      this.logger.info(`Inventory GraphQL Admin API running at ${address}/graphql/admin`);
    } catch (err) {
      this.logger.error("Failed to start GraphQL server:", err);
      throw err;
    }

    this.logger.info("Inventory service started successfully");
  },

  async stopped() {
    this.logger.info("Inventory service stopping...");

    if (this.graphqlServer) {
      try {
        await this.graphqlServer.close();
        this.logger.info("GraphQL server closed");
      } catch (error) {
        this.logger.error("Error closing GraphQL server:", error);
      }
    }

    this.logger.info("Inventory service stopped successfully");
  },

  /**
   * Helper methods
   */
  methods: {
    generateRequestId(): string {
      return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    /**
     * Handles inventory update tasks emitted by import plugins.
     */
    async handleInventoryUpdate(
      this: ServiceThis,
      task: InventoryUpdateTask
    ): Promise<void> {
      await processInventoryUpdate(
        {
          logger: this.logger,
          storageGateway: this.storageGateway,
        },
        task
      );
    },
  },
};

export default InventoryService;
