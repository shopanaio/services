import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Project Settings Admin API - locales', [
  ['PRJ-LOC-001', 'localeCreate adds one supported active language to the trusted current store'],
  ['PRJ-LOC-002', 'localeCreate can add an inactive draft language without adding it to Store.locales'],
  ['PRJ-LOC-003', 'created locale returns code, display name, and exact active state'],
  ['PRJ-LOC-004', 'unsupported locale enum is rejected before repository mutation'],
  ['PRJ-LOC-005', 'duplicate configured locale returns LOCALE_ALREADY_EXISTS'],
  ['PRJ-LOC-006', 'same locale can be configured independently in two stores'],
  ['PRJ-LOC-007', 'localeSetDefault selects an already active configured language'],
  ['PRJ-LOC-008', 'setting an inactive configured language as default activates it atomically'],
  ['PRJ-LOC-009', 'setting an unconfigured language returns LOCALE_NOT_FOUND'],
  ['PRJ-LOC-010', 'localeDelete removes a non-default configured language'],
  ['PRJ-LOC-011', 'localeDelete forbids deleting the current default language'],
  ['PRJ-LOC-012', 'deleting an unknown language returns NOT_FOUND without other changes'],
  ['PRJ-LOC-013', 'default locale always remains present in the active locale list'],
  ['PRJ-LOC-014', 'locale operations require store.profile write access to the trusted current store'],
  ['PRJ-LOC-015', 'client store-name header cannot redirect locale mutation to another store'],
  ['PRJ-LOC-016', 'locale operation in Store A never changes Store B language state'],
  ['PRJ-LOC-017', 'default locale change is visible to locale-sensitive Admin and Storefront contexts'],
  ['PRJ-LOC-018', 'locale deletion follows the product contract for existing translated content'],
  ['PRJ-LOC-019', 'parallel create of one locale produces one row and one deterministic loser error'],
  ['PRJ-LOC-020', 'parallel default change and deletion cannot leave a missing default locale'],
] as const);
