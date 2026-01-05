"use client";

import { useState, useMemo, useCallback } from "react";
import { createStyles } from "antd-style";
import {
  Checkbox,
  Typography,
  Tag,
  Switch,
  Divider,
  Empty,
  Flex,
} from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";

import type { IComponentVariantSettingsModalPayload } from "../../../modals";
import { formatPrice } from "../mocks/mockData";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  content: {
    padding: "0 24px 24px",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
  },
  optionGroup: {
    marginBottom: 16,
  },
  optionGroupTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
    color: token.colorText,
  },
  optionValues: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  variantList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 300,
    overflow: "auto",
  },
  variantItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
  },
  variantItemSelected: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  variantItemDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    "&:hover": {
      borderColor: token.colorBorderSecondary,
      background: "transparent",
    },
  },
  variantInfo: {
    flex: 1,
    minWidth: 0,
  },
  variantTitle: {
    fontSize: 13,
    fontWeight: 500,
  },
  variantMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  variantSku: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: 500,
    flexShrink: 0,
  },
  settingsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
  },
  summary: {
    padding: "12px 16px",
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 13,
  },
}));

// ============================================================================
// Component
// ============================================================================

export const VariantSettingsModal = () => {
  const { styles, cx } = useStyles();
  const { pop, payload } = useModalStackContext();

  const modalPayload = payload as IComponentVariantSettingsModalPayload | undefined;

  // Extract data from payload
  const {
    productTitle = "Product",
    availableVariantIds: initialVariantIds,
    autoHideOutOfStock: initialAutoHide = false,
    variants = [],
    options = [],
    onSave,
  } = modalPayload ?? {};

  // Local state
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(
    () => initialVariantIds ?? variants.map((v) => v.id)
  );
  const [autoHideOutOfStock, setAutoHideOutOfStock] = useState(initialAutoHide);

  // Get unique option values grouped by option
  const optionGroups = useMemo(() => {
    if (!options || options.length === 0) return [];

    return options.map((option) => {
      // Find which values are available based on selected variants
      const selectedVariants = variants.filter((v) =>
        selectedVariantIds.includes(v.id)
      );

      const availableValues = new Set(
        selectedVariants.flatMap(
          (v) =>
            v.options
              ?.filter((o) => o.optionId === option.id)
              .map((o) => o.value) ?? []
        )
      );

      return {
        id: option.id,
        name: option.name,
        values: option.values.map((value) => ({
          value,
          isSelected: availableValues.has(value),
          count:
            selectedVariants.filter((v) =>
              v.options?.some(
                (o) => o.optionId === option.id && o.value === value
              )
            ).length,
        })),
      };
    });
  }, [options, variants, selectedVariantIds]);

  // Toggle variant selection
  const handleVariantToggle = useCallback((variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  }, []);

  // Select/deselect all
  const handleSelectAll = useCallback(
    (e: CheckboxChangeEvent) => {
      if (e.target.checked) {
        setSelectedVariantIds(variants.map((v) => v.id));
      } else {
        setSelectedVariantIds([]);
      }
    },
    [variants]
  );

  // Toggle by option value
  const handleOptionValueToggle = useCallback(
    (optionId: string, value: string, checked: boolean) => {
      const variantsWithValue = variants.filter((v) =>
        v.options?.some((o) => o.optionId === optionId && o.value === value)
      );

      if (checked) {
        setSelectedVariantIds((prev) => [
          ...new Set([...prev, ...variantsWithValue.map((v) => v.id)]),
        ]);
      } else {
        const variantIdsToRemove = variantsWithValue.map((v) => v.id);
        setSelectedVariantIds((prev) =>
          prev.filter((id) => !variantIdsToRemove.includes(id))
        );
      }
    },
    [variants]
  );

  // Save changes
  const handleSave = useCallback(() => {
    const allVariantIds = variants.map((v) => v.id);
    const isAllSelected =
      selectedVariantIds.length === allVariantIds.length &&
      allVariantIds.every((id) => selectedVariantIds.includes(id));

    onSave?.({
      availableVariantIds: isAllSelected ? null : selectedVariantIds,
      autoHideOutOfStock,
    });
    pop();
  }, [selectedVariantIds, autoHideOutOfStock, variants, onSave, pop]);

  // Check states
  const allSelected = selectedVariantIds.length === variants.length;
  const someSelected =
    selectedVariantIds.length > 0 && selectedVariantIds.length < variants.length;

  return (
    <ModalLayout
      name="component-variant-settings"
      width={550}
      header={
        <ModalHeader
          name="component-variant-settings"
          title={`Variant Settings: ${productTitle}`}
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.content}>
        {/* Settings */}
        <div className={styles.section}>
          <div className={styles.settingsRow}>
            <Typography.Text>Auto-hide out of stock variants</Typography.Text>
            <Switch
              checked={autoHideOutOfStock}
              onChange={setAutoHideOutOfStock}
              size="small"
            />
          </div>
        </div>

        <Divider style={{ margin: "12px 0" }} />

        {/* Option Filters */}
        {optionGroups.length > 0 && (
          <div className={styles.section}>
            <Typography.Text className={styles.sectionTitle}>
              Filter by Options
            </Typography.Text>
            {optionGroups.map((group) => (
              <div key={group.id} className={styles.optionGroup}>
                <Typography.Text className={styles.optionGroupTitle}>
                  {group.name}
                </Typography.Text>
                <div className={styles.optionValues}>
                  {group.values.map(({ value, isSelected, count }) => (
                    <Tag.CheckableTag
                      key={value}
                      checked={isSelected}
                      onChange={(checked) =>
                        handleOptionValueToggle(group.id, value, checked)
                      }
                    >
                      {value} ({count})
                    </Tag.CheckableTag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Divider style={{ margin: "12px 0" }} />

        {/* Variant List */}
        <div className={styles.section}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Typography.Text className={styles.sectionTitle} style={{ margin: 0 }}>
              Available Variants
            </Typography.Text>
            <Checkbox
              indeterminate={someSelected}
              checked={allSelected}
              onChange={handleSelectAll}
            >
              Select all
            </Checkbox>
          </Flex>

          {variants.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No variants"
            />
          ) : (
            <div className={styles.variantList}>
              {variants.map((variant) => {
                const isSelected = selectedVariantIds.includes(variant.id);
                const isOutOfStock = variant.stock === 0;

                return (
                  <div
                    key={variant.id}
                    className={cx(
                      styles.variantItem,
                      isSelected && styles.variantItemSelected,
                      isOutOfStock && autoHideOutOfStock && styles.variantItemDisabled
                    )}
                    onClick={() => handleVariantToggle(variant.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleVariantToggle(variant.id)}
                    />
                    <div className={styles.variantInfo}>
                      <Typography.Text className={styles.variantTitle}>
                        {variant.title}
                      </Typography.Text>
                      <div className={styles.variantMeta}>
                        <Typography.Text className={styles.variantSku}>
                          {variant.sku}
                        </Typography.Text>
                        {isOutOfStock ? (
                          <Tag color="red" style={{ margin: 0 }}>
                            Out of stock
                          </Tag>
                        ) : (
                          <Tag color="green" style={{ margin: 0 }}>
                            {variant.stock} in stock
                          </Tag>
                        )}
                      </div>
                    </div>
                    <Typography.Text className={styles.variantPrice}>
                      {formatPrice(variant.price)}
                    </Typography.Text>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <Typography.Text className={styles.summaryText}>
            <strong>{selectedVariantIds.length}</strong> of {variants.length} variants
            selected
            {autoHideOutOfStock && <> (out of stock will be hidden)</>}
          </Typography.Text>
        </div>
      </div>
    </ModalLayout>
  );
};

export default VariantSettingsModal;
