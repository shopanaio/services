import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Headless Admin API - storefront credentials', [
  ['HDL-CRED-001', 'initial public and private tokens have distinct strict versioned formats'],
  ['HDL-CRED-002', 'two generated credentials never share a token or credential identifier'],
  ['HDL-CRED-003', 'publicAccessToken is repeat-readable only for the owning authorized Admin scope'],
  ['HDL-CRED-004', 'initial private plaintext is returned only by the first successful create execution'],
  ['HDL-CRED-005', 'private plaintext is absent from all connection and credential query fields'],
  ['HDL-CRED-006', 'credential metadata exposes kind, status, label, safe hint, and lifecycle timestamps'],
  ['HDL-CRED-007', 'storefrontPrivateCredentialCreate returns one new private token for an ACTIVE connection'],
  ['HDL-CRED-008', 'additional private credential label is trimmed and validated'],
  ['HDL-CRED-009', 'multiple private credentials support an overlap period without changing the public token'],
  ['HDL-CRED-010', 'private credential create for a suspended or disconnected connection is rejected'],
  ['HDL-CRED-011', 'private credential create for a foreign connection returns safe not-found behavior'],
  ['HDL-CRED-012', 'storefrontCredentialRevoke revokes only the selected private credential'],
  ['HDL-CRED-013', 'revoking one private credential preserves sibling private and public credentials'],
  ['HDL-CRED-014', 'ordinary revoke mutation rejects the connection public credential'],
  ['HDL-CRED-015', 'revoke of an already revoked private credential is a safe duplicate success'],
  ['HDL-CRED-016', 'credential global ID type confusion cannot revoke any credential'],
  ['HDL-CRED-017', 'wrong secret with a valid credential key is indistinguishable from an unknown key externally'],
  ['HDL-CRED-018', 'public token used as private token and private token used as public token are rejected'],
  ['HDL-CRED-019', 'public token encryption is bound to its connection and cannot be copied across connections'],
  ['HDL-CRED-020', 'credential revoke is effective on the next Storefront request without a stale acceptance window'],
] as const);
