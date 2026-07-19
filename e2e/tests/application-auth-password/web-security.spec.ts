import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — browser and transport security', [
  ['PWD-WEB-001', 'CSRF protects signup, signin, reset, consent, and logout forms'],
  ['PWD-WEB-002', 'origin enforcement accepts only exact configured origins'],
  ['PWD-WEB-003', 'Host header poisoning cannot alter canonical URLs or cookie realm'],
  ['PWD-WEB-004', 'untrusted proxy headers cannot alter URLs or bypass IP limits'],
  ['PWD-WEB-005', 'path encoding and normalization tricks cannot bypass default-deny routing'],
  ['PWD-WEB-006', 'unsupported content type, charset, encoding, and malformed forms fail early'],
  ['PWD-WEB-007', 'oversized auth body fails before credential or token processing'],
  ['PWD-WEB-008', 'hosted UI returns the complete required security header policy'],
  ['PWD-WEB-009', 'hosted auth pages cannot be embedded by an external frame'],
  ['PWD-WEB-010', 'branding values cannot inject markup, script, CSS, or form destinations'],
  ['PWD-WEB-011', 'credentials and OAuth artifacts never enter browser storage'],
  ['PWD-WEB-012', 'credentials, tokens, and verifier never leak through URL history or referrer'],
  ['PWD-WEB-013', 'auth HTML, forms, and errors are not cached'],
  ['PWD-WEB-014', 'CORS never combines credential access with wildcard origins'],
  ['PWD-WEB-015', 'public application session cannot access internal Admin GraphQL'],
  ['PWD-WEB-016', 'only approved metadata paths are publicly reachable'],
  ['PWD-WEB-017', 'error rendering escapes user-controlled values and prevents reflected XSS'],
  ['PWD-WEB-018', 'unknown locale falls back without loading external executable content'],
] as const);
