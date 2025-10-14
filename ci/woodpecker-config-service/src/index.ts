import { loadConfig } from "./core/config";
import { createLogger } from "./core/logger";
import { createConfigService } from "@shopana/ci-woodpecker-config-service";
import express, { Router } from "express";
import { LintScript } from "./scripts/lint";
import { PlaywrightScript } from "./scripts/playwright";
import 'dotenv/config';

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
      [new LintScript(), new PlaywrightScript()]
    ) as unknown as Router
  );

  const server = app.listen(config.port, config.host, () => {
    console.log(`Woodpecker convert extension listening on ${config.host}:${config.port}`);
    if (config.skipSignatureVerification) {
      console.warn('⚠️  WARNING: Signature verification is DISABLED!');
      console.warn('   This is insecure and should only be used for development.');
      console.warn('   Set SKIP_SIGNATURE_VERIFICATION=false in production.');
    }
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });

  // Keep process alive
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`Failed to start server: ${err.message}`);
  console.error('Stack:', err.stack);
  process.exit(1);
}
