/**
 * Application configuration loaded from environment variables.
 */
export interface AppConfig {
  port: number;
  githubToken: string;
  /** Shared secret to verify Woodpecker convert extension signatures */
  convertSecret: string;
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
  const host = '0.0.0.0';

  if (!githubToken) {
    throw new Error('Env WOODPECKER_GITHUB_TOKEN is required');
  }

  if (!convertSecret) {
    throw new Error('Env WOODPECKER_CONFIG_SERVICE_SECRET is required');
  }

  return Object.freeze({
    port,
    githubToken,
    convertSecret,
    host,
  });
}
