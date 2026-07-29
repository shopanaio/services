import { test } from '@fixtures/base.extend';
import {
  createDiscountsForKind,
  editAvailability,
  editFreeShipping,
  expectDiscountsForKind,
  getDiscountKind,
  setupDiscountTest,
} from './helpers';

test.describe('Admin free shipping discounts UI', () => {
  test('creates both methods and edits shipping value, requirements and availability', async ({
    api,
    page,
  }) => {
    test.setTimeout(60_000);

    const { unique } = await setupDiscountTest(api, page);
    const kind = getDiscountKind('FREE_SHIPPING');
    const titles = await createDiscountsForKind(page, kind, unique);
    await expectDiscountsForKind(page, kind, titles);

    await test.step('edit code shipping value and minimum requirements', async () => {
      await editFreeShipping(page, titles.code);
    });
    await test.step('edit code availability, limits and combinations', async () => {
      await editAvailability(page, titles.code);
    });
  });
});
