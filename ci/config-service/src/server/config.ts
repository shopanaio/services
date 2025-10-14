/**
 * Application configuration loaded from environment variables.
 */
export interface AppConfig {
  /** Public key for verifying ed25519 signatures (hex format) */
  pemFile?: string;
  /** Port to bind express server to */
  port: number;
}

/**
 * Load and validate application configuration from process.env.
 * @throws {Error} If required environment variables are missing
 */
export function loadConfig(): AppConfig {
  const port = parseInt(process.env.PORT || "3000", 10);
  const pemFile = process.env.CONFIG_SERVICE_PUBLIC_KEY_FILE || "";

  if (!pemFile) {
    throw new Error("Env CONFIG_SERVICE_PUBLIC_KEY_FILE is required");
  }

  return Object.freeze({
    port,
    pemFile,
  });
}
