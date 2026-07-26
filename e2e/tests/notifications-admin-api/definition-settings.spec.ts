import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Notifications Admin API - definitions', [
  ['NTF-DEF-001', 'definitions returns every registered notification definition in deterministic order'],
  ['NTF-DEF-002', 'definition exposes key, title, audience, optional flag, variables, and version'],
  ['NTF-DEF-003', 'definition allowedChannels and defaultChannels match the server registry contract'],
  ['NTF-DEF-004', 'definition enabled and activeChannels reflect effective current-store settings'],
  ['NTF-DEF-005', 'a store without overrides receives registry-owned default definition state'],
  ['NTF-DEF-006', 'setDefinitionEnabled creates the first override with expectedVersion zero'],
  ['NTF-DEF-007', 'successful definition update increments version exactly once'],
  ['NTF-DEF-008', 'stale definition expectedVersion returns VERSION_CONFLICT without state change'],
  ['NTF-DEF-009', 'parallel definition updates with one version produce exactly one success'],
  ['NTF-DEF-010', 'mandatory definition cannot be disabled'],
  ['NTF-DEF-011', 'optional definition can be disabled and re-enabled'],
  ['NTF-DEF-012', 'unknown definition key returns INVALID_NOTIFICATION_DEFINITION on the key field'],
  ['NTF-DEF-013', 'definition override in Store A does not change effective state in Store B'],
  ['NTF-DEF-014', 'definition mutation updates request-local loader state before payload resolution'],
  ['NTF-DEF-015', 'successful setting mutation writes one safe durable audit record'],
  ['NTF-DEF-016', 'failed setting mutation leaves no setting row or success audit record'],
] as const);
