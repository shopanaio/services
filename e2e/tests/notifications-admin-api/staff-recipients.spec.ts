import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Notifications Admin API - staff recipients', [
  ['NTF-STAFF-001', 'staffRecipients returns only recipients owned by the trusted current store'],
  ['NTF-STAFF-002', 'recipient exposes ID, optional user, name, email, locale, timezone, scope, and enabled state'],
  ['NTF-STAFF-003', 'recipient eventKeys contain only enabled STAFF notification definitions'],
  ['NTF-STAFF-004', 'upsertStaffRecipient without ID creates one recipient and event assignment set'],
  ['NTF-STAFF-005', 'upsertStaffRecipient with current-store ID replaces mutable recipient and event fields'],
  ['NTF-STAFF-006', 'eventKeys replacement removes assignments omitted by the update'],
  ['NTF-STAFF-007', 'duplicate eventKeys do not create duplicate assignment rows'],
  ['NTF-STAFF-008', 'customer-audience definition is rejected with NOT_A_STAFF_NOTIFICATION'],
  ['NTF-STAFF-009', 'unknown event key is rejected without recipient or assignment changes'],
  ['NTF-STAFF-010', 'invalid email, locale, or timezone maps to the corresponding input field'],
  ['NTF-STAFF-011', 'disabled recipient remains queryable but is excluded from delivery resolution'],
  ['NTF-STAFF-012', 'recipient email is encrypted at rest and returned only to authorized Admin API'],
  ['NTF-STAFF-013', 'upsert with recipient ID from another store returns safe not-found behavior'],
  ['NTF-STAFF-014', 'deleteStaffRecipient removes the current-store recipient and its event assignments'],
  ['NTF-STAFF-015', 'delete of unknown or foreign recipient returns STAFF_RECIPIENT_NOT_FOUND'],
  ['NTF-STAFF-016', 'recipient create, update, and delete are atomic with their audit records'],
  ['NTF-STAFF-017', 'staff audit payload includes event keys and enabled state but never email ciphertext or plaintext'],
  ['NTF-STAFF-018', 'negative recipient cases leave both current and foreign store unchanged'],
] as const);
