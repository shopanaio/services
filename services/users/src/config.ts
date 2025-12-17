import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";

const { service, global } = getServiceConfig("users");

export const config = {
  /** HTTP port for GraphQL/API server */
  port: service.ports?.admin_graphql,

  /** Metrics port */
  metricsPort: service.ports?.metrics,

  /** Current environment name */
  environment: global.environment,

  /** Log level */
  logLevel: global.log_level,

  /** Development flag */
  isDevelopment: isDevelopment(global),

  /** Casdoor configuration */
  casdoor: service.casdoor
    ? {
        endpoint: service.casdoor.endpoint,
        clientId: service.casdoor.client_id,
        clientSecret: service.casdoor.client_secret,
        applicationName: service.casdoor.application_name,
        organizationName: service.casdoor.organization_name,
        certificate: service.casdoor.certificate,
        googleProvider: service.casdoor.google_provider,
        oauthRedirectUri: service.casdoor.oauth_redirect_uri,
      }
    : undefined,
} as const;
