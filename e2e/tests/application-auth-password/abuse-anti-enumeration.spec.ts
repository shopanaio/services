import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — abuse and anti-enumeration', [
  ['PWD-ABUSE-001', 'password signin identity limit follows the safe baseline'],
  ['PWD-ABUSE-002', 'password signin IP limit covers attempts distributed across emails'],
  ['PWD-ABUSE-003', 'email normalization variants cannot bypass identity limits'],
  ['PWD-ABUSE-004', 'identity limiter key is realm-scoped and contains no raw email'],
  ['PWD-ABUSE-005', 'shared limiter enforces one baseline across IAM replicas'],
  ['PWD-ABUSE-006', 'password reset identity hourly limit is enforced'],
  ['PWD-ABUSE-007', 'password reset IP/hour and identity/day windows are enforced'],
  ['PWD-ABUSE-008', 'limited response is generic and provides the approved Retry-After'],
  ['PWD-ABUSE-009', 'unavailable limiter makes reset fail closed without delivery'],
  ['PWD-ABUSE-010', 'unavailable limiter never creates unlimited permissive signin'],
  ['PWD-ABUSE-011', 'existing and absent identities have equivalent public failure contracts'],
  ['PWD-ABUSE-012', 'existing and absent identities have no stable material timing distinction'],
  ['PWD-ABUSE-013', 'blocked, disabled, and unverified state is not over-disclosed'],
  ['PWD-ABUSE-014', 'parallel brute force cannot exceed limits through races'],
  ['PWD-ABUSE-015', 'successful signin cannot reset independent abuse counters as a bypass'],
] as const);
