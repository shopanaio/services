/**
 * Entry point for Apps Service
 *
 * Supports two operational modes:
 *
 * 1. STANDALONE mode (default):
 *    - Runs only apps service
 *    - Communicates with other services via NATS
 *    - Suitable for production with separate containers
 *
 * 2. ORCHESTRATOR mode:
 *    - Runs multiple services in one process
 *    - In-memory communication (no NATS)
 *    - Suitable for development and resource-constrained environments
 *
 * Mode is controlled by SERVICES_MODE environment variable or config.yml.
 * Service selection is controlled by orchestrator.services in config.yml.
 * All services load their configuration from config.yml via @shopana/shared-service-config.
 */
import { loadOrchestratorConfig } from "@shopana/shared-service-config";

const mode = process.env.SERVICES_MODE || loadOrchestratorConfig().mode;

console.log(`🎯 Starting in ${mode.toUpperCase()} mode`);

if (mode === "orchestrator") {
  import("./orchestrator");
} else {
  import("./moleculer");
}
