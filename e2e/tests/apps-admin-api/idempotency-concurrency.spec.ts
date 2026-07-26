import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Apps Admin API - idempotency and concurrency', [
  ['APPS-IDEM-001', 'repeated install with the same clientMutationId returns the original operation as duplicate'],
  ['APPS-IDEM-002', 'duplicate install does not start a second workflow or persist secrets twice'],
  ['APPS-IDEM-003', 'reusing install clientMutationId for a different lifecycle contract fails safely'],
  ['APPS-IDEM-004', 'repeated update with the same clientMutationId returns the original operation'],
  ['APPS-IDEM-005', 'repeated suspend, resume, or uninstall returns its original operation'],
  ['APPS-IDEM-006', 'clientMutationId is scoped to one installation and cannot capture another installation operation'],
  ['APPS-IDEM-007', 'parallel install attempts create at most one non-terminal installation per store and App'],
  ['APPS-IDEM-008', 'parallel lifecycle requests cannot create two conflicting transitions'],
  ['APPS-IDEM-009', 'parallel duplicate requests report one accepted operation and consistent duplicate results'],
  ['APPS-IDEM-010', 'workflow ID is stable for an idempotent lifecycle operation and contains no raw mutation ID'],
  ['APPS-IDEM-011', 'retry after broker acceptance loss returns the persisted operation without another dispatch'],
  ['APPS-IDEM-012', 'retry after workflow start failure returns consistent failed operation state'],
  ['APPS-IDEM-013', 'an idempotency key from another store cannot read or reuse a foreign operation'],
  ['APPS-IDEM-014', 'operation and installation state remain transactionally consistent during races'],
] as const);
