import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Apps Admin API - runtime, capabilities, and observability', [
  ['APPS-RUN-001', 'successful install synchronizes capability bindings from the accepted manifest snapshot'],
  ['APPS-RUN-002', 'successful update replaces capability routes with the target manifest contract'],
  ['APPS-RUN-003', 'suspended or uninstalling installation cannot resolve an active capability route'],
  ['APPS-RUN-004', 'resume restores only capability bindings owned by the resumed installation'],
  ['APPS-RUN-005', 'uninstall removes capability bindings without deleting lifecycle and manifest history'],
  ['APPS-RUN-006', 'store capability assignment resolves only an active eligible installation'],
  ['APPS-RUN-007', 'resource capability assignment is store-scoped and uses deterministic precedence'],
  ['APPS-RUN-008', 'capability assignment cannot target an installation from another store'],
  ['APPS-RUN-009', 'App workflow receives immutable installation and operation context selected server-side'],
  ['APPS-RUN-010', 'App workflow never receives Admin session tokens or raw installation secrets in durable input'],
  ['APPS-RUN-011', 'operation actor and correlation ID trace the initiating Admin request safely'],
  ['APPS-RUN-012', 'workflow failure records a safe code and message without raw secrets or internal stack'],
  ['APPS-RUN-013', 'query and mutation responses never expose idempotency keys or encrypted secret material'],
  ['APPS-RUN-014', 'logs, traces, broker payloads, and workflow metadata redact submitted secret values'],
  ['APPS-RUN-015', 'runtime registry failure affects only the target App operation and leaves other Apps available'],
  ['APPS-RUN-016', 'database, broker, or workflow-start failure never leaves a permissive active capability route'],
  ['APPS-RUN-017', 'process restart reconstructs discovery from bundled manifests and durable installation state'],
  ['APPS-RUN-018', 'runtime health projection does not mutate durable installation health implicitly'],
] as const);
