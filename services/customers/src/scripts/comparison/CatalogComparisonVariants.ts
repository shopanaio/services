import { CatalogComparisonActions, type Catalog } from "@shopana/broker-types";
import type { CustomersKernelServices } from "../../kernel/types.js";
import { comparisonError, type CustomerComparisonUserError } from "./types.js";

export type CatalogComparisonVariantsResolution =
  | {
      ok: true;
      variants: readonly Readonly<Catalog.ResolvedCustomerComparisonVariant>[];
    }
  | { ok: false; userError: CustomerComparisonUserError };

export async function resolveCatalogComparisonVariants(
  services: CustomersKernelServices,
  params: Catalog.ResolveCustomerComparisonVariantsParams,
): Promise<CatalogComparisonVariantsResolution> {
  try {
    const result = await services.broker.call<
      Catalog.ResolveCustomerComparisonVariantsResult,
      Catalog.ResolveCustomerComparisonVariantsParams
    >(CatalogComparisonActions.resolveVariants, params);
    if (result.ok) return { ok: true, variants: result.variants };
    if (result.code === "CATEGORY_NOT_FOUND") {
      return {
        ok: false,
        userError: comparisonError("CATEGORY_NOT_FOUND", "Category was not found", ["categoryId"]),
      };
    }
    return {
      ok: false,
      userError: comparisonError(
        "CATALOG_UNAVAILABLE",
        "Catalog comparison data could not be verified",
        undefined,
        result.retryable,
      ),
    };
  } catch {
    return {
      ok: false,
      userError: comparisonError(
        "CATALOG_UNAVAILABLE",
        "Catalog comparison data could not be verified",
        undefined,
        true,
      ),
    };
  }
}
