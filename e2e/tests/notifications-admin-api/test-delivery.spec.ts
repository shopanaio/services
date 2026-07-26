import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Notifications Admin API - test delivery', [
  ['NTF-TEST-001', 'sendTest accepts one valid direct email recipient and returns an accepted workflow'],
  ['NTF-TEST-002', 'sendTest accepts one valid direct SMS recipient and returns an accepted workflow'],
  ['NTF-TEST-003', 'sendTest can resolve a current-store configured staff recipient by recipientId'],
  ['NTF-TEST-004', 'sendTest can resolve an authorized current-store customer or user recipient'],
  ['NTF-TEST-005', 'recipient selectors are mutually consistent and reject ambiguous destination input'],
  ['NTF-TEST-006', 'selected channel must be allowed by the notification definition'],
  ['NTF-TEST-007', 'unknown definition key returns userErrors without a workflow'],
  ['NTF-TEST-008', 'invalid email or phone returns field-safe validation without delivery'],
  ['NTF-TEST-009', 'sendTest uses the trusted store and organization from Admin context'],
  ['NTF-TEST-010', 'sendTest uses current effective channel setting and template for the resolved locale'],
  ['NTF-TEST-011', 'disabled definition or channel follows the explicit test-delivery product contract'],
  ['NTF-TEST-012', 'same idempotencyKey returns one workflow and at most one captured delivery'],
  ['NTF-TEST-013', 'parallel duplicate test sends cannot create duplicate provider attempts'],
  ['NTF-TEST-014', 'idempotencyKey from Store A cannot capture or suppress Store B test delivery'],
  ['NTF-TEST-015', 'delivery capture contains expected rendered subject and body for the target only'],
  ['NTF-TEST-016', 'provider rejection produces durable failed delivery state without reporting false acceptance'],
  ['NTF-TEST-017', 'workflow acceptance loss can be retried without duplicate delivery'],
  ['NTF-TEST-018', 'test recipient PII and rendered content are absent from GraphQL errors and operational telemetry'],
] as const);
