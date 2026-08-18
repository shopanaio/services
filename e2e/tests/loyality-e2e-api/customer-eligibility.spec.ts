import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { createSegment } from '../customers-admin-api/helpers';
import { baseRules } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty customer eligibility across Admin and Storefront', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function quoteWithEligibility(eligibility: Record<string, unknown>, segmentIds: string[]) {
    const fixture = await kit.fundedAccount('100', { rules: baseRules({ eligibility }) });
    return kit.quote(fixture, '10', kit.checkoutContext({ segmentIds }));
  }

  test('applies ALL eligibility to non-excluded customers', async () => {
    expect(await quoteWithEligibility({
      type: 'ALL', channelCodes: ['WEB'], segmentIds: [], excludedSegmentIds: [],
    }, [])).toMatchObject({ status: 'QUOTED' });
  });

  test('applies SEGMENTS ANY and ALL with canonical decisions', async () => {
    const one = await createSegment(kit.api);
    const two = await createSegment(kit.api);
    expect(await quoteWithEligibility({
      type: 'SEGMENTS', segmentMatchMode: 'ANY', channelCodes: ['WEB'],
      segmentIds: [one.id, two.id], excludedSegmentIds: [],
    }, [decodeGlobalId(two.id).id])).toMatchObject({ status: 'QUOTED' });
    expect(await quoteWithEligibility({
      type: 'SEGMENTS', segmentMatchMode: 'ALL', channelCodes: ['WEB'],
      segmentIds: [one.id, two.id], excludedSegmentIds: [],
    }, [decodeGlobalId(one.id).id])).toMatchObject({ status: 'NOT_APPLICABLE', code: 'REQUIRED_SEGMENT_MISSING' });
  });

  test('gives excluded segments precedence', async () => {
    const included = await createSegment(kit.api);
    const excluded = await createSegment(kit.api);
    expect(await quoteWithEligibility({
      type: 'SEGMENTS', segmentMatchMode: 'ANY', channelCodes: ['WEB'],
      segmentIds: [included.id], excludedSegmentIds: [excluded.id],
    }, [decodeGlobalId(included.id).id, decodeGlobalId(excluded.id).id])).toMatchObject({
      status: 'NOT_APPLICABLE', code: 'EXCLUDED_SEGMENT_MATCHED',
    });
  });

  test('applies channel codes and immutable eligibility revisions', async () => {
    const fixture = await kit.fundedAccount('100', {
      rules: baseRules({ eligibility: {
        type: 'ALL', channelCodes: ['MOBILE'], segmentIds: [], excludedSegmentIds: [],
      } }),
    });
    expect(await kit.quote(fixture, '10', kit.checkoutContext({ channelCode: 'WEB' }))).toMatchObject({
      status: 'NOT_APPLICABLE', code: 'CHANNEL_NOT_ELIGIBLE',
    });
    const context = kit.checkoutContext({ channelCode: 'MOBILE' });
    const quoted = await kit.quote(fixture, '10', context);
    expect(quoted.quote.basedOnCustomerEligibilityRevision)
      .toBe(context.customerEligibilityRevision);
  });
});
