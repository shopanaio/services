"use client";

import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingsTab } from "@/domains/inventory/products/modals/edit-components-modal/components";
import type {
  DisplayStyle,
  OutOfStockBehavior,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Props
// ============================================================================

interface ISettingsSectionProps {
  displayStyle: DisplayStyle;
  onDisplayStyleChange: (style: DisplayStyle) => void;
  showImages: boolean;
  onShowImagesChange: (value: boolean) => void;
  showSku: boolean;
  onShowSkuChange: (value: boolean) => void;
  showStock: boolean;
  onShowStockChange: (value: boolean) => void;
  showComparePrice: boolean;
  onShowComparePriceChange: (value: boolean) => void;
  outOfStockBehavior: OutOfStockBehavior;
  onOutOfStockBehaviorChange: (value: OutOfStockBehavior) => void;
  inheritStock: boolean;
  onInheritStockChange: (value: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

export const SettingsSection = ({
  displayStyle,
  onDisplayStyleChange,
  showImages,
  onShowImagesChange,
  showSku,
  onShowSkuChange,
  showStock,
  onShowStockChange,
  showComparePrice,
  onShowComparePriceChange,
  outOfStockBehavior,
  onOutOfStockBehaviorChange,
  inheritStock,
  onInheritStockChange,
}: ISettingsSectionProps) => {
  return (
    <Paper>
      <PaperHeader title="Bundle Settings" />
      <SettingsTab
        displayStyle={displayStyle}
        onDisplayStyleChange={onDisplayStyleChange}
        showImages={showImages}
        onShowImagesChange={onShowImagesChange}
        showSku={showSku}
        onShowSkuChange={onShowSkuChange}
        showStock={showStock}
        onShowStockChange={onShowStockChange}
        showComparePrice={showComparePrice}
        onShowComparePriceChange={onShowComparePriceChange}
        outOfStockBehavior={outOfStockBehavior}
        onOutOfStockBehaviorChange={onOutOfStockBehaviorChange}
        inheritStock={inheritStock}
        onInheritStockChange={onInheritStockChange}
      />
    </Paper>
  );
};
