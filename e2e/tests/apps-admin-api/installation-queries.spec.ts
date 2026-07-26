import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Apps Admin API - installation queries', [
  ['APPS-QUERY-001', 'appInstallation returns a current-store installation by the expected global ID type'],
  ['APPS-QUERY-002', 'malformed or type-confused installation global ID returns null'],
  ['APPS-QUERY-003', 'installation ID owned by another store returns null without existence disclosure'],
  ['APPS-QUERY-004', 'installation exposes status, versions, manifest hash, health, and timestamps'],
  ['APPS-QUERY-005', 'installation exposes configuration and monotonically increasing configurationVersion'],
  ['APPS-QUERY-006', 'installation scopes distinguish active grants from revoked grants'],
  ['APPS-QUERY-007', 'installation capabilities expose only bindings owned by that installation'],
  ['APPS-QUERY-008', 'appInstallations defaults to deterministic createdAt and ID descending order'],
  ['APPS-QUERY-009', 'appInstallations supports forward and backward Relay pagination without duplicates'],
  ['APPS-QUERY-010', 'installation pagination remains stable when records share the ordered timestamp'],
  ['APPS-QUERY-011', 'installation connection totalCount respects the trusted store and supplied filters'],
  ['APPS-QUERY-012', 'installation filters support appCode, status, version, health, and configurationVersion'],
  ['APPS-QUERY-013', 'installation ordering accepts only schema-declared fields and directions'],
  ['APPS-QUERY-014', 'invalid cursor or pagination combination fails safely without changing state'],
  ['APPS-QUERY-015', 'appLifecycleOperation resolves only operations belonging to the current store'],
  ['APPS-QUERY-016', 'malformed, type-confused, or foreign lifecycle operation ID returns null'],
  ['APPS-QUERY-017', 'lifecycle operation exposes type, status, actor, workflow, correlation, and safe error metadata'],
  ['APPS-QUERY-018', 'per-installation lifecycle history is deterministic and excludes another installation operations'],
  ['APPS-QUERY-019', 'manifest snapshot history is immutable, deterministic, and scoped to its installation'],
  ['APPS-QUERY-020', 'query batching never mixes installation, operation, scope, or capability data across stores'],
] as const);
