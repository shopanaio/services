/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { type Checkout, CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

test.describe('Storefront checkout delivery', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('keeps a digital-only checkout ready without delivery groups', async () => {
    const checkout = await kit.created({
      items: [{ purchasableId: await kit.variant(), quantity: 1 }],
    });
    expect(checkout.deliveryGroups).toEqual([]);
    expect(checkout.issues.filter(({ code }) => code.startsWith('DELIVERY_'))).toEqual([]);
  });

  test('requires a destination and delivery selection for physical merchandise', async () => {
    await kit.configureDelivery();
    const checkout = await physical(kit);
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ code: 'DELIVERY_ADDRESS_REQUIRED' }),
    );
    const addressed = await addDestination(
      kit,
      checkout,
      checkout.lines.map(({ id }) => id),
    );
    expect(addressed.deliveryGroups).toHaveLength(1);
    expect(addressed.deliveryGroups[0]!.selection.status).toBe('NONE');
    expect(addressed.issues).toContainEqual(
      expect.objectContaining({ code: 'DELIVERY_OPTION_REQUIRED' }),
    );
  });

  test('adds multiple delivery addresses in one batch', async () => {
    await kit.configureDelivery();
    const checkout = await physical(kit, 2);
    const after = kit.expectSuccess(
      await addresses(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
        addresses: checkout.lines.map((line, index) => ({
          checkoutLineIds: [line.id],
          address: address(`Street ${index + 1}`, index ? 'Lviv' : 'Kyiv'),
        })),
      }),
    );
    expect(after.deliveryGroups).toHaveLength(2);
    expect(after.deliveryGroups.map((group) => group.checkoutLines[0]!.id).sort()).toEqual(
      checkout.lines.map(({ id }) => id).sort(),
    );
  });

  test('rejects unknown and duplicate root lines in delivery destinations', async () => {
    await kit.configureDelivery();
    const checkout = await physical(kit);
    for (const checkoutLineIds of [
      [kit.id('CheckoutLine')],
      [checkout.lines[0]!.id, checkout.lines[0]!.id],
    ]) {
      const payload = await addresses(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
        addresses: [{ checkoutLineIds, address: address() }],
      });
      kit.expectUserError(payload, /DELIVERY|LINE|DESTINATION|DUPLICATE/);
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('updates delivery addresses and recalculates available options', async () => {
    await kit.configureDelivery();
    const before = await addDestination(kit, await physical(kit));
    const group = before.deliveryGroups[0]!;
    const after = kit.expectSuccess(
      await addresses(kit, 'checkoutDeliveryAddressesUpdate', before.id, {
        updates: [
          { addressId: group.deliveryAddress!.id, address: address('2 Updated Street', 'Lviv') },
        ],
      }),
    );
    expect(after.deliveryGroups[0]!.deliveryAddress).toMatchObject({
      address1: '2 Updated Street',
      city: 'Lviv',
    });
    expect(after.resultRevision).not.toBe(before.resultRevision);
  });

  test('removes delivery addresses and resets dependent selections', async () => {
    await kit.configureDelivery();
    const addressed = await addDestination(kit, await physical(kit));
    const selected = await selectFirst(kit, addressed);
    const after = kit.expectSuccess(
      await addresses(kit, 'checkoutDeliveryAddressesRemove', selected.id, {
        addressIds: [selected.deliveryGroups[0]!.deliveryAddress!.id],
      }),
    );
    expect(after.deliveryGroups).toEqual([]);
    expect(after.issues).toContainEqual(
      expect.objectContaining({ code: 'DELIVERY_ADDRESS_REQUIRED' }),
    );
  });

  test('adds, updates, and removes delivery group recipients', async () => {
    await kit.configureDelivery();
    const checkout = await addDestination(kit, await physical(kit));
    const groupId = checkout.deliveryGroups[0]!.id;
    const added = kit.expectSuccess(
      await recipients(kit, 'checkoutDeliveryRecipientsAdd', checkout.id, {
        recipients: [{ deliveryGroupId: groupId, recipient: recipient('Ada') }],
      }),
    );
    expect(added.deliveryGroups[0]!.recipient).toMatchObject({ firstName: 'Ada' });
    const updated = kit.expectSuccess(
      await recipients(kit, 'checkoutDeliveryRecipientsUpdate', checkout.id, {
        updates: [{ deliveryGroupId: groupId, recipient: recipient('Grace') }],
      }),
    );
    expect(updated.deliveryGroups[0]!.recipient).toMatchObject({ firstName: 'Grace' });
    const removed = kit.expectSuccess(
      await recipients(kit, 'checkoutDeliveryRecipientsRemove', checkout.id, {
        deliveryGroupIds: [groupId],
      }),
    );
    expect(removed.deliveryGroups[0]!.recipient).toBeNull();
  });

  test('rejects duplicate address and unknown delivery-group updates', async () => {
    await kit.configureDelivery();
    const checkout = await addDestination(kit, await physical(kit));
    const addressId = checkout.deliveryGroups[0]!.deliveryAddress!.id!;
    const duplicate = await addresses(kit, 'checkoutDeliveryAddressesUpdate', checkout.id, {
      updates: [
        { addressId, address: address() },
        { addressId, address: address('Other') },
      ],
    });
    kit.expectUserError(duplicate, /DUPLICATE|DELIVERY|ADDRESS/);
    const unknown = await recipients(kit, 'checkoutDeliveryRecipientsUpdate', checkout.id, {
      updates: [{ deliveryGroupId: kit.id('CheckoutDeliveryGroup'), recipient: recipient() }],
    });
    kit.expectUserError(unknown, /DELIVERY|GROUP|NOT_FOUND/);
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('selects a manual shipping method through its opaque option handle', async () => {
    await kit.configureDelivery({ methodTypes: ['SHIPPING'] });
    const checkout = await addDestination(kit, await physical(kit));
    const after = await selectFirst(kit, checkout);
    expect(after.deliveryGroups[0]!.selection).toMatchObject({
      status: 'SELECTED',
      option: { deliveryMethodType: 'SHIPPING', cost: { amount: 500, currencyCode: 'USD' } },
    });
    expect(after.cost.totalShippingAmount.amount).toBe(500);
  });

  test('selects a local pickup method through its opaque option handle', async () => {
    await kit.configureDelivery({ methodTypes: ['PICK_UP'] });
    const after = await selectFirst(kit, await addDestination(kit, await physical(kit)));
    expect(after.deliveryGroups[0]!.selection.option).toMatchObject({
      deliveryMethodType: 'PICK_UP',
    });
  });

  test('selects a carrier App rate through Apps control plane', async () => {
    await kit.configureDelivery({ carrier: true });
    const checkout = await addDestination(kit, await physical(kit));
    const carrier = checkout.deliveryGroups[0]!.options.find(
      ({ carrierCode }) => carrierCode === 'test-fedex',
    );
    expect(carrier).toBeTruthy();
    const after = kit.expectSuccess(await select(kit, checkout, carrier!.handle));
    expect(after.deliveryGroups[0]!.selection.option).toMatchObject({ carrierCode: 'test-fedex' });
  });

  test('stores carrier customer input without exposing it publicly', async () => {
    await kit.configureDelivery({ carrier: true });
    const checkout = await addDestination(kit, await physical(kit));
    const carrier = checkout.deliveryGroups[0]!.options.find(
      ({ carrierCode }) => carrierCode === 'test-fedex',
    )!;
    const input = { pickupPointId: 'kyiv-42' };
    const after = kit.expectSuccess(await select(kit, checkout, carrier.handle, input));
    expect(after.deliveryGroups[0]!.selection.status).toBe('SELECTED');
    expect(JSON.stringify(after.deliveryGroups)).not.toContain('pickupPointId');
    expect(JSON.stringify(await kit.persistedSnapshot(after.id))).toContain('kyiv-42');
  });

  test('rejects an unknown or stale delivery option handle', async () => {
    await kit.configureDelivery();
    const checkout = await addDestination(kit, await physical(kit));
    for (const handle of [
      'unknown-handle',
      `${checkout.deliveryGroups[0]!.options[0]!.handle}-stale`,
    ]) {
      kit.expectUserError(await select(kit, checkout, handle), /DELIVERY|OPTION|HANDLE/);
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('resets a carrier selection when its provider capability becomes inactive', async () => {
    const { providerAccountId } = await kit.configureDelivery({ carrier: true });
    const addressed = await addDestination(kit, await physical(kit));
    const carrier = addressed.deliveryGroups[0]!.options.find(
      ({ carrierCode }) => carrierCode === 'test-fedex',
    )!;
    const selected = kit.expectSuccess(await select(kit, addressed, carrier.handle));
    await kit.sql`
      update delivery.provider_accounts
      set snapshot = jsonb_set(snapshot, '{capabilityStates,carrierService,status}', '"INACTIVE"'::jsonb)
      where id = ${providerAccountId}
    `;
    const recalculated = kit.expectSuccess(
      await kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
        checkoutId: selected.id,
        lines: [{ lineId: selected.lines[0]!.id, quantity: 2 }],
      }),
    );
    expect(recalculated.deliveryGroups[0]!.selection.status).toBe('RESET');
  });

  test('falls back to manual rates when the carrier capability boundary fails', async () => {
    await kit.configureDelivery({ carrier: true, failureMode: 'OMIT_PROVIDER_RATES' });
    const checkout = await physical(kit);
    const payload = await kit.withActionFault('apps.executeCapability', () =>
      addresses(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
        addresses: [{ checkoutLineIds: [checkout.lines[0]!.id], address: address() }],
      }),
    );
    const after = kit.expectSuccess(payload);
    expect(after.deliveryGroups[0]!.options).toEqual([
      expect.objectContaining({ carrierCode: null, deliveryMethodType: 'SHIPPING' }),
    ]);
    expect(after.issues).toContainEqual(
      expect.objectContaining({ code: expect.stringMatching(/DELIVERY|CARRIER/), retryable: true }),
    );
  });

  test('recalculates delivery options when line quantity changes', async () => {
    await kit.configureDelivery();
    const before = await addDestination(kit, await physical(kit));
    const after = kit.expectSuccess(
      await kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
        checkoutId: before.id,
        lines: [{ lineId: before.lines[0]!.id, quantity: 2 }],
      }),
    );
    expect(after.resultRevision).not.toBe(before.resultRevision);
    expect(after.deliveryGroups[0]!.options).not.toEqual([]);
  });

  test('partitions a mixed digital and physical multi-shipping cart into complete delivery groups', async () => {
    await kit.configureDelivery();
    const physicalVariants = await Promise.all([
      kit.variant({ requiresShipping: true }),
      kit.variant({ requiresShipping: true }),
    ]);
    const digital = await kit.variant();
    const checkout = await kit.created({
      items: [...physicalVariants, digital].map((purchasableId) => ({
        purchasableId,
        quantity: 1,
      })),
    });
    const after = kit.expectSuccess(
      await addresses(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
        addresses: checkout.lines.slice(0, 2).map((line, index) => ({
          checkoutLineIds: [line.id],
          address: address(`Street ${index}`),
        })),
      }),
    );
    expect(after.deliveryGroups).toHaveLength(2);
    expect(
      after.deliveryGroups.flatMap(({ checkoutLines }) => checkoutLines.map(({ id }) => id)),
    ).not.toContain(checkout.lines[2]!.id);
  });

  test('resets a selected delivery option with its previous handle and reason when it becomes ineligible', async () => {
    await kit.configureDelivery();
    const selected = await selectFirst(kit, await addDestination(kit, await physical(kit)));
    const previousOptionHandle = selected.deliveryGroups[0]!.selection.option!.handle;
    const after = kit.expectSuccess(
      await addresses(kit, 'checkoutDeliveryAddressesUpdate', selected.id, {
        updates: [
          {
            addressId: selected.deliveryGroups[0]!.deliveryAddress!.id,
            address: address('New', 'Paris', 'FR'),
          },
        ],
      }),
    );
    expect(after.deliveryGroups[0]!.selection).toMatchObject({
      status: 'RESET',
      previousOptionHandle,
      resetReason: { code: expect.any(String) },
    });
  });

  test('rejects invalid delivery customer input without changing an existing selection', async () => {
    await kit.configureDelivery();
    const selected = await selectFirst(kit, await addDestination(kit, await physical(kit)));
    const response = await kit.graphql<unknown>(
      `mutation InvalidDelivery($input: CheckoutDeliveryMethodUpdateInput!) {
        checkoutDeliveryMethodUpdate(input: $input) { checkout { id } userErrors { code } }
      }`,
      {
        input: {
          checkoutId: selected.id,
          deliveryGroupId: selected.deliveryGroups[0]!.id,
          optionHandle: selected.deliveryGroups[0]!.selection.option!.handle,
          customerInput: 'x'.repeat(1_100_000),
        },
      },
    );
    expect(response.errors).toBeTruthy();
    expect(await kit.read(selected.id)).toEqual(selected);
  });

  test('rejects malformed, wrong-type, and foreign address or delivery-group IDs atomically', async () => {
    await kit.configureDelivery();
    const checkout = await addDestination(kit, await physical(kit));
    const foreign = await addDestination(kit, await physical(kit));
    for (const addressId of [
      'bad-id',
      kit.id('ProductVariant'),
      foreign.deliveryGroups[0]!.deliveryAddress!.id!,
    ]) {
      const payload = await addresses(kit, 'checkoutDeliveryAddressesRemove', checkout.id, {
        addressIds: [addressId],
      });
      kit.expectUserError(payload, /GLOBAL_ID|DELIVERY|ADDRESS|NOT_FOUND/);
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('reports DELIVERY_OPTIONS_UNAVAILABLE when a physical group has no available options', async () => {
    await kit.configureDelivery({ methodTypes: [] });
    const checkout = await addDestination(kit, await physical(kit));
    expect(checkout.deliveryGroups[0]!.options).toEqual([]);
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ code: 'DELIVERY_OPTIONS_UNAVAILABLE' }),
    );
  });

  test('requires a recipient phone when the selected delivery option demands one', async () => {
    await kit.configureDelivery({ carrier: true, methodTypes: [] });
    const checkout = await addDestination(kit, await physical(kit));
    const option = checkout.deliveryGroups[0]!.options.find(({ phoneRequired }) => phoneRequired)!;
    expect(option).toBeTruthy();
    const selected = kit.expectSuccess(await select(kit, checkout, option.handle));
    expect(selected.deliveryGroups[0]!.recipient?.phone ?? null).toBeNull();
    expect(selected.valid).toBe(false);
  });

  test('projects every delivery method type with its canonical type', async () => {
    const types = ['SHIPPING', 'PICK_UP', 'PICKUP_POINT', 'LOCAL', 'RETAIL'] as const;
    await kit.configureDelivery({ methodTypes: [...types] });
    const checkout = await addDestination(kit, await physical(kit));
    expect(
      checkout.deliveryGroups[0]!.options.map(
        ({ deliveryMethodType }) => deliveryMethodType,
      ).sort(),
    ).toEqual([...types].sort());
  });
});

async function physical(kit: CheckoutStorefrontTestKit, count = 1): Promise<Checkout> {
  const variants = await Promise.all(
    Array.from({ length: count }, () => kit.variant({ requiresShipping: true })),
  );
  return kit.created({ items: variants.map((purchasableId) => ({ purchasableId, quantity: 1 })) });
}
function address(address1 = '1 Test Street', city = 'Kyiv', countryCode = 'UA') {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    address1,
    city,
    countryCode,
    provinceCode: '30',
    zip: '01001',
    phone: '+380501234567',
  };
}
function recipient(firstName = 'Ada') {
  return {
    firstName,
    lastName: 'Lovelace',
    email: 'recipient@example.test',
    phone: '+380501234567',
  };
}
async function addDestination(
  kit: CheckoutStorefrontTestKit,
  checkout: Checkout,
  lineIds = [checkout.lines[0]!.id],
) {
  return kit.expectSuccess(
    await addresses(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
      addresses: [{ checkoutLineIds: lineIds, address: address() }],
    }),
  );
}
function addresses(
  kit: CheckoutStorefrontTestKit,
  field: string,
  checkoutId: string,
  input: Record<string, unknown>,
) {
  const inputType = `${field[0]!.toUpperCase()}${field.slice(1)}Input`;
  return kit.mutation(field, inputType, { checkoutId, ...input });
}
function recipients(
  kit: CheckoutStorefrontTestKit,
  field: string,
  checkoutId: string,
  input: Record<string, unknown>,
) {
  const inputType = `${field[0]!.toUpperCase()}${field.slice(1)}Input`;
  return kit.mutation(field, inputType, { checkoutId, ...input });
}
function select(
  kit: CheckoutStorefrontTestKit,
  checkout: Checkout,
  optionHandle: string,
  customerInput?: unknown,
) {
  return kit.mutation('checkoutDeliveryMethodUpdate', 'CheckoutDeliveryMethodUpdateInput', {
    checkoutId: checkout.id,
    deliveryGroupId: checkout.deliveryGroups[0]!.id,
    optionHandle,
    customerInput,
  });
}
async function selectFirst(kit: CheckoutStorefrontTestKit, checkout: Checkout): Promise<Checkout> {
  return kit.expectSuccess(
    await select(kit, checkout, checkout.deliveryGroups[0]!.options[0]!.handle),
  );
}
