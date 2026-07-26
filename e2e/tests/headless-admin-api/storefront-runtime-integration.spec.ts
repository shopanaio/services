import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Headless Admin API - Storefront runtime integration', [
  ['HDL-RUN-001', 'Admin-created public token authenticates a Storefront Gateway request for its connection'],
  ['HDL-RUN-002', 'Admin-created private token authenticates server-side Storefront access for the same connection'],
  ['HDL-RUN-003', 'public and private modes resolve the same store, connection, and permission policy'],
  ['HDL-RUN-004', 'private credential grants no permissions beyond the connection policy'],
  ['HDL-RUN-005', 'credential for Store A is rejected when used with Store B hostname'],
  ['HDL-RUN-006', 'request with no credential returns the approved unauthenticated contract'],
  ['HDL-RUN-007', 'request with both public and private credential headers is rejected as ambiguous'],
  ['HDL-RUN-008', 'unknown key and invalid token share one generic external authentication error'],
  ['HDL-RUN-009', 'raw Storefront credential headers are never forwarded to subgraphs'],
  ['HDL-RUN-010', 'client-provided internal context header is replaced by Gateway-signed context'],
  ['HDL-RUN-011', 'direct subgraph request without valid internal context is rejected'],
  ['HDL-RUN-012', 'Admin Gateway does not require or interpret Storefront credentials'],
  ['HDL-RUN-013', 'credential resolver timeout returns service unavailable and never anonymous permissive access'],
  ['HDL-RUN-014', 'introspection cannot bypass Storefront credential authentication'],
  ['HDL-RUN-015', 'customer authorization remains separate from Storefront channel authentication'],
  ['HDL-RUN-016', 'client input cannot replace trusted connection attribution on cart, checkout, or order'],
  ['HDL-RUN-017', 'connection disconnect preserves historical channel attribution while blocking new access'],
  ['HDL-RUN-018', 'policy or lifecycle changes during a request follow one documented snapshot boundary'],
] as const);
