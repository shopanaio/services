import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Headless Admin API - storefront access policy', [
  ['HDL-POL-001', 'permission catalog returns every canonical Storefront permission exactly once'],
  ['HDL-POL-002', 'catalog definitions expose handle, resource, action, label, description, and risk'],
  ['HDL-POL-003', 'catalog handles exactly match the shared compile-time Storefront permission contract'],
  ['HDL-POL-004', 'new connection receives the server-owned default permission set in sorted order'],
  ['HDL-POL-005', 'storefrontAccessPolicyUpdate fully replaces rather than merges the grant set'],
  ['HDL-POL-006', 'policy update normalizes duplicates and returns an immutable sorted permission set'],
  ['HDL-POL-007', 'empty permission set is accepted and leaves only explicitly unprotected schema access'],
  ['HDL-POL-008', 'unknown permission is rejected without changing policy revision or grants'],
  ['HDL-POL-009', 'policy update requires the exact current expectedRevision'],
  ['HDL-POL-010', 'stale expectedRevision returns revision conflict and preserves previous grants'],
  ['HDL-POL-011', 'successful policy update increments revision exactly once'],
  ['HDL-POL-012', 'parallel policy updates with one revision produce exactly one successful replacement'],
  ['HDL-POL-013', 'policy update affects public and every private credential of the connection equally'],
  ['HDL-POL-014', 'policy update in one connection never changes sibling connection grants'],
  ['HDL-POL-015', 'policy update on a foreign connection changes neither current nor foreign store'],
  ['HDL-POL-016', 'policy grant change is enforced beginning with the next Storefront request'],
  ['HDL-POL-017', 'missing permission returns FORBIDDEN without hidden resource disclosure'],
  ['HDL-POL-018', 'a read permission never authorizes a write operation'],
  ['HDL-POL-019', 'permission from one domain never authorizes another domain operation'],
  ['HDL-POL-020', 'Gateway and verified subgraph context preserve the exact policy grant set'],
] as const);
