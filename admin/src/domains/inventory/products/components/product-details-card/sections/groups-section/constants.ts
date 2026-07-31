import { BundleType } from "@/domains/inventory/products/components/product-details-card/bundle-ui/types";

export const BUNDLE_TYPE_CONFIG: Record<BundleType, { color: string; label: string }> = {
  [BundleType.Fixed]: { color: "blue", label: "Fixed Kit" },
  [BundleType.Multipack]: { color: "cyan", label: "Multipack" },
  [BundleType.MixAndMatch]: { color: "purple", label: "Mix & Match" },
  [BundleType.Custom]: { color: "default", label: "Custom" },
};
