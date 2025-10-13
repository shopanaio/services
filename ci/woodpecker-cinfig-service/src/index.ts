import { loadConfig } from "./core/config";
import { createLogger } from "./core/logger";
import { createConfigService } from "@shopana/ci-woodpecker-config-service";
import express, { Router } from "express";

try {
  const config = loadConfig();
  const app = express();
  const logger = createLogger();

  // Example: explicit scripts array is empty in this package runner; users will mount their own
  app.use(
    "/",
    createConfigService(
      {
        githubToken: config.githubToken,
        secret: config.convertSecret,
        publicKeyHex: config.publicKey,
        skipSignatureVerification: config.skipSignatureVerification,
        logger,
      },
      []
    ) as unknown as Router
  );

  app.listen(config.port, config.host, () => {
    console.log(`Woodpecker convert extension listening on ${config.host}:${config.port}`);
    if (config.skipSignatureVerification) {
      console.warn('⚠️  WARNING: Signature verification is DISABLED!');
      console.warn('   This is insecure and should only be used for development.');
      console.warn('   Set SKIP_SIGNATURE_VERIFICATION=false in production.');
    }
  });
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`Failed to start server: ${err.message}`);
  process.exit(1);
}
