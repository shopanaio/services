import type {
  CreateCommandType,
  DefaultCommandMetadata,
} from "@event-driven-io/emmett";
import {
  DeliveryMethodType,
  ShippingMethod,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-kit";
import { Money } from "@shopana/money";
import type {
  CheckoutLinesAdded,
  CheckoutLinesUpdated,
  CheckoutLinesDeleted,
  CheckoutLinesCleared,
  CheckoutPromoCodeAdded,
  CheckoutPromoCodeRemoved,
  CheckoutCustomerIdentityUpdated,
  CheckoutCustomerNoteUpdated,
  CheckoutLanguageCodeUpdated,
  CheckoutCurrencyCodeUpdated,
  CheckoutDeliveryGroupAddressUpdated,
  CheckoutDeliveryGroupAddressCleared,
  CheckoutDeliveryGroupMethodUpdated,
} from "./events";

export type CheckoutCommandMetadata = DefaultCommandMetadata & {
  apiKey: string;
  aggregateId: string;
  contractVersion: number;
  projectId: string;
  userId?: string;
  now: Date;
};

export const CheckoutCommandTypes = {
  Create: "checkout.create",
  AddLines: "checkout.lines.add",
  UpdateLines: "checkout.lines.update",
  DeleteLines: "checkout.lines.delete",
  ClearLines: "checkout.lines.clear",
  // New commands for extended functionality
  UpdateCustomerIdentity: "checkout.customer.identity.update",
  UpdateCustomerNote: "checkout.customer.note.update",
  UpdateLanguageCode: "checkout.language.code.update",
  UpdateCurrencyCode: "checkout.currency.code.update",
  AddPromoCode: "checkout.promo.code.add",
  RemovePromoCode: "checkout.promo.code.remove",
  // Delivery Groups commands
  UpdateDeliveryGroupAddress: "checkout.delivery.group.address.update",
  UpdateDeliveryGroupMethod: "checkout.delivery.group.method.update",
  ClearDeliveryGroupAddress: "checkout.delivery.group.address.clear",
} as const;

export type CreateCheckoutCommand = CreateCommandType<
  typeof CheckoutCommandTypes.Create,
  {
    currencyCode: string;
    idempotencyKey: string;
    salesChannel: string;
    externalSource: string | null;
    displayCurrencyCode: string | null;
    displayExchangeRate: number | null;
    externalId: string | null;
    localeCode: string | null;
    deliveryGroups: Array<{
      id: string;
      deliveryMethods: Array<{
        code: string;
        provider: string;
        deliveryMethodType: DeliveryMethodType;
        shippingPaymentModel: ShippingPaymentModel;
      }>;
    }>;
  },
  CheckoutCommandMetadata
>;

export type AddCheckoutLinesCommand = CreateCommandType<
  typeof CheckoutCommandTypes.AddLines,
  CheckoutLinesAdded["data"],
  CheckoutCommandMetadata
>;

export type UpdateCheckoutLinesCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateLines,
  CheckoutLinesUpdated["data"],
  CheckoutCommandMetadata
>;

export type DeleteCheckoutLinesCommand = CreateCommandType<
  typeof CheckoutCommandTypes.DeleteLines,
  CheckoutLinesDeleted["data"],
  CheckoutCommandMetadata
>;

export type ClearCheckoutLinesCommand = CreateCommandType<
  typeof CheckoutCommandTypes.ClearLines,
  CheckoutLinesCleared["data"],
  CheckoutCommandMetadata
>;

// New commands for extended functionality
export type UpdateCustomerIdentityCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateCustomerIdentity,
  CheckoutCustomerIdentityUpdated["data"],
  CheckoutCommandMetadata
>;

export type UpdateCustomerNoteCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateCustomerNote,
  CheckoutCustomerNoteUpdated["data"],
  CheckoutCommandMetadata
>;

export type UpdateLanguageCodeCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateLanguageCode,
  CheckoutLanguageCodeUpdated["data"],
  CheckoutCommandMetadata
>;

export type UpdateCurrencyCodeCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateCurrencyCode,
  CheckoutCurrencyCodeUpdated["data"],
  CheckoutCommandMetadata
>;

// Removed: UpdateDeliveryMethodCommand (use group-level method update)

export type AddPromoCodeCommand = CreateCommandType<
  typeof CheckoutCommandTypes.AddPromoCode,
  CheckoutPromoCodeAdded["data"],
  CheckoutCommandMetadata
>;

export type RemovePromoCodeCommand = CreateCommandType<
  typeof CheckoutCommandTypes.RemovePromoCode,
  CheckoutPromoCodeRemoved["data"],
  CheckoutCommandMetadata
>;

// Delivery Groups commands
// removed: CreateDeliveryGroupsCommand — groups embedded into checkout.create

export type UpdateDeliveryGroupAddressCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateDeliveryGroupAddress,
  CheckoutDeliveryGroupAddressUpdated["data"],
  CheckoutCommandMetadata
>;

export type UpdateDeliveryGroupMethodCommand = CreateCommandType<
  typeof CheckoutCommandTypes.UpdateDeliveryGroupMethod,
  CheckoutDeliveryGroupMethodUpdated["data"],
  CheckoutCommandMetadata
>;

export type ClearDeliveryGroupAddressCommand = CreateCommandType<
  typeof CheckoutCommandTypes.ClearDeliveryGroupAddress,
  CheckoutDeliveryGroupAddressCleared["data"],
  CheckoutCommandMetadata
>;

export type CheckoutCommand =
  | CreateCheckoutCommand
  | AddCheckoutLinesCommand
  | UpdateCheckoutLinesCommand
  | DeleteCheckoutLinesCommand
  | ClearCheckoutLinesCommand
  | UpdateCustomerIdentityCommand
  | UpdateCustomerNoteCommand
  | UpdateLanguageCodeCommand
  | UpdateCurrencyCodeCommand
  | AddPromoCodeCommand
  | RemovePromoCodeCommand
  | UpdateDeliveryGroupAddressCommand
  | UpdateDeliveryGroupMethodCommand
  | ClearDeliveryGroupAddressCommand;
