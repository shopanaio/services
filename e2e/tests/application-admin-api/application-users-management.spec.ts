import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application Admin API - application user management', [
  ['APP-USER-001', 'admin can list application users inside one application only'],
  ['APP-USER-002', 'application user connection filters by status and search without leaking users from another realm'],
  ['APP-USER-003', 'application user connection ordering and cursor pagination are stable'],
  ['APP-USER-004', 'admin can get one application user by global ID only within the selected application'],
  ['APP-USER-005', 'get user with ID from another application returns null or safe not-found without revealing existence'],
  ['APP-USER-006', 'application user response exposes security metadata without password hash, OTP, session token, or refresh token'],
  ['APP-USER-007', 'block user prevents new signin and makes existing tokens inactive within the contract SLA'],
  ['APP-USER-008', 'unblock user permits future signin but does not revive revoked sessions or token families'],
  ['APP-USER-009', 'block user in application A does not affect same-email user in application B'],
  ['APP-USER-010', 'revoke all sessions revokes only sessions in the target application'],
  ['APP-USER-011', 'revoke all sessions returns accurate revoked count and is idempotent'],
  ['APP-USER-012', 'linked account list shows provider/account metadata without encrypted provider tokens'],
  ['APP-USER-013', 'unlink account removes only the selected account in the target application'],
  ['APP-USER-014', 'unlink account from another application is rejected without changing either realm'],
  ['APP-USER-015', 'unlink cannot remove the last usable sign-in method for the user'],
  ['APP-USER-016', 'application user admin operations require org.application-users permissions'],
  ['APP-USER-017', 'application user mutations write safe audit records without email, tokens, or account secrets'],
  ['APP-USER-018', 'application user admin API rejects application user session as an administrative actor'],
] as const);
