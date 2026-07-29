import { test } from '@fixtures/base.extend';
import {
  createDiscountTargetFixtures,
  createDiscountsForKind,
  editBuyXGetY,
  editEligibilityAndChannels,
  expectDiscountsForKind,
  getDiscountKind,
  setupDiscountTest,
} from './helpers';

test.describe('Admin buy X get Y discounts UI', () => {
  test('creates both methods and configures product, variant and category targets', async ({
    api,
    page,
  }) => {
    test.setTimeout(60_000);

    const { unique } = await setupDiscountTest(api, page);
    const fixtures = await createDiscountTargetFixtures(api, unique);
    const kind = getDiscountKind('BUY_X_GET_Y');
    const titles = await createDiscountsForKind(page, kind, unique);
    await expectDiscountsForKind(page, kind, titles);

    await test.step(
      'edit automatic customer buys and gets products, variants and categories',
      async () => {
        await editBuyXGetY(page, titles.automatic, fixtures);
      },
    );
    await test.step(
      'edit code customer buys and gets products, variants and categories',
      async () => {
        await editBuyXGetY(page, titles.code, fixtures);
      },
    );
    await test.step('edit code eligibility and channels', async () => {
      await editEligibilityAndChannels(page, titles.code);
    });
  });
});
