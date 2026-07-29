import { test } from '@fixtures/base.extend';
import {
  createDiscountsForKind,
  editAmountOffOrder,
  editAutomaticGeneralSettings,
  expectDiscountsForKind,
  getDiscountKind,
  setupDiscountTest,
} from './helpers';

test.describe('Admin amount off order discounts UI', () => {
  test('creates both methods and edits value, requirements and automatic settings', async ({
    api,
    page,
  }) => {
    test.setTimeout(60_000);

    const { unique } = await setupDiscountTest(api, page);
    const kind = getDiscountKind('AMOUNT_OFF_ORDER');
    const titles = await createDiscountsForKind(page, kind, unique);
    await expectDiscountsForKind(page, kind, titles);

    await test.step('edit automatic value and minimum requirements', async () => {
      await editAmountOffOrder(page, titles.automatic);
    });
    await test.step('edit automatic general settings', async () => {
      await editAutomaticGeneralSettings(page, titles.automatic);
    });
  });
});
