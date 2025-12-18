import {
  ApiCheckoutCreateInput,
  ApiCheckoutCustomerIdentityUpdateInput,
  ApiCheckoutCustomerNoteUpdateInput,
  ApiCheckoutDeliveryAddressesAddInput,
  ApiCheckoutDeliveryAddressesRemoveInput,
  ApiCheckoutDeliveryAddressesUpdateInput,
  ApiCheckoutDeliveryMethodUpdateInput,
  ApiCheckoutDeliveryRecipientsAddInput,
  ApiCheckoutDeliveryRecipientsRemoveInput,
  ApiCheckoutDeliveryRecipientsUpdateInput,
  ApiCheckoutLinesAddInput,
  ApiCheckoutLinesClearInput,
  ApiCheckoutLinesDeleteInput,
  ApiCheckoutLinesUpdateInput,
  ApiCheckoutPaymentMethodUpdateInput,
  ApiCheckoutPromoCodeAddInput,
  ApiCheckoutPromoCodeRemoveInput,
  ApiCheckoutTagCreateInput,
  ApiCheckoutTagDeleteInput,
  ApiCheckoutTagUpdateInput,
} from '@codegen/client-gql';
import { ClientApiFixture } from '@fixtures/client/api';

export class Checkout {
  constructor(private client: ClientApiFixture) {}

  async create(input: ApiCheckoutCreateInput) {
    return this.client.mutation('checkout/CheckoutCreate', {
      throwOnError: false,
      variables: { input },
    });
  }

  async read(id: string) {
    return this.client.query('checkout/CheckoutById', {
      variables: { id },
    });
  }

  async readFull(id: string) {
    return this.client.query('checkout/CheckoutByIdFull', {
      variables: { id },
    });
  }

  async addLines(input: ApiCheckoutLinesAddInput) {
    return this.client.mutation('checkout/CheckoutLinesAdd', {
      variables: { input },
    });
  }

  async updateLines(input: ApiCheckoutLinesUpdateInput) {
    return this.client.mutation('checkout/CheckoutLinesUpdate', {
      variables: { input },
    });
  }

  async deleteLines(input: ApiCheckoutLinesDeleteInput) {
    return this.client.mutation('checkout/CheckoutLinesDelete', {
      variables: { input },
    });
  }

  async clearLines(input: ApiCheckoutLinesClearInput) {
    return this.client.mutation('checkout/CheckoutLinesClear', {
      variables: { input },
    });
  }

  async addPromoCode(input: ApiCheckoutPromoCodeAddInput) {
    return this.client.mutation('checkout/CheckoutPromoCodeAdd', {
      variables: { input },
    });
  }

  async removePromoCode(input: ApiCheckoutPromoCodeRemoveInput) {
    return this.client.mutation('checkout/CheckoutPromoCodeRemove', {
      variables: { input },
    });
  }

  async updateCustomerIdentity(input: ApiCheckoutCustomerIdentityUpdateInput) {
    return this.client.mutation('checkout/CheckoutCustomerIdentityUpdate', {
      variables: { input },
    });
  }

  async updateCustomerNote(input: ApiCheckoutCustomerNoteUpdateInput) {
    return this.client.mutation('checkout/CheckoutCustomerNoteUpdate', {
      variables: { input },
    });
  }

  async updateDeliveryMethod(input: ApiCheckoutDeliveryMethodUpdateInput) {
    return this.client.mutation('checkout/CheckoutDeliveryMethodUpdate', {
      variables: { input },
    });
  }

  async addDeliveryAddresses(input: ApiCheckoutDeliveryAddressesAddInput) {
    return this.client.mutation('checkout/CheckoutDeliveryAddressesAdd', {
      variables: { input },
    });
  }

  async updateDeliveryAddresses(input: ApiCheckoutDeliveryAddressesUpdateInput) {
    return this.client.mutation('checkout/CheckoutDeliveryAddressesUpdate', {
      variables: { input },
    });
  }

  async removeDeliveryAddresses(input: ApiCheckoutDeliveryAddressesRemoveInput) {
    return this.client.mutation('checkout/CheckoutDeliveryAddressesRemove', {
      variables: { input },
    });
  }

  async addDeliveryRecipients(input: ApiCheckoutDeliveryRecipientsAddInput) {
    return this.client.mutation('checkout/CheckoutDeliveryRecipientsAdd', {
      variables: { input },
    });
  }

  async updateDeliveryRecipients(input: ApiCheckoutDeliveryRecipientsUpdateInput) {
    return this.client.mutation('checkout/CheckoutDeliveryRecipientsUpdate', {
      variables: { input },
    });
  }

  async removeDeliveryRecipients(input: ApiCheckoutDeliveryRecipientsRemoveInput) {
    return this.client.mutation('checkout/CheckoutDeliveryRecipientsRemove', {
      variables: { input },
    });
  }

  async updatePaymentMethod(input: ApiCheckoutPaymentMethodUpdateInput) {
    return this.client.mutation('checkout/CheckoutPaymentMethodUpdate', {
      variables: { input },
    });
  }

  async createTag(input: ApiCheckoutTagCreateInput) {
    return this.client.mutation('checkout/CheckoutTagCreate', {
      throwOnError: false,
      variables: { input },
    });
  }

  async updateTag(input: ApiCheckoutTagUpdateInput) {
    return this.client.mutation('checkout/CheckoutTagUpdate', {
      throwOnError: false,
      variables: { input },
    });
  }

  async deleteTag(input: ApiCheckoutTagDeleteInput) {
    return this.client.mutation('checkout/CheckoutTagDelete', {
      variables: { input },
    });
  }

  /**
   * Add lines with children (bundles) support.
   * Uses extended query that returns originalPrice, priceConfig, and children.
   */
  async addLinesWithChildren(input: CheckoutLinesAddWithChildrenInput) {
    return this.client.mutation('checkout/CheckoutLinesAddWithChildren', {
      throwOnError: false,
      variables: { input },
    });
  }

  /**
   * Read checkout with children (bundles) support.
   * Returns originalPrice, priceConfig, and children for each line.
   */
  async readWithChildren(id: string) {
    return this.client.query('checkout/CheckoutByIdWithChildren', {
      variables: { id },
    });
  }
}

// Types for children/bundles support (until codegen is regenerated)
// Note: ChildPriceType is returned from the server (from ProductGroup config in DB),
// it is NOT sent by the client.
export type ChildPriceType =
  | 'FREE'
  | 'BASE'
  | 'DISCOUNT_AMOUNT'
  | 'DISCOUNT_PERCENT'
  | 'MARKUP_AMOUNT'
  | 'MARKUP_PERCENT'
  | 'OVERRIDE';

// Child line input - price config comes from ProductGroup in DB, not from client
export type CheckoutChildLineInput = {
  quantity: number;
  purchasableId: string;
  purchasableSnapshot?: {
    sku?: string;
    title: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
  };
};

export type CheckoutLineAddWithChildrenInput = {
  quantity: number;
  purchasableId: string;
  purchasableSnapshot?: {
    sku?: string;
    title: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
  };
  tagSlug?: string;
  children?: CheckoutChildLineInput[];
};

export type CheckoutLinesAddWithChildrenInput = {
  checkoutId: string;
  lines: CheckoutLineAddWithChildrenInput[];
};
