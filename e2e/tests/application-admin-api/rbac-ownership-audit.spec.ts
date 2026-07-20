import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application Admin API - RBAC, ownership, and audit', [
  ['APP-SEC-001', 'platform authentication is required for every applicationQuery and applicationMutation operation'],
  ['APP-SEC-002', 'organization owner receives admin access to applications, auth, providers, OAuth clients, and users'],
  ['APP-SEC-003', 'organization admin role follows RBAC hierarchy for read, write, and admin actions'],
  ['APP-SEC-004', 'organization member without custom policy cannot read application auth, providers, OAuth clients, or users'],
  ['APP-SEC-005', 'custom read policy permits queries but rejects write and admin mutations'],
  ['APP-SEC-006', 'custom write policy permits non-secret updates but rejects secret rotation and archive actions'],
  ['APP-SEC-007', 'organizationId input is treated as a selector and never as trusted authorization context'],
  ['APP-SEC-008', 'applicationId plus organizationId ownership predicate is enforced before every read and write'],
  ['APP-SEC-009', 'global ID type confusion is rejected before domain mutation and records safe failure audit when applicable'],
  ['APP-SEC-010', 'malformed input returns userErrors without stack traces, SQL, secrets, or internal tenant details'],
  ['APP-SEC-011', 'successful write mutations create durable admin audit records with actor, organization, application, action, and request ID'],
  ['APP-SEC-012', 'failed write mutations create safe failure audit records when the boundary can identify action and scope'],
  ['APP-SEC-013', 'admin audit outage makes security-sensitive mutations fail closed according to contract'],
  ['APP-SEC-014', 'admin audit safeDiff is action allowlisted and excludes raw GraphQL variables'],
  ['APP-SEC-015', 'runtime operational audit remains separate from admin mutation audit'],
  ['APP-SEC-016', 'GraphQL admin middleware applies only to /graphql and not to public application auth routes'],
  ['APP-SEC-017', 'public application auth cookies or bearer tokens cannot authorize Admin GraphQL operations'],
  ['APP-SEC-018', 'concurrent writes with the same expected revision produce exactly one successful mutation'],
] as const);
