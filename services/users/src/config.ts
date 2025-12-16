/**
 * Users service configuration
 */
export interface UsersServiceConfig {
  /** Casdoor endpoint URL */
  casdoorEndpoint: string;
  /** Casdoor client ID */
  casdoorClientId: string;
  /** Casdoor client secret */
  casdoorClientSecret: string;
  /** Casdoor certificate (optional) */
  casdoorCertificate?: string;
  /** Casdoor organization name */
  casdoorOrganization: string;
  /** Casdoor application name */
  casdoorApplication: string;
}

/**
 * Get configuration from environment variables
 */
export function getConfig(): UsersServiceConfig {
  return {
    casdoorEndpoint: process.env.CASDOOR_ENDPOINT || "http://localhost:8000",
    casdoorClientId: process.env.CASDOOR_CLIENT_ID || "",
    casdoorClientSecret: process.env.CASDOOR_CLIENT_SECRET || "",
    casdoorCertificate: process.env.CASDOOR_CERTIFICATE,
    casdoorOrganization: process.env.CASDOOR_ORGANIZATION || "built-in",
    casdoorApplication: process.env.CASDOOR_APPLICATION || "app-built-in",
  };
}
