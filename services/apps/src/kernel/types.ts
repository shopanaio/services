import type { CoreCustomer, CoreProject } from "@shopana/platform-api";
import type { SlotsRepository } from "@src/infrastructure/repositories/slotsRepository";

// Base types for addons
export type SlotStatus = 'active' | 'inactive' | 'maintenance' | 'deprecated';
export type SlotEnvironment = 'development' | 'staging' | 'production';

export interface Slot {
  id: string;
  project_id: string;
  domain: string;
  provider: string;
  status: SlotStatus;
  environment: SlotEnvironment;
  capabilities: string[];
  version: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SlotAssignment {
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
}

export interface AvailableApp {
  code: string;
  name: string;
  meta?: {
    domains?: string[];
    version?: string;
    priority?: number;
    [key: string]: unknown;
  };
}

export interface InstalledApp {
  id: string;
  projectID: string;
  appCode: string;
  domain: string;
  baseURL: string;
  enabled: boolean;
  meta: Record<string, unknown> | null;
}

/**
 * Simplified GraphQL Context without correlation dependencies
 * Tracing is handled internally by Moleculer via ctx.requestID, ctx.parentID
 */
export interface GraphQLContext {
  project: CoreProject;
  customer: CoreCustomer | null;
  // Removed: apiKey, traceId, spanId, correlationId, causationId
  // These are now handled by Moleculer internally
}

// HTTP Client for integrations
export interface HttpClient {
  fetch: (
    path: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ) => Promise<Response>;
  baseUrl: string;
  provider: string;
}

// Logger interface
export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

// HTTP Client for external APIs
export interface ExternalHttpClient {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

// Services provided by kernel for transaction scripts
export interface KernelServices {
  readonly slotsRepository: SlotsRepository;
  readonly logger: Logger;
  readonly broker: any; // Moleculer ServiceBroker for calling other services
  readonly pluginManager: any; // AppsPluginManager for plugin operations
}

/**
 * Simplified transaction script execution context
 * Removed correlation fields - Moleculer handles this internally
 */
export interface ScriptContext {
  readonly requestId?: string;
  readonly projectId: string;
  readonly startTime: number;
  // Removed: traceId, spanId, correlationId, causationId
}

// Base interface for any transaction script
export interface TransactionScript<TParams = any, TResult = any> {
  (
    params: TParams,
    services: KernelServices,
    context: ScriptContext
  ): Promise<TResult>;
}

// Script execution result with warnings
export interface ScriptResult<TData = any> {
  data: TData;
  warnings?: Array<{ code: string; message: string; details?: any }>;
  metadata?: Record<string, unknown>;
}

// Kernel errors
export class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "KernelError";
  }
}

// Export types for use in other places
export type { SlotsRepository };
