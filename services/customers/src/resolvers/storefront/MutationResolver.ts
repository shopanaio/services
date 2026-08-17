import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { hashContent } from "@shopana/shared-kernel";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  CustomerComparisonCategoryClearWorkflowInput,
  CustomerComparisonCategoryClearWorkflowResult,
  CustomerComparisonVariantAddWorkflowInput,
  CustomerComparisonVariantAddWorkflowResult,
  CustomerComparisonVariantRemoveWorkflowInput,
  CustomerComparisonVariantRemoveWorkflowResult,
  WishlistCreateWorkflowInput,
  WishlistCreateWorkflowResult,
  WishlistDeleteWorkflowInput,
  WishlistDeleteWorkflowResult,
  WishlistProductAddWorkflowInput,
  WishlistProductAddWorkflowResult,
  WishlistProductRemoveWorkflowInput,
  WishlistProductRemoveWorkflowResult,
  WishlistUpdateWorkflowInput,
  WishlistUpdateWorkflowResult,
  StorefrontCustomerAddressCreateWorkflowInput,
  StorefrontCustomerAddressCreateWorkflowResult,
  StorefrontCustomerAddressDefaultSetWorkflowInput,
  StorefrontCustomerAddressDefaultSetWorkflowResult,
  StorefrontCustomerAddressDeleteWorkflowInput,
  StorefrontCustomerAddressDeleteWorkflowResult,
  StorefrontCustomerAddressUpdateWorkflowInput,
  StorefrontCustomerAddressUpdateWorkflowResult,
  StorefrontCustomerDataRequestCancelWorkflowInput,
  StorefrontCustomerDataRequestCancelWorkflowResult,
  StorefrontCustomerDataRequestCreateWorkflowInput,
  StorefrontCustomerDataRequestCreateWorkflowResult,
  StorefrontCustomerMarketingConsentUpdateWorkflowInput,
  StorefrontCustomerMarketingConsentUpdateWorkflowResult,
  StorefrontCustomerTaxIdentifierCreateWorkflowInput,
  StorefrontCustomerTaxIdentifierCreateWorkflowResult,
  StorefrontCustomerTaxIdentifierDeleteWorkflowInput,
  StorefrontCustomerTaxIdentifierDeleteWorkflowResult,
  StorefrontCustomerTaxIdentifierUpdateWorkflowInput,
  StorefrontCustomerTaxIdentifierUpdateWorkflowResult,
  StorefrontCustomerUpdateWorkflowInput,
  StorefrontCustomerUpdateWorkflowResult,
  StorefrontCustomerWorkflowContext,
} from "../../workflows/dto/index.js";
import {
  CustomerAddressCreateInputSchema,
  CustomerAddressDefaultSetInputSchema,
  CustomerAddressDeleteInputSchema,
  CustomerAddressUpdateInputSchema,
  CustomerComparisonCategoryClearInputSchema,
  CustomerComparisonVariantAddInputSchema,
  CustomerComparisonVariantRemoveInputSchema,
  CustomerDataRequestCancelInputSchema,
  CustomerDataRequestCreateInputSchema,
  CustomerMarketingConsentUpdateInputSchema,
  CustomerTaxIdentifierCreateInputSchema,
  CustomerTaxIdentifierDeleteInputSchema,
  CustomerTaxIdentifierUpdateInputSchema,
  CustomerUpdateInputSchema,
  WishlistCreateInputSchema,
  WishlistDeleteInputSchema,
  WishlistProductAddInputSchema,
  WishlistProductRemoveInputSchema,
  WishlistUpdateInputSchema,
} from "./generated/schemas.js";
import type {
  CustomerAddressInput,
  CustomerUpdateInput,
  MutationCustomerAddressCreateArgs,
  MutationCustomerAddressDefaultSetArgs,
  MutationCustomerAddressDeleteArgs,
  MutationCustomerAddressUpdateArgs,
  MutationCustomerComparisonCategoryClearArgs,
  MutationCustomerComparisonVariantAddArgs,
  MutationCustomerComparisonVariantRemoveArgs,
  MutationCustomerDataRequestCancelArgs,
  MutationCustomerDataRequestCreateArgs,
  MutationCustomerMarketingConsentUpdateArgs,
  MutationCustomerTaxIdentifierCreateArgs,
  MutationCustomerTaxIdentifierDeleteArgs,
  MutationCustomerTaxIdentifierUpdateArgs,
  MutationCustomerUpdateArgs,
  MutationWishlistCreateArgs,
  MutationWishlistDeleteArgs,
  MutationWishlistProductAddArgs,
  MutationWishlistProductRemoveArgs,
  MutationWishlistUpdateArgs,
} from "./generated/types.js";
import { StorefrontCustomersType } from "./StorefrontCustomersType.js";

type StorefrontUserError = {
  code: string;
  message: string;
  field?: string[];
  retryable: boolean;
};

@ApolloMutation
export class MutationResolver extends StorefrontCustomersType<Record<string, never>> {
  @ZodResolver(CustomerUpdateInputSchema())
  async customerUpdate(args: MutationCustomerUpdateArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { customer: null, userErrors: preflight.userErrors };
    }
    const input: StorefrontCustomerUpdateWorkflowInput = {
      params: {
        expectedRevision: args.input.expectedRevision,
        patch: mapCustomerProfilePatch(args.input),
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerUpdateWorkflowResult,
      StorefrontCustomerUpdateWorkflowInput
    >("storefrontCustomerUpdate", preflight.idempotencyKey, input);
    if (!result.ok) return { customer: null, userErrors: result.userErrors };

    this.$ctx.loaders.customer.clear(preflight.context.customerId);
    return {
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerAddressCreateInputSchema())
  async customerAddressCreate(args: MutationCustomerAddressCreateArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        customerAddress: null,
        customer: null,
        userErrors: preflight.userErrors,
      };
    }
    const input: StorefrontCustomerAddressCreateWorkflowInput = {
      params: {
        address: mapAddressInput(args.input.address),
        defaultShipping: args.input.defaultShipping,
        defaultBilling: args.input.defaultBilling,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerAddressCreateWorkflowResult,
      StorefrontCustomerAddressCreateWorkflowInput
    >("storefrontCustomerAddressCreate", preflight.idempotencyKey, input);
    if (!result.ok) return failedAddressPayload(result.userErrors);

    this.clearAddressLoaders(preflight.context.customerId);
    return {
      customerAddress: result.value.customerAddress
        ? await this.resolvers.address(result.value.customerAddress.id)
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerAddressUpdateInputSchema())
  async customerAddressUpdate(args: MutationCustomerAddressUpdateArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) return failedAddressPayload(preflight.userErrors);
    const addressId = safeDecode(
      args.input.addressId,
      GlobalIdEntity.CustomerAddress,
    );
    if (!addressId) return failedAddressPayload([invalidId(["addressId"])]);
    const input: StorefrontCustomerAddressUpdateWorkflowInput = {
      params: {
        addressId,
        address: mapAddressInput(args.input.address),
        defaultShipping: args.input.defaultShipping,
        defaultBilling: args.input.defaultBilling,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerAddressUpdateWorkflowResult,
      StorefrontCustomerAddressUpdateWorkflowInput
    >("storefrontCustomerAddressUpdate", preflight.idempotencyKey, input);
    if (!result.ok) return failedAddressPayload(result.userErrors);

    this.clearAddressLoaders(preflight.context.customerId);
    return {
      customerAddress: result.value.customerAddress
        ? await this.resolvers.address(result.value.customerAddress.id)
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerAddressDeleteInputSchema())
  async customerAddressDelete(args: MutationCustomerAddressDeleteArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        deletedAddressId: null,
        customer: null,
        userErrors: preflight.userErrors,
      };
    }
    const addressId = safeDecode(
      args.input.addressId,
      GlobalIdEntity.CustomerAddress,
    );
    if (!addressId) {
      return {
        deletedAddressId: null,
        customer: null,
        userErrors: [invalidId(["addressId"])],
      };
    }
    const input: StorefrontCustomerAddressDeleteWorkflowInput = {
      params: { addressId, expectedRevision: args.input.expectedRevision },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerAddressDeleteWorkflowResult,
      StorefrontCustomerAddressDeleteWorkflowInput
    >("storefrontCustomerAddressDelete", preflight.idempotencyKey, input);
    if (!result.ok) {
      return {
        deletedAddressId: null,
        customer: null,
        userErrors: result.userErrors,
      };
    }
    this.clearAddressLoaders(preflight.context.customerId);
    return {
      deletedAddressId: result.value.deletedAddressId
        ? this.encodeId(result.value.deletedAddressId, GlobalIdEntity.CustomerAddress)
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerAddressDefaultSetInputSchema())
  async customerAddressDefaultSet(
    args: MutationCustomerAddressDefaultSetArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { customer: null, userErrors: preflight.userErrors };
    }
    const addressId = args.input.addressId
      ? safeDecode(args.input.addressId, GlobalIdEntity.CustomerAddress)
      : null;
    if (args.input.addressId && !addressId) {
      return { customer: null, userErrors: [invalidId(["addressId"])] };
    }
    const input: StorefrontCustomerAddressDefaultSetWorkflowInput = {
      params: {
        addressId,
        defaults:
          args.input.defaults as StorefrontCustomerAddressDefaultSetWorkflowInput["params"]["defaults"],
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerAddressDefaultSetWorkflowResult,
      StorefrontCustomerAddressDefaultSetWorkflowInput
    >("storefrontCustomerAddressDefaultSet", preflight.idempotencyKey, input);
    if (!result.ok) return { customer: null, userErrors: result.userErrors };
    this.clearAddressLoaders(preflight.context.customerId);
    return {
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerMarketingConsentUpdateInputSchema())
  async customerMarketingConsentUpdate(
    args: MutationCustomerMarketingConsentUpdateArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        marketingConsent: null,
        customer: null,
        userErrors: preflight.userErrors,
      };
    }
    const input: StorefrontCustomerMarketingConsentUpdateWorkflowInput = {
      params: {
        channel:
          args.input.channel as StorefrontCustomerMarketingConsentUpdateWorkflowInput["params"]["channel"],
        state:
          args.input.state as StorefrontCustomerMarketingConsentUpdateWorkflowInput["params"]["state"],
        expectedRevision: args.input.expectedRevision,
        idempotencyKey: preflight.idempotencyKey,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerMarketingConsentUpdateWorkflowResult,
      StorefrontCustomerMarketingConsentUpdateWorkflowInput
    >("storefrontCustomerMarketingConsentUpdate", preflight.idempotencyKey, input);
    if (!result.ok) {
      return {
        marketingConsent: null,
        customer: null,
        userErrors: result.userErrors,
      };
    }
    this.$ctx.loaders.customer.clear(preflight.context.customerId);
    this.$ctx.loaders.consentsByCustomer.clear(preflight.context.customerId);
    if (result.value.marketingConsent) {
      this.$ctx.loaders.consent.clear(result.value.marketingConsent.id);
    }
    return {
      marketingConsent: result.value.marketingConsent
        ? await this.resolvers.consent(result.value.marketingConsent.id)
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerDataRequestCreateInputSchema())
  async customerDataRequestCreate(args: MutationCustomerDataRequestCreateArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { dataRequest: null, userErrors: preflight.userErrors };
    }
    const input: StorefrontCustomerDataRequestCreateWorkflowInput = {
      params: {
        type:
          args.input.type as StorefrontCustomerDataRequestCreateWorkflowInput["params"]["type"],
        correctionDetails:
          args.input.correctionDetails as StorefrontCustomerDataRequestCreateWorkflowInput["params"]["correctionDetails"],
        idempotencyKey: preflight.idempotencyKey,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerDataRequestCreateWorkflowResult,
      StorefrontCustomerDataRequestCreateWorkflowInput
    >("storefrontCustomerDataRequestCreate", preflight.idempotencyKey, input);
    if (!result.ok) return { dataRequest: null, userErrors: result.userErrors };
    if (result.value.dataRequest) {
      this.$ctx.loaders.customerDataRequest.clear(result.value.dataRequest.id);
    }
    return {
      dataRequest: result.value.dataRequest
        ? await this.resolvers.dataRequest(result.value.dataRequest.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerDataRequestCancelInputSchema())
  async customerDataRequestCancel(args: MutationCustomerDataRequestCancelArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { dataRequest: null, userErrors: preflight.userErrors };
    }
    const dataRequestId = safeDecode(
      args.input.dataRequestId,
      GlobalIdEntity.CustomerDataRequest,
    );
    if (!dataRequestId) {
      return { dataRequest: null, userErrors: [invalidId(["dataRequestId"])] };
    }
    const input: StorefrontCustomerDataRequestCancelWorkflowInput = {
      params: {
        dataRequestId,
        expectedUpdatedAt: args.input.expectedUpdatedAt,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerDataRequestCancelWorkflowResult,
      StorefrontCustomerDataRequestCancelWorkflowInput
    >("storefrontCustomerDataRequestCancel", preflight.idempotencyKey, input);
    if (!result.ok) return { dataRequest: null, userErrors: result.userErrors };
    this.$ctx.loaders.customerDataRequest.clear(dataRequestId);
    return {
      dataRequest: result.value.dataRequest
        ? await this.resolvers.dataRequest(result.value.dataRequest.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerTaxIdentifierCreateInputSchema())
  async customerTaxIdentifierCreate(
    args: MutationCustomerTaxIdentifierCreateArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) return failedTaxPayload(preflight.userErrors);
    const input: StorefrontCustomerTaxIdentifierCreateWorkflowInput = {
      params: {
        identifierType: args.input.identifierType,
        countryCode: args.input.countryCode,
        value: args.input.value,
        isPrimary: args.input.isPrimary,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerTaxIdentifierCreateWorkflowResult,
      StorefrontCustomerTaxIdentifierCreateWorkflowInput
    >("storefrontCustomerTaxIdentifierCreate", preflight.idempotencyKey, input);
    if (!result.ok) return failedTaxPayload(result.userErrors);
    this.clearTaxLoaders(preflight.context.customerId);
    return {
      taxIdentifier: result.value.taxIdentifier
        ? await this.resolvers.taxIdentifier(result.value.taxIdentifier.id)
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerTaxIdentifierUpdateInputSchema())
  async customerTaxIdentifierUpdate(
    args: MutationCustomerTaxIdentifierUpdateArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) return failedTaxPayload(preflight.userErrors);
    const taxIdentifierId = safeDecode(
      args.input.taxIdentifierId,
      GlobalIdEntity.CustomerTaxIdentifier,
    );
    if (!taxIdentifierId) {
      return failedTaxPayload([invalidId(["taxIdentifierId"])]);
    }
    const input: StorefrontCustomerTaxIdentifierUpdateWorkflowInput = {
      params: {
        taxIdentifierId,
        identifierType: args.input.identifierType,
        countryCode: args.input.countryCode,
        value: args.input.value,
        isPrimary: args.input.isPrimary,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerTaxIdentifierUpdateWorkflowResult,
      StorefrontCustomerTaxIdentifierUpdateWorkflowInput
    >("storefrontCustomerTaxIdentifierUpdate", preflight.idempotencyKey, input);
    if (!result.ok) return failedTaxPayload(result.userErrors);
    this.clearTaxLoaders(preflight.context.customerId);
    return {
      taxIdentifier: result.value.taxIdentifier
        ? await this.resolvers.taxIdentifier(result.value.taxIdentifier.id)
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerTaxIdentifierDeleteInputSchema())
  async customerTaxIdentifierDelete(
    args: MutationCustomerTaxIdentifierDeleteArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        deletedTaxIdentifierId: null,
        customer: null,
        userErrors: preflight.userErrors,
      };
    }
    const taxIdentifierId = safeDecode(
      args.input.taxIdentifierId,
      GlobalIdEntity.CustomerTaxIdentifier,
    );
    if (!taxIdentifierId) {
      return {
        deletedTaxIdentifierId: null,
        customer: null,
        userErrors: [invalidId(["taxIdentifierId"])],
      };
    }
    const input: StorefrontCustomerTaxIdentifierDeleteWorkflowInput = {
      params: {
        taxIdentifierId,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    const result = await this.runSelfServiceWorkflow<
      StorefrontCustomerTaxIdentifierDeleteWorkflowResult,
      StorefrontCustomerTaxIdentifierDeleteWorkflowInput
    >("storefrontCustomerTaxIdentifierDelete", preflight.idempotencyKey, input);
    if (!result.ok) {
      return {
        deletedTaxIdentifierId: null,
        customer: null,
        userErrors: result.userErrors,
      };
    }
    this.clearTaxLoaders(preflight.context.customerId);
    return {
      deletedTaxIdentifierId: result.value.deletedTaxIdentifierId
        ? this.encodeId(
            result.value.deletedTaxIdentifierId,
            GlobalIdEntity.CustomerTaxIdentifier,
          )
        : null,
      customer: result.value.customer
        ? await this.resolvers.customer(result.value.customer.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(WishlistCreateInputSchema())
  async wishlistCreate(args: MutationWishlistCreateArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { wishlist: null, userErrors: preflight.userErrors };
    }
    const input: WishlistCreateWorkflowInput = {
      params: { name: args.input.name },
      context: preflight.context,
    };
    const result = await this.runWishlistWorkflow<
      WishlistCreateWorkflowResult,
      WishlistCreateWorkflowInput
    >("wishlistCreate", preflight.idempotencyKey, input);
    if (!result.ok) return { wishlist: null, userErrors: result.userErrors };

    if (result.value.wishlist) {
      this.$ctx.loaders.defaultWishlist.clear(preflight.context.customerId);
      this.$ctx.loaders.wishlist.clear(result.value.wishlist.id);
    }
    return {
      wishlist: result.value.wishlist
        ? await this.resolvers.wishlist(result.value.wishlist.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(WishlistUpdateInputSchema())
  async wishlistUpdate(args: MutationWishlistUpdateArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { wishlist: null, userErrors: preflight.userErrors };
    }
    const wishlistId = safeDecode(
      args.input.id,
      GlobalIdEntity.CustomerWishlist,
    );
    if (!wishlistId) {
      return {
        wishlist: null,
        userErrors: [invalidId(["id"])],
      };
    }
    const input: WishlistUpdateWorkflowInput = {
      params: {
        wishlistId,
        name: args.input.name,
        expectedUpdatedAt: args.input.expectedUpdatedAt,
      },
      context: preflight.context,
    };
    const result = await this.runWishlistWorkflow<
      WishlistUpdateWorkflowResult,
      WishlistUpdateWorkflowInput
    >("wishlistUpdate", preflight.idempotencyKey, input);
    if (!result.ok) return { wishlist: null, userErrors: result.userErrors };

    this.$ctx.loaders.wishlist.clear(wishlistId);
    return {
      wishlist: result.value.wishlist
        ? await this.resolvers.wishlist(result.value.wishlist.id)
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(WishlistDeleteInputSchema())
  async wishlistDelete(args: MutationWishlistDeleteArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { deletedWishlistId: null, userErrors: preflight.userErrors };
    }
    const wishlistId = safeDecode(
      args.input.id,
      GlobalIdEntity.CustomerWishlist,
    );
    if (!wishlistId) {
      return {
        deletedWishlistId: null,
        userErrors: [invalidId(["id"])],
      };
    }
    const input: WishlistDeleteWorkflowInput = {
      params: {
        wishlistId,
        expectedUpdatedAt: args.input.expectedUpdatedAt,
      },
      context: preflight.context,
    };
    const result = await this.runWishlistWorkflow<
      WishlistDeleteWorkflowResult,
      WishlistDeleteWorkflowInput
    >("wishlistDelete", preflight.idempotencyKey, input);
    if (!result.ok) {
      return { deletedWishlistId: null, userErrors: result.userErrors };
    }

    if (result.value.deletedWishlistId) {
      this.$ctx.loaders.wishlist.clear(result.value.deletedWishlistId);
    }
    return {
      deletedWishlistId: result.value.deletedWishlistId
        ? this.encodeId(
            result.value.deletedWishlistId,
            GlobalIdEntity.CustomerWishlist,
          )
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(WishlistProductAddInputSchema())
  async wishlistProductAdd(args: MutationWishlistProductAddArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return { wishlistItem: null, userErrors: preflight.userErrors };
    }
    const productId = safeDecode(args.input.productId, GlobalIdEntity.Product);
    const rawWishlistId = args.input.wishlistId;
    const hasWishlistId = rawWishlistId != null;
    const wishlistId = rawWishlistId != null
      ? safeDecode(rawWishlistId, GlobalIdEntity.CustomerWishlist)
      : undefined;
    const idErrors = [
      ...(!productId ? [invalidId(["productId"])] : []),
      ...(hasWishlistId && !wishlistId
        ? [invalidId(["wishlistId"])]
        : []),
    ];
    if (!productId || idErrors.length > 0) {
      return { wishlistItem: null, userErrors: idErrors };
    }
    const input: WishlistProductAddWorkflowInput = {
      params: { productId, wishlistId },
      context: preflight.context,
    };
    const result = await this.runWishlistWorkflow<
      WishlistProductAddWorkflowResult,
      WishlistProductAddWorkflowInput
    >("wishlistProductAdd", preflight.idempotencyKey, input);
    if (!result.ok) return { wishlistItem: null, userErrors: result.userErrors };

    const item = result.value.wishlistItem;
    if (item) {
      this.$ctx.loaders.wishlistItem.clear(item.id);
      this.$ctx.loaders.defaultWishlist.clear(preflight.context.customerId);
    }
    return {
      wishlistItem: item ? await this.resolvers.wishlistItem(item.id) : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(WishlistProductRemoveInputSchema())
  async wishlistProductRemove(args: MutationWishlistProductRemoveArgs) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        deletedWishlistItemId: null,
        userErrors: preflight.userErrors,
      };
    }
    const itemId = safeDecode(
      args.input.itemId,
      GlobalIdEntity.CustomerWishlistItem,
    );
    if (!itemId) {
      return {
        deletedWishlistItemId: null,
        userErrors: [invalidId(["itemId"])],
      };
    }
    const input: WishlistProductRemoveWorkflowInput = {
      params: { itemId },
      context: preflight.context,
    };
    const result = await this.runWishlistWorkflow<
      WishlistProductRemoveWorkflowResult,
      WishlistProductRemoveWorkflowInput
    >("wishlistProductRemove", preflight.idempotencyKey, input);
    if (!result.ok) {
      return {
        deletedWishlistItemId: null,
        userErrors: result.userErrors,
      };
    }

    if (result.value.deletedWishlistItemId) {
      this.$ctx.loaders.wishlistItem.clear(result.value.deletedWishlistItemId);
    }
    return {
      deletedWishlistItemId: result.value.deletedWishlistItemId
        ? this.encodeId(
            result.value.deletedWishlistItemId,
            GlobalIdEntity.CustomerWishlistItem,
          )
        : null,
      userErrors: result.value.userErrors,
    };
  }

  @ZodResolver(CustomerComparisonVariantAddInputSchema())
  async customerComparisonVariantAdd(
    args: MutationCustomerComparisonVariantAddArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        customer: null,
        revision: null,
        userErrors: preflight.userErrors,
      };
    }
    const variantId = safeDecode(
      args.input.variantId,
      GlobalIdEntity.ProductVariant,
    );
    if (!variantId) {
      return {
        customer: null,
        revision: null,
        userErrors: [invalidId(["variantId"])],
      };
    }
    const input: CustomerComparisonVariantAddWorkflowInput = {
      params: {
        variantId,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    return this.runComparisonMutation<
      CustomerComparisonVariantAddWorkflowResult,
      CustomerComparisonVariantAddWorkflowInput
    >("customerComparisonVariantAdd", preflight.idempotencyKey, input);
  }

  @ZodResolver(CustomerComparisonVariantRemoveInputSchema())
  async customerComparisonVariantRemove(
    args: MutationCustomerComparisonVariantRemoveArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        customer: null,
        revision: null,
        userErrors: preflight.userErrors,
      };
    }
    const variantId = safeDecode(
      args.input.variantId,
      GlobalIdEntity.ProductVariant,
    );
    if (!variantId) {
      return {
        customer: null,
        revision: null,
        userErrors: [invalidId(["variantId"])],
      };
    }
    const input: CustomerComparisonVariantRemoveWorkflowInput = {
      params: {
        variantId,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    return this.runComparisonMutation<
      CustomerComparisonVariantRemoveWorkflowResult,
      CustomerComparisonVariantRemoveWorkflowInput
    >("customerComparisonVariantRemove", preflight.idempotencyKey, input);
  }

  @ZodResolver(CustomerComparisonCategoryClearInputSchema())
  async customerComparisonCategoryClear(
    args: MutationCustomerComparisonCategoryClearArgs,
  ) {
    const preflight = this.mutationPreflight(args.input.idempotencyKey);
    if ("userErrors" in preflight) {
      return {
        customer: null,
        revision: null,
        userErrors: preflight.userErrors,
      };
    }
    const categoryId = safeDecode(
      args.input.categoryId,
      GlobalIdEntity.Category,
    );
    if (!categoryId) {
      return {
        customer: null,
        revision: null,
        userErrors: [invalidId(["categoryId"])],
      };
    }
    const input: CustomerComparisonCategoryClearWorkflowInput = {
      params: {
        categoryId,
        expectedRevision: args.input.expectedRevision,
      },
      context: preflight.context,
    };
    return this.runComparisonMutation<
      CustomerComparisonCategoryClearWorkflowResult,
      CustomerComparisonCategoryClearWorkflowInput
    >("customerComparisonCategoryClear", preflight.idempotencyKey, input);
  }

  private async runComparisonMutation<
    TResult extends {
      customerId: string | null;
      revision: number | null;
      userErrors: StorefrontUserError[];
    },
    TInput,
  >(operation: string, idempotencyKey: string, input: TInput) {
    const result = await this.runCustomerWorkflow<TResult, TInput>(
      operation,
      idempotencyKey,
      input,
    );
    if (!result.ok) {
      return {
        customer: null,
        revision: null,
        userErrors: result.userErrors,
      };
    }
    return {
      customer: result.value.customerId
        ? await this.resolvers.customer(result.value.customerId)
        : null,
      revision: result.value.revision,
      userErrors: result.value.userErrors,
    };
  }

  private clearAddressLoaders(customerId: string): void {
    this.$ctx.loaders.customer.clear(customerId);
    this.$ctx.loaders.addressesByCustomer.clear(customerId);
    this.$ctx.loaders.address.clearAll();
  }

  private clearTaxLoaders(customerId: string): void {
    this.$ctx.loaders.customer.clear(customerId);
    this.$ctx.loaders.taxIdentifier.clearAll();
  }

  private mutationPreflight(idempotencyKey: string):
    | {
        context: StorefrontCustomerWorkflowContext;
        idempotencyKey: string;
      }
    | { userErrors: StorefrontUserError[] } {
    this.requireWritePermission();
    const customerId = this.$ctx.customer?.id;
    if (!customerId) {
      return {
        userErrors: [
          userError("UNAUTHENTICATED", "Customer authentication is required"),
        ],
      };
    }
    const normalizedKey = idempotencyKey.trim();
    if (
      !normalizedKey ||
      normalizedKey.length > 256 ||
      !/^[\x21-\x7e]+$/.test(normalizedKey)
    ) {
      return {
        userErrors: [
          userError(
            "INVALID_IDEMPOTENCY_KEY",
            "Idempotency key must contain 1 to 256 visible ASCII characters",
            ["idempotencyKey"],
          ),
        ],
      };
    }
    return {
      context: {
        organizationId: this.$ctx.store.organizationId,
        storeId: this.$ctx.store.id,
        customerId,
        locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
        locales: [...this.$ctx.store.locales],
        requestId: this.$ctx.requestId,
      },
      idempotencyKey: normalizedKey,
    };
  }

  private async runCustomerWorkflow<TResult, TInput>(
    operation: string,
    idempotencyKey: string,
    input: TInput,
  ) {
    return this.runWorkflow<TResult, TInput>(
      operation,
      idempotencyKey,
      input,
      "Customer comparison operation is temporarily unavailable",
    );
  }

  private async runWishlistWorkflow<TResult, TInput>(
    operation: string,
    idempotencyKey: string,
    input: TInput,
  ) {
    return this.runWorkflow<TResult, TInput>(
      operation,
      idempotencyKey,
      input,
      "Wishlist operation is temporarily unavailable",
    );
  }

  private async runSelfServiceWorkflow<TResult, TInput>(
    operation: string,
    idempotencyKey: string,
    input: TInput,
  ) {
    return this.runWorkflow<TResult, TInput>(
      operation,
      idempotencyKey,
      input,
      "Customer operation is temporarily unavailable",
    );
  }

  private async runWorkflow<TResult, TInput>(
    operation: string,
    idempotencyKey: string,
    input: TInput,
    unavailableMessage: string,
  ): Promise<
    | { ok: true; value: TResult }
    | { ok: false; userErrors: StorefrontUserError[] }
  > {
    const customerId = this.$ctx.customer!.id;
    try {
      const value = await this.$ctx.kernel.getServices().broker.runWorkflow<
        TResult,
        TInput
      >(`customers.${operation}`, input, {
        source: "client",
        clientKey: `${customerId}:${idempotencyKey}`,
        organizationId: this.$ctx.store.organizationId,
        apiKeyId: this.$ctx.storefrontAccess!.credentialId,
        requestHash: semanticRequestHash(input),
      });
      return { ok: true, value };
    } catch (error) {
      if (isIdempotencyConflict(error)) {
        return {
          ok: false,
          userErrors: [
            userError(
              "IDEMPOTENCY_CONFLICT",
              "Idempotency key was already used with a different request",
              ["idempotencyKey"],
            ),
          ],
        };
      }
      return {
        ok: false,
        userErrors: [
          userError(
            "WORKFLOW_UNAVAILABLE",
            unavailableMessage,
            undefined,
            true,
          ),
        ],
      };
    }
  }
}

function semanticRequestHash<TInput>(input: TInput): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return hashContent(input);
  }
  const record = input as Record<string, unknown>;
  return hashContent("params" in record ? record.params : input);
}

function isIdempotencyConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "IDEMPOTENCY_CONFLICT"
  );
}

function mapAddressInput(input: CustomerAddressInput) {
  return {
    label: input.label,
    prefix: input.prefix,
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    suffix: input.suffix,
    company: input.company,
    address1: input.address1,
    address2: input.address2,
    city: input.city,
    countryCode: String(input.countryCode),
    provinceCode: input.provinceCode,
    zip: input.zip,
    phone: input.phone,
  };
}

function mapCustomerProfilePatch(
  input: CustomerUpdateInput,
): StorefrontCustomerUpdateWorkflowInput["params"]["patch"] {
  const patch: StorefrontCustomerUpdateWorkflowInput["params"]["patch"] = {};
  for (const field of [
    "prefix",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "preferredLocale",
    "dateOfBirth",
    "gender",
    "companyName",
    "jobTitle",
  ] as const) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      Object.assign(patch, { [field]: input[field] });
    }
  }
  return patch;
}

function failedAddressPayload(userErrors: StorefrontUserError[]) {
  return { customerAddress: null, customer: null, userErrors };
}

function failedTaxPayload(userErrors: StorefrontUserError[]) {
  return { taxIdentifier: null, customer: null, userErrors };
}

function safeDecode(value: string, type: GlobalIdEntity): string | null {
  try {
    return decodeGlobalIdByType(value, type);
  } catch {
    return null;
  }
}

function invalidId(field: string[]): StorefrontUserError {
  return userError("INVALID_ID", "Global ID has an unexpected type", field);
}

function userError(
  code: string,
  message: string,
  field?: string[],
  retryable = false,
): StorefrontUserError {
  return { code, message, field, retryable };
}
