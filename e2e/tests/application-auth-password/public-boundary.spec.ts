import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — public boundary', [
  ['PWD-BOUND-001', 'active realm exposes only enabled password capabilities'],
  ['PWD-BOUND-002', 'disabled signup is absent from UI and direct HTTP contract'],
  ['PWD-BOUND-003', 'disabled signin cannot create an application session'],
  ['PWD-BOUND-004', 'disabled reset has no UI, delivery, or verification side effect'],
  ['PWD-BOUND-005', 'signup enabled with signin disabled creates no session'],
  ['PWD-BOUND-006', 'signin enabled with signup disabled authenticates only existing users'],
  ['PWD-BOUND-007', 'closed registration blocks new users server-side'],
  ['PWD-BOUND-008', 'closed registration preserves allowed signin and reset for existing users'],
  ['PWD-BOUND-009', 'unknown auth path fails before auth processing'],
  ['PWD-BOUND-010', 'known path with a disallowed HTTP method fails without side effects'],
  ['PWD-BOUND-011', 'application sessions cannot access OAuth client management endpoints'],
  ['PWD-BOUND-012', 'disabled OTP and social endpoints remain unreachable'],
  ['PWD-BOUND-013', 'disabled application stops all auth flows without deleting auth rows'],
  ['PWD-BOUND-014', 'disabled organization stops auth flows for its application realms'],
  ['PWD-BOUND-015', 'invalid or unknown application identifier fails without realm disclosure'],
] as const);
