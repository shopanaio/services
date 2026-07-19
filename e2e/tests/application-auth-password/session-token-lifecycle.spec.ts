import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — session and token lifecycle', [
  ['PWD-SESS-001', 'signin cookie has required security and target-realm attributes'],
  ['PWD-SESS-002', 'cookie A cannot authenticate or mutate a session in B'],
  ['PWD-SESS-003', 'sessions in A and B coexist and revoke independently'],
  ['PWD-SESS-004', 'expired session cannot continue authorization or pass live validation'],
  ['PWD-SESS-005', 'revoked session becomes inactive within the contract SLA'],
  ['PWD-SESS-006', 'user block revokes only target-application sessions'],
  ['PWD-SESS-007', 'realm secret rotation revokes only target-realm security artifacts'],
  ['PWD-SESS-008', 'refresh preserves the original user, issuer, resource, client, and scopes'],
  ['PWD-SESS-009', 'refresh token rotation rejects the previously used token'],
  ['PWD-SESS-010', 'refresh replay cannot issue a token and follows family revocation policy'],
  ['PWD-SESS-011', 'refresh token A cannot be used through issuer or client B'],
  ['PWD-SESS-012', 'refresh without exact resource fails without consuming the valid token'],
  ['PWD-SESS-013', 'disabled client, realm, organization, or user cannot refresh'],
  ['PWD-SESS-014', 'revocation disables refresh without affecting another realm'],
  ['PWD-SESS-015', 'end-session redirects only to a registered post-logout URI'],
  ['PWD-SESS-016', 'foreign post-logout URI cannot redirect or terminate another realm session'],
  ['PWD-SESS-017', 'logout in A preserves the active session in B'],
  ['PWD-SESS-018', 'multiple Set-Cookie headers remain independent through the transport bridge'],
] as const);
