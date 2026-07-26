import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Headless Admin API - secret hygiene and observability', [
  ['HDL-OBS-001', 'private token is absent from plaintext and recoverable ciphertext database columns'],
  ['HDL-OBS-002', 'public token is encrypted at rest and decryptable only in its authenticated connection context'],
  ['HDL-OBS-003', 'database stores token digests and safe hints without storing recoverable private material'],
  ['HDL-OBS-004', 'GraphQL errors never contain public token, private token, digest, ciphertext, or pepper data'],
  ['HDL-OBS-005', 'GraphQL query responses never expose private credential plaintext'],
  ['HDL-OBS-006', 'logs and traces redact both Storefront credential headers and token fields'],
  ['HDL-OBS-007', 'DBOS operation and workflow inputs contain credential IDs but never raw token values'],
  ['HDL-OBS-008', 'audit events contain safe actor and resource IDs without token, digest, or unsafe hint'],
  ['HDL-OBS-009', 'credential created and revoked events are store and installation scoped'],
  ['HDL-OBS-010', 'policy audit records contain safe grant metadata without credentials'],
  ['HDL-OBS-011', 'authentication failure signal uses a safe reason category without raw credential data'],
  ['HDL-OBS-012', 'metrics avoid credential, store, IP, and token hint high-cardinality labels'],
  ['HDL-OBS-013', 'lastUsedAt telemetry updates asynchronously and never controls authentication decisions'],
  ['HDL-OBS-014', 'lost usage telemetry does not revive or invalidate credentials'],
  ['HDL-OBS-015', 'production Headless runtime fails to start without required cryptographic configuration'],
  ['HDL-OBS-016', 'key or pepper version mismatch fails closed without leaking cryptographic configuration'],
] as const);
