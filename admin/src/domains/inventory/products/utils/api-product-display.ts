import type {
  ApiCategory,
  ApiFile,
  ApiProduct,
  ApiProductOption,
  ApiVariant,
} from "@/graphql/types";

export const getProductVariants = (product: ApiProduct): ApiVariant[] =>
  product.variants?.edges.map((edge) => edge.node) ?? [];

export const getDefaultVariant = (product: ApiProduct): ApiVariant | null => {
  const variants = getProductVariants(product);

  return variants.find((variant) => variant.isDefault) ?? variants[0] ?? null;
};

export const getProductMediaFiles = (product: ApiProduct): ApiFile[] => {
  return [...(product.media ?? [])]
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map((item) => item.file);
};

export const getProductThumbnailFile = (
  product: ApiProduct,
): ApiFile | null => getProductMediaFiles(product)[0] ?? null;

export const getProductSku = (product: ApiProduct): string | null =>
  getDefaultVariant(product)?.inventoryItem?.sku ?? null;

export const getProductPrimaryPriceAmount = (
  product: ApiProduct,
): number | null => getDefaultVariant(product)?.price?.amountMinor ?? null;

export const getProductPriceAmounts = (product: ApiProduct): number[] =>
  getProductVariants(product)
    .map((variant) => variant.price?.amountMinor ?? null)
    .filter((amount): amount is number => amount !== null);

export const getProductMinPriceAmount = (
  product: ApiProduct,
): number | null => {
  const prices = getProductPriceAmounts(product);
  return prices.length > 0 ? Math.min(...prices) : null;
};

export const getProductMaxPriceAmount = (
  product: ApiProduct,
): number | null => {
  const prices = getProductPriceAmounts(product);
  return prices.length > 0 ? Math.max(...prices) : null;
};

export const getProductTotalAvailable = (product: ApiProduct): number =>
  getProductVariants(product).reduce(
    (total, variant) => total + getVariantStockQuantity(variant),
    0,
  );

export const getProductPrimaryCategoryName = (
  product: ApiProduct,
): string | null => getProductPrimaryCategory(product)?.name ?? null;

export const getProductPrimaryCategory = (
  product: ApiProduct,
): ApiCategory | null =>
  product.primaryCategory ??
  (product.categoryAssignments ?? []).find((assignment) => assignment.isPrimary)
    ?.category ??
  null;

export const getProductCategories = (product: ApiProduct): ApiCategory[] =>
  (product.categoryAssignments ?? []).map((assignment) => assignment.category);

export const getProductBrandName = (product: ApiProduct): string | null => {
  return product.vendor?.name ?? null;
};

export const getVariantStockQuantity = (variant: ApiVariant): number => {
  const inventoryItem = variant.inventoryItem;

  if (!inventoryItem) {
    return 0;
  }

  return (
    inventoryItem.totalAvailable ??
    (inventoryItem.stock ?? []).reduce(
      (total, stock) => total + stock.quantityOnHand,
      0,
    )
  );
};

export const getSelectedOptionLabels = (
  productOptions: ApiProductOption[],
  variant: ApiVariant,
): string[] => {
  const optionsById = new Map(
    productOptions.map((option) => [option.id, option]),
  );

  return variant.selectedOptions.map((selectedOption) => {
    const option = optionsById.get(selectedOption.optionId);
    const value = option?.values.find(
      (candidate) => candidate.id === selectedOption.optionValueId,
    );

    if (option && value) {
      return `${option.name}: ${value.name}`;
    }

    return value?.name ?? option?.name ?? "Unknown option";
  });
};

export const formatApiDate = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};
