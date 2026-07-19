import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — password reset', [
  ['PWD-RESET-001', 'existing user reset request creates only a target-realm one-time flow'],
  ['PWD-RESET-002', 'unknown email returns a generic response and creates no user'],
  ['PWD-RESET-003', 'the same email receives realm-specific reset links in A and B'],
  ['PWD-RESET-004', 'reset token A cannot be consumed in application B'],
  ['PWD-RESET-005', 'successful reset disables the old password only in the target realm'],
  ['PWD-RESET-006', 'reset link replay cannot change the password again'],
  ['PWD-RESET-007', 'expired reset link leaves password and sessions unchanged'],
  ['PWD-RESET-008', 'tampered reset link fails closed without user or token disclosure'],
  ['PWD-RESET-009', 'new password violating policy cannot complete reset'],
  ['PWD-RESET-010', 'reuse of the old password follows the approved password policy'],
  ['PWD-RESET-011', 'concurrent link consumption has exactly one successful outcome'],
  ['PWD-RESET-012', 'repeated reset request follows the approved link rotation contract'],
  ['PWD-RESET-013', 'reset cannot unblock a user or grant a session'],
  ['PWD-RESET-014', 'closed registration still permits reset for an existing user'],
  ['PWD-RESET-015', 'disabled application or organization invalidates issued reset links'],
  ['PWD-RESET-016', 'reset revokes required target-realm sessions without affecting other realms'],
  ['PWD-RESET-017', 'capture delivery uses only the target-realm password reset purpose and template'],
  ['PWD-RESET-018', 'delivery timeout or rejection returns a generic fail-closed response'],
  ['PWD-RESET-019', 'reset email, link, token, and password never leak to telemetry or browser storage'],
] as const);
