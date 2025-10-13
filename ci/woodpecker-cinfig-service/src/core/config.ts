/**
 * Application configuration loaded from environment variables.
 */
export interface AppConfig {
  port: number;
  maxParallelSteps: number;
  baseUrl: string;
  graphqlUrl: string;
  bitbucketToken: string;
  /** Shared secret to verify Woodpecker convert extension signatures */
  convertSecret: string;
  /** Host to bind express server to */
  host: string;
  /** Optional repository provider override */
  repoProvider?: 'bitbucket' | 'github';
}

/**
 * Load and validate application configuration from process.env.
 */
export function loadConfig(): AppConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const maxParallelSteps = parseInt(process.env.MAX_PARALLEL_STEPS || '4', 10);
  const baseUrl = process.env.BASE_URL || 'https://sandbox.shopana.io';
  const graphqlUrl = process.env.GRAPHQL_URL || 'https://sandbox.shopana.io/api/admin/graphql/query';
  const bitbucketToken = process.env.BITBUCKET_TOKEN || '';
  const convertSecret = process.env.WOODPECKER_CONVERT_PLUGIN_SECRET || '';
  const host = process.env.HOST || '0.0.0.0';
  const repoProvider = (process.env.REPO_PROVIDER as 'bitbucket' | 'github' | undefined) || undefined;

  if (!bitbucketToken) {
    // Fail-fast to make misconfiguration visible early
    // eslint-disable-next-line no-console
    console.error('Env BITBUCKET_TOKEN is required');
    process.exit(1);
  }

  if (!convertSecret) {
    // eslint-disable-next-line no-console
    console.error('Env WOODPECKER_CONVERT_PLUGIN_SECRET is required');
    process.exit(1);
  }

  return Object.freeze({
    port,
    maxParallelSteps,
    baseUrl,
    graphqlUrl,
    bitbucketToken,
    convertSecret,
    host,
    repoProvider,
  });
}
