import dotenv from "dotenv";
import { loadServiceConfig } from "@shopana/shared-service-config";

// Load environment variables from .env file
dotenv.config();

/**
 * Service configuration using centralized config system
 */
const serviceConfig = loadServiceConfig("apps");

export const config = {
  port: serviceConfig.port,
  databaseUrl: serviceConfig.databaseUrl || "",
  nodeEnv: serviceConfig.environment,
  graphqlPath: "/graphql",
  logLevel: "info",
};
