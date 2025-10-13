import { loadConfig } from "./core/config";
import { createServer } from "./server";

try {
  const config = loadConfig();
  const app = createServer(config);
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
