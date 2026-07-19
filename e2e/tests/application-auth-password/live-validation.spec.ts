import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — live validation', [
  ['PWD-LIVE-001', 'token is active only when every cryptographic and live-state binding matches'],
  ['PWD-LIVE-002', 'block makes artifacts inactive and unblock does not revive revoked artifacts'],
  ['PWD-LIVE-003', 'session revoke makes bound token inactive according to policy'],
  ['PWD-LIVE-004', 'client disable invalidates only that client artifacts'],
  ['PWD-LIVE-005', 'application disable invalidates its realm without deleting users'],
  ['PWD-LIVE-006', 'organization disable invalidates child realms without affecting other organizations'],
  ['PWD-LIVE-007', 'token family revoke preserves unrelated families according to policy'],
  ['PWD-LIVE-008', 'revision fallback enforces invalidation when the event is lost'],
  ['PWD-LIVE-009', 'database or cache timeout returns inactive outside allowed cache TTL'],
  ['PWD-LIVE-010', 'unknown signing or encryption key version fails closed'],
  ['PWD-LIVE-011', 'token missing a mandatory claim is inactive'],
  ['PWD-LIVE-012', 'userless or non-application actor token is inactive'],
  ['PWD-LIVE-013', 'expected application or audience mismatch is inactive despite valid signature'],
  ['PWD-LIVE-014', 'external introspection response hides internal reason and tenant details'],
] as const);
