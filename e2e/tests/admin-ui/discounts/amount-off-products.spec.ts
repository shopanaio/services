import { test } from '@fixtures/base.extend';
import {
  assertEveryDetailsSection,
  createDiscountsForKind,
  editAmountOffProducts,
  editGeneralSettingsAndCodes,
  expectDiscountsForKind,
  getDiscountKind,
  setupDiscountTest,
} from './helpers';

test.describe('Admin amount off products discounts UI', () => {
  test('creates both methods and edits value, targets, general settings and codes', async ({
    api,
    page,
  }) => {
    test.setTimeout(60_000);

    const { unique } = await setupDiscountTest(api, page);
    const kind = getDiscountKind('AMOUNT_OFF_PRODUCTS');
    const titles = await createDiscountsForKind(page, kind, unique);
    await expectDiscountsForKind(page, kind, titles);

    await test.step('edit automatic value, targets and requirements', async () => {
      await editAmountOffProducts(page, titles.automatic);
    });
    await test.step('edit code general settings and discount codes', async () => {
      await editGeneralSettingsAndCodes(page, titles.code, unique);
    });
    await test.step('verify every discount details section', async () => {
      await assertEveryDetailsSection(page, titles.code);
    });
  });
});
