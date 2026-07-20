import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application Admin API - social provider management', [
  ['APP-PROV-001', 'provider catalog exposes only supported closed enum values'],
  ['APP-PROV-002', 'unconfigured provider status is readable without secret fields'],
  ['APP-PROV-003', 'provider configure stores encrypted credentials and returns only masked client ID'],
  ['APP-PROV-004', 'provider configure rejects unsupported scopes before storing credentials'],
  ['APP-PROV-005', 'provider configure rejects unknown provider before repository mutation'],
  ['APP-PROV-006', 'provider cannot be configured twice without explicit credential rotation'],
  ['APP-PROV-007', 'provider enable requires stored credentials and catalog-approved scopes'],
  ['APP-PROV-008', 'provider disable cannot remove the last sign-in method while realm is enabled'],
  ['APP-PROV-009', 'provider credentials rotate updates encrypted credentials without exposing secret values'],
  ['APP-PROV-010', 'provider credentials delete is allowed only after provider is disabled'],
  ['APP-PROV-011', 'provider credentials delete removes runtime availability without deleting unrelated provider audit history'],
  ['APP-PROV-012', 'provider validation returns VALID with safe metadata for a valid external configuration'],
  ['APP-PROV-013', 'provider validation returns INVALID reason code without exposing upstream response or secret'],
  ['APP-PROV-014', 'provider validation returns UNAVAILABLE without changing stored provider state'],
  ['APP-PROV-015', 'provider callback URL is exact, application-scoped, and uses IAM public base URL'],
  ['APP-PROV-016', 'provider query requires org.application-auth-providers read permission'],
  ['APP-PROV-017', 'provider write and credential mutations enforce write versus admin permission split'],
  ['APP-PROV-018', 'provider mutation with organizationId of another owner returns safe not-found or forbidden behavior'],
  ['APP-PROV-019', 'provider state change invalidates the target application runtime and not another application'],
  ['APP-PROV-020', 'provider admin audit safeDiff never includes client secret, full client ID, tokens, or upstream payload'],
] as const);
