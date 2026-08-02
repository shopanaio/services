import { v7 as uuidv7 } from "uuid";
import { canonicalJsonSha256 } from "../pipeline/canonicalJson.js";
import { UseCase, type UseCaseDependencies } from "./useCase.js";
import type {
  CreateCheckoutInput,
  CheckoutLineCommand,
  CheckoutLineCreateCommand,
} from "../checkout/types.js";
import {
  addLines,
  invalidCheckoutMutation,
  type CheckoutCommittedSnapshot,
  type CheckoutCreateIdempotencyRequest,
  type CheckoutCreateIdempotencyReservation,
  type CheckoutMutationDraft,
} from "../mutations/index.js";

export interface CreateCheckoutUseCaseDependencies extends UseCaseDependencies {}

export class CreateCheckoutUseCase extends UseCase<
  CreateCheckoutInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CreateCheckoutInput): Promise<CheckoutCommittedSnapshot> {
    const { storefrontAccess, store, customer, user, ...business } = input;
    const context = { storefrontAccess, store, customer, user };
    const idempotencyKey = business.idempotencyKey.trim();
    const channelCode = business.channelCode.trim();
    if (!idempotencyKey || idempotencyKey.length > 256) {
      throw invalidCheckoutMutation("CHECKOUT_IDEMPOTENCY_KEY_INVALID", "Checkout idempotency key is invalid.");
    }
    if (!channelCode || channelCode.length > 128) {
      throw invalidCheckoutMutation("CHECKOUT_CHANNEL_INVALID", "Checkout channel code is invalid.");
    }
    const normalizedBusiness = { ...business, channelCode };
    const lineIds = flattenCommands(normalizedBusiness.items).map(() => uuidv7());
    const tagIds = (normalizedBusiness.tags ?? []).map(() => uuidv7());
    const reservation: CheckoutCreateIdempotencyRequest = {
      identity: {
        storeId: store.id,
        connectionId: storefrontAccess.connectionId,
        operation: "CHECKOUT_CREATE",
        idempotencyKey,
      },
      requestHash: canonicalJsonSha256({
        currencyCode: normalizedBusiness.currencyCode,
        channelCode: normalizedBusiness.channelCode,
        externalSource: normalizedBusiness.externalSource ?? null,
        externalId: normalizedBusiness.externalId ?? null,
        localeCode: normalizedBusiness.localeCode ?? null,
        buyerIdentity: customer
          ? {
              customerId: customer.id,
              email: customer.email || null,
              phone: customer.phone ?? null,
              firstName: customer.firstName || null,
              lastName: customer.lastName || null,
            }
          : null,
        tags: normalizedBusiness.tags ?? [],
        items: normalizedBusiness.items.map(withoutGeneratedIds),
      }),
      checkoutId: uuidv7(),
      initiatingCredentialId: storefrontAccess.credentialId,
      reservedIds: { lineIds, tagIds },
    };
    const committed = await this.checkoutMutationCoordinator.create({
      reservation,
      context: this.mutationContext(context),
      value: undefined,
      createDraft: (reserved) => createDraft(normalizedBusiness, reserved, customer),
    });
    return committed.checkout;
  }
}

function createDraft(
  business: Omit<CreateCheckoutInput, keyof import("@src/context/index.js").CheckoutContext>,
  reservation: CheckoutCreateIdempotencyReservation,
  customer: CreateCheckoutInput["customer"],
): CheckoutMutationDraft {
  const lineIds = reservation.reservedIds.lineIds;
  const tagIds = reservation.reservedIds.tagIds;
  if (!Array.isArray(lineIds) || !lineIds.every((id) => typeof id === "string")) {
    throw invalidCheckoutMutation("CHECKOUT_CREATE_RESERVATION_INVALID", "Reserved checkout line IDs are invalid.");
  }
  if (!Array.isArray(tagIds) || !tagIds.every((id) => typeof id === "string")) {
    throw invalidCheckoutMutation("CHECKOUT_CREATE_RESERVATION_INVALID", "Reserved checkout tag IDs are invalid.");
  }
  const tagSlugs = (business.tags ?? []).map(({ slug }) => slug);
  if (new Set(tagSlugs).size !== tagSlugs.length) {
    throw invalidCheckoutMutation("CHECKOUT_TAG_ALREADY_EXISTS", "Checkout tag slugs must be unique.");
  }
  let lineIndex = 0;
  const assignIds = (line: CheckoutLineCreateCommand): CheckoutLineCommand => ({
    ...line,
    lineId: lineIds[lineIndex++] as string,
    children: line.children?.map((child) => ({
      ...child,
      lineId: lineIds[lineIndex++] as string,
    })),
  });
  const draft: CheckoutMutationDraft = {
    checkoutId: reservation.checkoutId,
    storeId: reservation.identity.storeId,
    version: 0,
    currencyCode: business.currencyCode,
    localeCode: business.localeCode ?? null,
    channelCode: business.channelCode,
    externalSource: business.externalSource ?? null,
    externalId: business.externalId ?? null,
    buyerIdentity: customer
      ? {
          customerId: customer.id,
          email: customer.email || null,
          phone: customer.phone ?? null,
          countryCode: null,
          firstName: customer.firstName || null,
          middleName: null,
          lastName: customer.lastName || null,
          marketId: null,
          companyId: null,
          data: null,
        }
      : null,
    cartIntent: {
      lines: [],
      discountCodes: [],
      destinations: [],
      selectedDeliveryOptions: [],
      selectedPaymentMethod: null,
      attributes: {},
    },
    customerNote: null,
    tags: (business.tags ?? []).map((tag, index) => ({
      id: tagIds[index] as string,
      slug: tag.slug,
      isUnique: tag.isUnique,
    })),
    lineTagAssignments: [],
  };
  addLines(draft, business.items.map(assignIds));
  if (lineIndex !== lineIds.length) {
    throw invalidCheckoutMutation("CHECKOUT_CREATE_RESERVATION_INVALID", "Reserved checkout line IDs do not match the request.");
  }
  return draft;
}

function flattenCommands(lines: readonly CheckoutLineCreateCommand[]): unknown[] {
  return lines.flatMap((line) => [line, ...(line.children ?? [])]);
}

function withoutGeneratedIds(line: CheckoutLineCreateCommand) {
  return {
    variantId: line.variantId,
    quantity: line.quantity,
    purchase: line.purchase,
    attributes: line.attributes,
    tagSlug: line.tagSlug ?? null,
    children: line.children ?? [],
  };
}
