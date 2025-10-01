import type { CoreCustomer, CoreProject } from "@shopana/platform-api";
import type { SlotsRepository } from "@src/infrastructure/repositories/slotsRepository";
import type { BaseKernelServices, ScriptContext as BaseScriptContext, TransactionScript as BaseTransactionScript } from "@shopana/shared-kernel";
import type { AppsPluginManager } from "@src/infrastructure/plugins/pluginManager";

// Base types for addons
export type SlotStatus = 'active' | 'inactive' | 'maintenance' | 'deprecated';
export type SlotEnvironment = 'development' | 'staging' | 'production';

/**
 * Provider configuration - centralized config shared across multi-domain slots
 */
export interface ProviderConfig {
  id: string;
  project_id: string;
  provider: string;
  data: Record<string, unknown>;
  version: number;
  status: SlotStatus;
  environment: SlotEnvironment;
  created_at: string;
  updated_at: string;
}

/**
 * Slot - lightweight reference to domain + provider combination
 * References shared provider_config to avoid data duplication
 */
export interface Slot {
  id: string;
  project_id: string;
  domain: string;
  provider: string;
  provider_config_id: string;
  capabilities: string[];
  created_at: string;
  updated_at: string;
  // Joined data from provider_config (when fetched with JOIN)
  config?: ProviderConfig;
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

// HTTP Client for external APIs
export interface ExternalHttpClient {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

/**
 * Extended services for apps microservice
 * Adds repository and plugin manager to base kernel services
 */
export interface AppsKernelServices extends BaseKernelServices {
  readonly slotsRepository: SlotsRepository;
  readonly pluginManager: AppsPluginManager;
}

/**
 * Script context for apps service - uses base ScriptContext from kernel
 */
export type ScriptContext = BaseScriptContext;

/**
 * Transaction script for apps service - uses base TransactionScript with AppsKernelServices
 */
export type TransactionScript<TParams = any, TResult = any> = BaseTransactionScript<TParams, TResult, AppsKernelServices>;

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
