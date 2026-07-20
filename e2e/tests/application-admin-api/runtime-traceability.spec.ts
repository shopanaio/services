import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application Admin API - runtime traceability', [
  ['APP-RUN-001', 'application created through Admin GraphQL can be used to build the public auth runtime'],
  ['APP-RUN-002', 'auth method changes through GraphQL are reflected by the public route manifest after invalidation'],
  ['APP-RUN-003', 'trusted origin changes through GraphQL are reflected by CORS and origin checks'],
  ['APP-RUN-004', 'branding and locale changes through GraphQL are reflected by hosted UI without unsafe markup'],
  ['APP-RUN-005', 'email delivery configuration through GraphQL is used by verification and reset flows only for the target application'],
  ['APP-RUN-006', 'OAuth client created through GraphQL completes Authorization Code with S256 PKCE'],
  ['APP-RUN-007', 'confidential client secret created through GraphQL authenticates token exchange and old rotated secret fails'],
  ['APP-RUN-008', 'OAuth client disable through GraphQL blocks authorize, exchange, refresh, and introspection active state'],
  ['APP-RUN-009', 'provider enable through GraphQL exposes only exact allowed social routes for the target application'],
  ['APP-RUN-010', 'provider disable through GraphQL removes social routes and preserves password routes when configured'],
  ['APP-RUN-011', 'user block through GraphQL makes public signin, refresh, and introspection inactive'],
  ['APP-RUN-012', 'realm disable through GraphQL stops discovery, hosted UI, authorize, signin, reset, refresh, and validation'],
  ['APP-RUN-013', 'runtime cache refreshes after missed invalidation no later than the configured revision fallback interval'],
  ['APP-RUN-014', 'traceability table maps every public runtime setup step to a supported GraphQL operation and fixture'],
  ['APP-RUN-015', 'GraphQL-prepared state produces the same expected behavior as trusted fixture-prepared state'],
] as const);
