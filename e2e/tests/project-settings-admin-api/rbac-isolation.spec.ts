import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Project Settings Admin API - RBAC and isolation', [
  ['PRJ-SEC-001', 'platform Admin authentication is required for storeQuery and storeMutation'],
  ['PRJ-SEC-002', 'org.stores write permits store creation but not destructive deletion'],
  ['PRJ-SEC-003', 'org.stores admin permits store deletion inside the authorized organization'],
  ['PRJ-SEC-004', 'store.profile read permits Store projection without permitting mutations'],
  ['PRJ-SEC-005', 'store.profile write permits settings and locale changes in its store domain'],
  ['PRJ-SEC-006', 'organization owner and store roles follow the configured RBAC hierarchy'],
  ['PRJ-SEC-007', 'custom read-only role cannot update settings, locales, or brand media'],
  ['PRJ-SEC-008', 'authorization uses verified subject and Admin context rather than GraphQL selectors'],
  ['PRJ-SEC-009', 'Store ID and persisted organization are cross-checked for every update'],
  ['PRJ-SEC-010', 'Organization ID selector is never treated as proof of organization access'],
  ['PRJ-SEC-011', 'selected store claim cannot grant access to sibling stores in the organization'],
  ['PRJ-SEC-012', 'foreign Store global ID returns safe null, NOT_FOUND, or FORBIDDEN behavior'],
  ['PRJ-SEC-013', 'global ID type confusion fails before Project or external service mutation'],
  ['PRJ-SEC-014', 'client headers cannot substitute store name, organization, user, locale, or request identity'],
  ['PRJ-SEC-015', 'customer session cannot authorize Project Admin GraphQL'],
  ['PRJ-SEC-016', 'application-user, Storefront, and Apps runtime credentials cannot authorize Project Admin GraphQL'],
  ['PRJ-SEC-017', 'authorization denial creates no revision, saga, Media, IAM, event, or database side effect'],
  ['PRJ-SEC-018', 'request-local caching and loaders never mix settings between stores'],
  ['PRJ-SEC-019', 'soft-deleted store cannot be recovered through alternate query or mutation paths'],
  ['PRJ-SEC-020', 'negative tenant tests assert absence of changes in both selected and foreign organizations'],
] as const);
