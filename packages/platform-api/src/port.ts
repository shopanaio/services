export type ForwardHeaders = Record<string, string>;

/**
 * Configuration interface for gRPC client
 */
export interface GrpcConfigPort {
  /**
   * Get the gRPC server host (e.g., "localhost:50051")
   */
  getGrpcHost(): string;
}

/**
 * Core context client interface
 */
export interface CoreContextClientPort {
  fetchContext(headers: ForwardHeaders): Promise<unknown>;
}
