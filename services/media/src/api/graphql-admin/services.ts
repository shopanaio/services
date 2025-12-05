import { Repository } from "../../repositories/index.js";
import { config } from "../../config.js";
import type { MediaKernelServices } from "../../kernel/types.js";

/**
 * Logger implementation for resolvers
 */
const logger = {
  debug: (...args: unknown[]) => console.debug("[media]", ...args),
  info: (...args: unknown[]) => console.info("[media]", ...args),
  warn: (...args: unknown[]) => console.warn("[media]", ...args),
  error: (...args: unknown[]) => console.error("[media]", ...args),
};

/**
 * Stub broker for GraphQL resolvers.
 * The broker is not needed for GraphQL operations as they don't use inter-service calls.
 * If needed, inject the real broker from the NestJS module.
 */
const stubBroker = {
  call: async () => {
    throw new Error("Broker not available in GraphQL context");
  },
  emit: async () => {
    throw new Error("Broker not available in GraphQL context");
  },
  broadcast: async () => {
    throw new Error("Broker not available in GraphQL context");
  },
};

let servicesInstance: MediaKernelServices | null = null;

/**
 * Initialize services singleton.
 * Should be called once at startup.
 */
export function initServices(): MediaKernelServices {
  if (servicesInstance) {
    return servicesInstance;
  }

  const repository = new Repository(config.databaseUrl);

  servicesInstance = {
    broker: stubBroker,
    logger,
    repository,
  };

  return servicesInstance;
}

/**
 * Get services singleton.
 * Automatically initializes if not already done.
 */
export function getServices(): MediaKernelServices {
  if (!servicesInstance) {
    return initServices();
  }
  return servicesInstance;
}
