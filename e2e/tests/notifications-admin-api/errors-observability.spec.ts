import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Notifications Admin API - errors and observability', [
  ['NTF-OBS-001', 'expected validation and domain failures return stable userErrors with precise field paths'],
  ['NTF-OBS-002', 'unexpected resolver failures return a generic safe GraphQL error'],
  ['NTF-OBS-003', 'errors contain no stack, SQL, encryption key, provider secret, or foreign tenant detail'],
  ['NTF-OBS-004', 'template validation issues never include unrelated stored template or recipient values'],
  ['NTF-OBS-005', 'webhook URL errors do not expose DNS infrastructure or resolved private addresses unnecessarily'],
  ['NTF-OBS-006', 'logs redact recipient email, phone, rendered content, webhook secret, and provider credentials'],
  ['NTF-OBS-007', 'traces and metrics use bounded labels without store, recipient, delivery, or webhook IDs'],
  ['NTF-OBS-008', 'workflow payloads include only data required for materialization and delivery'],
  ['NTF-OBS-009', 'encrypted recipient and webhook secret fields cannot be decrypted under another store context'],
  ['NTF-OBS-010', 'data protection key absence or ciphertext failure makes secret operations fail closed'],
  ['NTF-OBS-011', 'database outage cannot return registry defaults as a false successful mutation'],
  ['NTF-OBS-012', 'broker or workflow outage returns safe failure and never creates an untracked delivery'],
  ['NTF-OBS-013', 'delivery retries preserve one materialized notification and bounded provider attempts'],
  ['NTF-OBS-014', 'request-local loader invalidation makes mutation payload and following query observe committed state'],
  ['NTF-OBS-015', 'health and root service endpoints expose no Admin notification configuration'],
  ['NTF-OBS-016', 'introspection never exposes runtime secrets or persisted notification data'],
] as const);
