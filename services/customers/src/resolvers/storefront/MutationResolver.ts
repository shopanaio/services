import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
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
  WishlistWorkflowContext,
} from "../../workflows/dto/index.js";
import {
  WishlistCreateInputSchema,
  WishlistDeleteInputSchema,
  WishlistProductAddInputSchema,
  WishlistProductRemoveInputSchema,
  WishlistUpdateInputSchema,
} from "./generated/schemas.js";
import type {
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

  private mutationPreflight(idempotencyKey: string):
    | {
        context: WishlistWorkflowContext;
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
    if (!normalizedKey) {
      return {
        userErrors: [
          userError(
            "INVALID_IDEMPOTENCY_KEY",
            "Idempotency key is required",
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
        requestId: this.$ctx.requestId,
      },
      idempotencyKey: normalizedKey,
    };
  }

  private async runWishlistWorkflow<TResult, TInput>(
    operation: string,
    idempotencyKey: string,
    input: TInput,
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
      });
      return { ok: true, value };
    } catch {
      return {
        ok: false,
        userErrors: [
          userError(
            "WORKFLOW_UNAVAILABLE",
            "Wishlist operation is temporarily unavailable",
            undefined,
            true,
          ),
        ],
      };
    }
  }
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
