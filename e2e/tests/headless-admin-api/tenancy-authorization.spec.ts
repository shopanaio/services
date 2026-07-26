import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Headless Admin API - authorization and tenancy', [
  ['HDL-SEC-001', 'platform Admin authentication is required for every Headless query and mutation'],
  ['HDL-SEC-002', 'common Admin authorization is enforced before execution enters the Headless App subgraph'],
  ['HDL-SEC-003', 'Headless installation grantedScopes never replace Admin RBAC authorization'],
  ['HDL-SEC-004', 'trusted organizationId and storeId come only from verified Admin context'],
  ['HDL-SEC-005', 'client-supplied installation, store, organization, or App headers are ignored or removed'],
  ['HDL-SEC-006', 'create resolves the active shopana-headless installation server-side'],
  ['HDL-SEC-007', 'create fails safely when the current store has no active Headless installation'],
  ['HDL-SEC-008', 'existing connection operations cross-check connection, store, and installation together'],
  ['HDL-SEC-009', 'connection from Store A cannot be read or mutated through Store B Admin context'],
  ['HDL-SEC-010', 'credential from Store A cannot be listed or revoked through Store B'],
  ['HDL-SEC-011', 'policy from Store A cannot be read or replaced through Store B'],
  ['HDL-SEC-012', 'a second Headless installation cannot capture an earlier installation connections'],
  ['HDL-SEC-013', 'customer bearer token cannot authorize Headless Admin GraphQL'],
  ['HDL-SEC-014', 'public or private Storefront credential cannot authorize Headless Admin GraphQL'],
  ['HDL-SEC-015', 'Global ID type confusion fails before Headless repository mutation'],
  ['HDL-SEC-016', 'foreign resource errors do not disclose whether connection or credential exists'],
  ['HDL-SEC-017', 'authorization denial creates no connection, policy, credential, or audit side effect'],
  ['HDL-SEC-018', 'negative cross-store cases verify no change in both stores'],
] as const);
