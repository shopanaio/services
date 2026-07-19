import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — email verification', [
  ['PWD-VERIFY-001', 'a valid link verifies only its target user and is consumed once'],
  ['PWD-VERIFY-002', 'verification link replay cannot change state or create authorization'],
  ['PWD-VERIFY-003', 'expired verification link leaves the user unverified'],
  ['PWD-VERIFY-004', 'tampered verification link fails closed'],
  ['PWD-VERIFY-005', 'verification token from application A is rejected in B'],
  ['PWD-VERIFY-006', 'foreign client or authorization context cannot capture verification'],
  ['PWD-VERIFY-007', 'verification resend follows the configured link rotation contract'],
  ['PWD-VERIFY-008', 'verification of an already verified user is safe and non-destructive'],
  ['PWD-VERIFY-009', 'unverified user cannot receive a full session or tokens when verification is required'],
  ['PWD-VERIFY-010', 'verified user passes the verification gate on subsequent signin'],
  ['PWD-VERIFY-011', 'capture delivery uses only the target realm email verification purpose and template'],
  ['PWD-VERIFY-012', 'verification links and tokens are absent from errors, telemetry, and browser storage'],
] as const);
