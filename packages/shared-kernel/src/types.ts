/**
 * Core types for Kernel architecture
 * Supports Transaction Script pattern for microservices
 */

/**
 * Logger interface that abstracts logging implementation
 * Compatible with various logging solutions (Moleculer, Winston, etc.)
 */
export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

/**
 * Base services provided by kernel to transaction scripts
 * Can be extended with additional service-specific dependencies
 */
export interface BaseKernelServices {
  readonly broker: any; // Moleculer ServiceBroker for inter-service communication
  readonly logger: Logger;
}

/**
 * Generic KernelServices type that can be extended with custom services
 * @example
 * interface MyServices extends BaseKernelServices {
 *   readonly repository: MyRepository;
 *   readonly pluginManager: MyPluginManager;
 * }
 */
export type KernelServices<TExtension = {}> = BaseKernelServices & TExtension;

/**
 * Transaction Script interface
 * Represents a single unit of business logic
 * @template TParams - Parameters type for the script
 * @template TResult - Return type of the script
 * @template TServices - Extended kernel services type
 */
export interface TransactionScript<TParams = any, TResult = any, TServices extends BaseKernelServices = BaseKernelServices> {
  (params: TParams, services: TServices, context?: ScriptContext): Promise<TResult>;
}

/**
 * Script execution context
 * Provides request tracking and metadata for transaction scripts
 */
export interface ScriptContext {
  readonly requestId?: string;
  readonly projectId?: string;
  readonly startTime: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Standard result wrapper for scripts
 * Provides consistent structure for success cases with optional warnings
 */
export interface ScriptResult<TData = any> {
  data: TData;
  warnings?: Array<{ code: string; message: string; details?: any }>;
  metadata?: Record<string, unknown>;
}

/**
 * Standard kernel error class
 * Used for domain-specific errors with error codes
 */
export class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'KernelError';
  }
}
