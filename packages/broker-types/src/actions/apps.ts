/**
 * Apps service broker action types
 */

// ============================================================================
// Execute Plugin Action
// ============================================================================

export interface ExecuteParams {
  domain: string;
  operation: string;
  params: unknown;
}

export interface ExecuteWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface ExecuteResult {
  data: unknown[];
  warnings: ExecuteWarning[];
}
