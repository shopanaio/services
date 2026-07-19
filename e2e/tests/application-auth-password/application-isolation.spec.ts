import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — application isolation', [
  ['PWD-ISO-001', 'user identifier substitution cannot cross application boundaries'],
  ['PWD-ISO-002', 'password account identifier substitution cannot cross application boundaries'],
  ['PWD-ISO-003', 'session identifier and cookie substitution cannot cross application boundaries'],
  ['PWD-ISO-004', 'verification and reset artifacts cannot cross application boundaries'],
  ['PWD-ISO-005', 'authorization context cannot be read or continued in another application'],
  ['PWD-ISO-006', 'authorization code cannot be exchanged in another application or client'],
  ['PWD-ISO-007', 'access token A is inactive for expected application or audience B'],
  ['PWD-ISO-008', 'refresh family cannot be used or revoked from another application'],
  ['PWD-ISO-009', 'consent cannot transfer scopes or approval to another realm or client'],
  ['PWD-ISO-010', 'OAuth client cannot be substituted across application issuers'],
  ['PWD-ISO-011', 'signing key cannot sign or validate another application issuer'],
  ['PWD-ISO-012', 'canonical resource is unique and rejected outside its application'],
  ['PWD-ISO-013', 'route, client, context, and token application disagreement fails closed'],
  ['PWD-ISO-014', 'positive and negative auth caches are application-scoped'],
  ['PWD-ISO-015', 'identity rate limits are realm-scoped while explicit IP limits remain global as designed'],
  ['PWD-ISO-016', 'delivery uses only target-application profile, template, and branding'],
  ['PWD-ISO-017', 'audit bindings never mix actors or artifacts from different realms'],
  ['PWD-ISO-018', 'all isolation rules hold between applications in the same organization'],
  ['PWD-ISO-019', 'repository or cache failure cannot trigger an unscoped permissive fallback'],
  ['PWD-ISO-020', 'parallel activity in A and B never leaks cookies, contexts, codes, tokens, keys, or email payloads'],
] as const);
