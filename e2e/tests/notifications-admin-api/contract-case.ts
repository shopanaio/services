import { test } from '@fixtures/base.extend';

export type ContractCase = readonly [id: string, expectation: string];

export function definePendingContractSuite(name: string, cases: readonly ContractCase[]): void {
  test.describe.skip(name, () => {
    for (const [id, expectation] of cases) {
      test(`${id}: ${expectation}`, () => {
        throw new Error('Pending Notifications Admin API e2e implementation');
      });
    }
  });
}
