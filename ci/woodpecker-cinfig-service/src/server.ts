import express, { Router } from "express";
import { AppConfig } from "./core/config";
import { loadScripts } from "./core/loader";
import { createLogger } from "./core/logger";
import { createExpressRouter } from "@shopana/ci-woodpecker-config-service";

/**
 * Compose and create an Express server.
 */
/**
 * Compose and create an Express server with OOP controller.
 */
export async function createServer(config: AppConfig) {
  const logger = createLogger();
  const app = express();
  const scripts = await loadScripts();

  app.use(
    "/",
    createExpressRouter(
      {
        githubToken: config.githubToken,
        secret: config.convertSecret,
        publicKeyHex: config.publicKey,
        skipSignatureVerification: config.skipSignatureVerification,
        logger,
      },
      scripts
    ) as unknown as Router
  );

  return app;
}
