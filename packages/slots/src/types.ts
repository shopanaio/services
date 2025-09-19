// scope removed: application only supports aggregate-level

/**
 * Slot catalog (application-level providers).
 * Retrieved via REST API from apps service.
 */
export type Slot = {
  id: string;
  domain: string;
  provider: string;
  status: "active" | "inactive" | "maintenance" | "deprecated";
  environment: "development" | "staging" | "production";
  capabilities: string[];
  version: number;
  data: SlotConfiguration;
  created_at: string;
  updated_at: string;
};

/**
 * Extended slot configuration with typed sections
 */
export type SlotConfiguration = {
  // Basic connection settings
  baseUrl?: string;
  apiKey?: string;
  secretKey?: string;
  merchantId?: string;

  // Rate limiting
  rateLimits?: {
    requestsPerMinute: number;
    burstLimit: number;
    cooldownSeconds: number;
  };

  // Timeouts and retry policy
  timeouts?: {
    connectTimeout: number;
    requestTimeout: number;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };

  // Monitoring
  monitoring?: {
    healthCheckUrl?: string;
    healthCheckInterval?: number;
    alertingWebhook?: string;
  };
  metrics?: {
    trackSuccess: boolean;
    trackLatency: boolean;
    trackErrors: boolean;
  };

  // Security
  security?: {
    apiKeyRotation?: {
      enabled: boolean;
      rotationDays: number;
    };
    ipWhitelist?: string[];
    requireTLS?: boolean;
    webhookSignatures?: {
      algorithm: string;
      secretKey: string;
    };
  };

  // Fallback configuration
  fallback?: {
    enabled: boolean;
    fallbackMethods?: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
    fallbackProvider?: string;
  };

  // Webhook endpoints
  webhooks?: {
    endpoints: Array<{
      event: string;
      url: string;
      secret?: string;
    }>;
    retryPolicy?: {
      maxRetries: number;
      intervals: number[];
    };
  };

  // Business constraints
  constraints?: Record<string, unknown>;

  // Caching
  caching?: {
    [operation: string]: {
      ttl: number;
      enabled: boolean;
    };
  };

  // Arbitrary provider data
  [key: string]: unknown;
};

/**
 * Slot bindings to projects/aggregates/entities.
 * Retrieved via REST API from apps service.
 */
export type SlotAssignment = {
  id: string;
  project_id: string;
  aggregate: string;
  aggregate_id: string;
  slot_id: string;
  domain: string;
  precedence: number;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
};

/**
 * Result of provider resolution for domain within aggregate.
 */
export type ResolvedSlot = {
  slot: Slot;
  assignment: SlotAssignment;
};
