import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import pinoHttp from "pino-http";
import {
  ConfigService,
  createExpressRouter,
  createSignatureMiddleware,
} from "@shopana/woodpecker-ci-config-service";

import { loadConfig } from "./server/config";
import { createLogger } from "./server/logger";

try {
  const config = loadConfig();
  const app = express();
  const logger = createLogger();

  app
    .use(pinoHttp({ logger }))
    .use(
      createSignatureMiddleware({
        publicKey: fs.readFileSync(
          path.join(process.cwd(), config.pemFile!),
          "ascii"
        ),
      })
    )
    .use(createExpressRouter(new ConfigService()))
    .listen(config.port, "0.0.0.0", () => {
      console.log(
        `Woodpecker convert extension listening on 0.0.0.0:${config.port}`
      );
    })
    .on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`Failed to start server: ${err.message}`);
  console.error("Stack:", err.stack);
  process.exit(1);
}
