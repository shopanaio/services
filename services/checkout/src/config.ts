import dotenv from "dotenv";
import { loadServiceConfig } from "@shopana/shared-service-config";

// Load environment variables from .env file
dotenv.config();

/**
 * Service configuration using centralized config system
 */
const serviceConfig = loadServiceConfig("checkout");

export const config = {
  port: serviceConfig.port,
  databaseUrl: serviceConfig.databaseUrl || process.env.DATABASE_URL!,
  platformGrpcHost: process.env.PLATFORM_GRPC_HOST || "localhost:50051",
};
