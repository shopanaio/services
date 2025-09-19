import {
  CheckoutEventTypes,
  CheckoutEventsContractVersion,
  type CheckoutEvent,
} from "./events";
import type { CheckoutCommand } from "./commands";
import type { CheckoutState } from "./evolve";

export const checkoutDecide = (
  command: CheckoutCommand,
  state: CheckoutState,
): CheckoutEvent | CheckoutEvent[] => {
  // Basic existence check
  if (command.type !== "checkout.create" && !state.exists) {
    throw new Error("Checkout does not exist");
  }

  switch (command.type) {
    case "checkout.create": {
      return [
        {
          type: CheckoutEventTypes.CheckoutCreated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.lines.add": {
      return [
        {
          type: CheckoutEventTypes.CheckoutLinesAdded,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.lines.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutLinesUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.lines.delete": {
      return [
        {
          type: CheckoutEventTypes.CheckoutLinesDeleted,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.lines.clear": {
      return [
        {
          type: CheckoutEventTypes.CheckoutLinesCleared,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.customer.identity.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutCustomerIdentityUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.customer.note.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutCustomerNoteUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.language.code.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutLanguageCodeUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.currency.code.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutCurrencyCodeUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.promo.code.add": {
      return [
        {
          type: CheckoutEventTypes.CheckoutPromoCodeAdded,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.promo.code.remove": {
      return [
        {
          type: CheckoutEventTypes.CheckoutPromoCodeRemoved,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.delivery.group.address.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutDeliveryGroupAddressUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.delivery.group.method.update": {
      return [
        {
          type: CheckoutEventTypes.CheckoutDeliveryGroupMethodUpdated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    case "checkout.delivery.group.address.clear": {
      return [
        {
          type: CheckoutEventTypes.CheckoutDeliveryGroupAddressCleared,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: CheckoutEventsContractVersion,
          },
        },
      ];
    }
    default:
      return [];
  }
};
