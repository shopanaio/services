import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — signin', [
  ['PWD-SIGNIN-001', 'valid credentials create a session only in the target application'],
  ['PWD-SIGNIN-002', 'wrong password creates no session, code, or token'],
  ['PWD-SIGNIN-003', 'unknown email is indistinguishable from a wrong password by public contract'],
  ['PWD-SIGNIN-004', 'email normalization cannot duplicate identity or bypass rate limits'],
  ['PWD-SIGNIN-005', 'application A credentials cannot authenticate the same email in B'],
  ['PWD-SIGNIN-006', 'matching credentials in A and B create independent sessions'],
  ['PWD-SIGNIN-007', 'blocked user cannot create a new session'],
  ['PWD-SIGNIN-008', 'blocking a user during signin prevents authorization completion'],
  ['PWD-SIGNIN-009', 'live client, application, and organization disable stops an in-flight flow'],
  ['PWD-SIGNIN-010', 'malformed credential payload fails without reflecting secrets'],
  ['PWD-SIGNIN-011', 'duplicate credential or context fields are rejected as ambiguous'],
  ['PWD-SIGNIN-012', 'repeated form submission cannot reuse a context or create uncontrolled sessions'],
  ['PWD-SIGNIN-013', 'standalone signin can create only a session and never OAuth tokens directly'],
  ['PWD-SIGNIN-014', 'platform admin session is not accepted as an application user session'],
] as const);
