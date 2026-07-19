import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — signup', [
  ['PWD-SIGNUP-001', 'valid signup creates a user and password account only in the target realm'],
  ['PWD-SIGNUP-002', 'minimum allowed password length is accepted'],
  ['PWD-SIGNUP-003', 'password below the minimum creates no identity state'],
  ['PWD-SIGNUP-004', 'password above the maximum is rejected without truncation'],
  ['PWD-SIGNUP-005', 'missing required fields create no partial state'],
  ['PWD-SIGNUP-006', 'malformed email is rejected before identity creation'],
  ['PWD-SIGNUP-007', 'equivalent normalized emails cannot create duplicates in one realm'],
  ['PWD-SIGNUP-008', 'duplicate email does not create a second user or disclose account details'],
  ['PWD-SIGNUP-009', 'the same email creates independent users in applications A and B'],
  ['PWD-SIGNUP-010', 'the same email stays isolated across applications in one organization'],
  ['PWD-SIGNUP-011', 'foreign application or client context cannot receive signup state'],
  ['PWD-SIGNUP-012', 'repeated identical signup does not duplicate users, accounts, or sessions'],
  ['PWD-SIGNUP-013', 'concurrent signup creates exactly one consistent identity per realm'],
  ['PWD-SIGNUP-014', 'required verification prevents a full session or tokens before verification'],
  ['PWD-SIGNUP-015', 'optional verification does not weaken OAuth and PKCE requirements'],
  ['PWD-SIGNUP-016', 'verification delivery failure cannot grant a full authorized session'],
] as const);
