import { Service, ServiceSchema } from "moleculer";
import { config } from "./config.js";
import { createApolloServer } from "./api/graphql-admin/server.js";
import type { FastifyInstance } from "fastify";

// Define extended `this` type for Moleculer service context.
type ServiceThis = Service & {
  fastify: FastifyInstance | null;
};

const MediaService: ServiceSchema<any> = {
  name: "media",

  /**
   * Service settings
   */
  settings: {
    port: config.port,
    graphqlPath: config.graphqlPath,
  },

  /**
   * Service actions
   */
  actions: {
    // Actions can be added here as needed
  },

  /**
   * Lifecycle methods
   */
  created() {
    this.fastify = null;
  },

  async started() {
    this.logger.info("Media service starting...");

    // Start Apollo/Fastify server
    const serverConfig = {
      port: config.port,
      grpcHost: config.platformGrpcHost,
    };

    this.fastify = await createApolloServer(serverConfig);

    try {
      const address = await this.fastify.listen({
        port: config.port,
        host: "0.0.0.0",
      });
      this.logger.info(`Media GraphQL Admin API running at ${address}${config.graphqlPath}`);
    } catch (err) {
      this.logger.error("Failed to start Fastify server:", err);
      throw err;
    }

    this.logger.info("Media service started successfully");
  },

  async stopped() {
    this.logger.info("Media service stopping...");

    if (this.fastify) {
      await this.fastify.close();
      this.logger.info("Fastify server closed");
    }

    this.logger.info("Media service stopped successfully");
  },

  /**
   * Helper methods
   */
  methods: {
    generateRequestId(): string {
      return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
  },
};

export default MediaService;
