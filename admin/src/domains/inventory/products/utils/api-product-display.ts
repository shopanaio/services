import type {
  ApiFile,
  ApiProduct,
  ApiProductOption,
  ApiVariant,
} from "@/graphql/types";

export const getProductVariants = (product: ApiProduct): ApiVariant[] =>
  product.variants.edges.map((edge) => edge.node);

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

export const getProductTotalAvailable = (product: ApiProduct): number =>
  getProductVariants(product).reduce(
    (total, variant) => total + getVariantStockQuantity(variant),
    0,
  );

export const getProductPrimaryCategoryName = (
  product: ApiProduct,
): string | null => product.categories[0]?.name ?? null;

export const getProductBrandName = (product: ApiProduct): string | null => {
  const brandFeature = product.features.find(
    (feature) =>
      feature.slug === "brand" || feature.name.toLowerCase() === "brand",
  );

  return brandFeature?.values[0]?.name ?? null;
};

export const getVariantStockQuantity = (variant: ApiVariant): number => {
  const inventoryItem = variant.inventoryItem;

  if (!inventoryItem) {
    return 0;
  }

  return (
    inventoryItem.totalAvailable ??
    inventoryItem.stock.reduce((total, stock) => total + stock.quantityOnHand, 0)
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
