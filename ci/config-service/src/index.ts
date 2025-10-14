import { loadConfig } from "./server/config";
import { createLogger } from "./server/logger";
import {
  ConfigService,
  createExpressRouter,
  createSignatureMiddleware,
} from "@shopana/woodpecker-ci-config-service";
import express from "express";
import pinoHttp from "pino-http";
import "dotenv/config";

try {
  const config = loadConfig();
  const app = express();
  const logger = createLogger();

  app.use(pinoHttp({ logger }));
  app.use(
    createExpressRouter(new ConfigService({})).use(
      createSignatureMiddleware({
        publicKey: config.publicKey!,
      })
    )
  );

  const server = app
    .listen(config.port, config.host, () => {
      console.log(
        `Woodpecker convert extension listening on ${config.host}:${config.port}`
      );
      if (config.skipSignatureVerification) {
        console.warn("⚠️  WARNING: Signature verification is DISABLED!");
        console.warn(
          "   This is insecure and should only be used for development."
        );
        console.warn("   Set SKIP_SIGNATURE_VERIFICATION=false in production.");
      }
    })
    .on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`Failed to start server: ${err.message}`);
  console.error("Stack:", err.stack);
  process.exit(1);
}
