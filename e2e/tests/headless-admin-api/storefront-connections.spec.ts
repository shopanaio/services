import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Headless Admin API - storefront connections', [
  ['HDL-CONN-001', 'headlessStorefrontCreate atomically creates an ACTIVE connection and default access policy'],
  ['HDL-CONN-002', 'connection create atomically creates exactly one public and one initial private credential'],
  ['HDL-CONN-003', 'create payload returns the connection and initial credentials with empty userErrors'],
  ['HDL-CONN-004', 'display name is trimmed and persisted without accepting a blank value'],
  ['HDL-CONN-005', 'display name above the supported limit returns a field-safe user error without state'],
  ['HDL-CONN-006', 'multiple independent connections can exist under one active Headless installation'],
  ['HDL-CONN-007', 'headlessStorefrontConnections returns only connections owned by the active installation and store'],
  ['HDL-CONN-008', 'connection list exposes deterministic connection state without credential plaintext duplication'],
  ['HDL-CONN-009', 'headlessStorefrontConnection resolves the expected global ID type in current scope'],
  ['HDL-CONN-010', 'malformed or type-confused connection global ID returns null'],
  ['HDL-CONN-011', 'connection ID from another store or installation returns null without existence disclosure'],
  ['HDL-CONN-012', 'connection exposes current policy, public token, and private credential metadata'],
  ['HDL-CONN-013', 'headlessStorefrontUpdate changes only displayName and updatedAt'],
  ['HDL-CONN-014', 'connection update cannot alter store, installation, status, policy, or credentials'],
  ['HDL-CONN-015', 'failed create transaction leaves no connection, policy, credential, or idempotency row'],
  ['HDL-CONN-016', 'failure in one connection operation does not corrupt sibling connections'],
] as const);
