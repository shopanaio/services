/**
 * Application configuration loaded from environment variables.
 */
export interface AppConfig {
  port: number;
  githubToken: string;
  /** Shared secret to verify Woodpecker convert extension signatures (HMAC) */
  convertSecret: string;
  /** Public key for verifying ed25519 signatures (hex format) */
  publicKey?: string;
  /** Skip signature verification (for development only) */
  skipSignatureVerification: boolean;
  /** Host to bind express server to (always 0.0.0.0 in Docker) */
  host: string;
}

/**
 * Load and validate application configuration from process.env.
 * @throws {Error} If required environment variables are missing
 */
export function loadConfig(): AppConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const githubToken = process.env.WOODPECKER_GITHUB_TOKEN || '';
  const convertSecret = process.env.WOODPECKER_CONFIG_SERVICE_SECRET || '';
  const publicKey = process.env.WOODPECKER_PUBLIC_KEY || '';
  const skipSignatureVerification = process.env.SKIP_SIGNATURE_VERIFICATION === 'true';
  const host = '0.0.0.0';

  if (!githubToken) {
    throw new Error('Env WOODPECKER_GITHUB_TOKEN is required');
  }

  if (!convertSecret && !publicKey && !skipSignatureVerification) {
    throw new Error('Env WOODPECKER_CONFIG_SERVICE_SECRET or WOODPECKER_PUBLIC_KEY is required (or set SKIP_SIGNATURE_VERIFICATION=true for development)');
  }

  return Object.freeze({
    port,
    githubToken,
    convertSecret,
    publicKey: publicKey || undefined,
    skipSignatureVerification,
    host,
  });
}
