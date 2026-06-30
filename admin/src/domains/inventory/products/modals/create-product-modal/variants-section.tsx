"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Input, Select, Button, Typography, Flex, Switch, Alert } from "antd";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridReadyEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
} from "ag-grid-community";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import { syntheticId } from "@/utils/synthetic-id";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  generateVariants,
  countPotentialVariants,
} from "./utils/generate-variants";
import type { ICreateProductFormValues } from "./types";
import type { IOptionInput, IOptionValueInput, IGeneratedVariant } from "./utils/generate-variants";
import { useAgGridTheme } from "@/hooks";

const useStyles = createStyles(({ token }) => ({
  switchRow: {
    padding: token.paddingSM,
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: token.margin,
  },
  switch: {
    marginTop: 2,
  },
  optionsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: token.marginXS,
  },
  optionCard: {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    background: token.colorBgLayout,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  optionRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  optionFields: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  optionFieldRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  optionField: {
    flex: 1,
  },
  optionFieldLabel: {
    fontSize: 13,
    color: token.colorTextSecondary,
    width: 50,
    flexShrink: 0,
  },
  optionDelete: {},
  variantsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 16,
  },
  variantsDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 12,
  },
  gridContainer: {
    width: "100%",
    "& .ag-header": {
      background: token.colorBgLayout,
    },
    "& .ag-row": {
      cursor: "default",
    },
    "& .ag-row-selected::before": {
      background: "transparent !important",
    },
    "& .ag-center-cols-container, & .ag-center-cols-viewport": {
      minHeight: "unset !important",
    },
  },
  tip: {
    marginTop: 12,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  warningAlert: {
    marginBottom: 12,
  },
}));

// Option Card Component
interface IOptionCardProps {
  option: IOptionInput;
  index: number;
  onUpdateValues: (id: string, values: IOptionValueInput[]) => void;
  onUpdateName: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

const OptionCard = ({
  option,
  index,
  onUpdateValues,
  onUpdateName,
  onDelete,
  canDelete,
}: IOptionCardProps) => {
  const { styles } = useStyles();
  const { formState: { errors } } = useFormContext<ICreateProductFormValues>();

  const optionErrors = errors.options?.[index];
  const hasNameError = !!optionErrors?.name;
  const hasValuesError = !!optionErrors?.values;

  // Convert IOptionValueInput[] to string[] for Select display
  const displayValues = option.values.map((v) => v.value);

  const handleValuesChange = (newValues: string[]) => {
    // Map new values, preserving existing slugs for unchanged values
    const updatedValues: IOptionValueInput[] = newValues.map((value) => {
      const existing = option.values.find((v) => v.value === value);
      if (existing) {
        return existing;
      }
      return { value, slug: slugify(value) };
    });
    onUpdateValues(option.id, updatedValues);
  };

  return (
    <div
      className={styles.optionCard}
      data-testid={`create-product-option-card-${index}`}
    >
      <div className={styles.optionRow}>
        <div className={styles.optionFields}>
          <div className={styles.optionFieldRow}>
            <div className={styles.optionFieldLabel}>Title</div>
            <Input
              data-testid={`create-product-option-${index}-name-input`}
              placeholder="e.g. Color"
              value={option.name}
              onChange={(e) => onUpdateName(option.id, e.target.value)}
              status={hasNameError ? "error" : undefined}
            />
          </div>
          <div className={styles.optionFieldRow}>
            <div className={styles.optionFieldLabel}>Values</div>
            <Select
              data-testid={`create-product-option-${index}-values-select`}
              mode="tags"
              placeholder="Type and press Enter"
              tokenSeparators={[","]}
              value={displayValues}
              onChange={handleValuesChange}
              style={{ width: "100%" }}
              open={false}
              status={hasValuesError ? "error" : undefined}
            />
          </div>
        </div>

        <Button
          data-testid={`create-product-option-${index}-delete-button`}
          type="text"
          icon={<CloseOutlined />}
          className={styles.optionDelete}
          onClick={() => onDelete(option.id)}
          disabled={!canDelete}
        />
      </div>
    </div>
  );
};

export const VariantsSection = () => {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { watch, setValue, getValues, formState: { errors } } =
    useFormContext<ICreateProductFormValues>();
  const gridRef = useRef<AgGridReact>(null);

  const hasVariants = watch("hasVariants");
  const options = watch("options");
  const variants = watch("variants");

  // Deferred options for heavy computations (variant generation)
  // UI updates immediately, but variant regeneration is deferred
  const deferredOptions = useDeferredValue(options);

  // Regenerate variants when deferred options change
  useEffect(() => {
    if (hasVariants) {
      const newVariants = generateVariants(deferredOptions);
      const currentVariants = getValues("variants");
      // Preserve enabled state for existing variants (match by id which is based on slugs)
      const updatedVariants = newVariants.map((newVar) => {
        const existing = currentVariants.find((v) => v.id === newVar.id);
        return existing ? { ...newVar, enabled: existing.enabled } : newVar;
      });
      setValue("variants", updatedVariants);
    }
  }, [deferredOptions, hasVariants, setValue, getValues]);

  const handleHasVariantsChange = useCallback(
    (checked: boolean) => {
      setValue("hasVariants", checked);
      if (checked) {
        // Add empty option by default
        const emptyOption: IOptionInput = {
          id: syntheticId(),
          name: "",
          values: [],
        };
        setValue("options", [emptyOption]);
      } else {
        setValue("options", []);
        setValue("variants", []);
      }
    },
    [setValue]
  );

  const handleAddOption = useCallback(() => {
    const newOption: IOptionInput = {
      id: syntheticId(),
      name: "",
      values: [],
    };
    setValue("options", [...options, newOption]);
  }, [options, setValue]);

  const handleUpdateOptionName = useCallback(
    (id: string, name: string) => {
      setValue(
        "options",
        options.map((opt) => (opt.id === id ? { ...opt, name } : opt))
      );
    },
    [options, setValue]
  );

  const handleUpdateOptionValues = useCallback(
    (id: string, values: IOptionValueInput[]) => {
      setValue(
        "options",
        options.map((opt) => (opt.id === id ? { ...opt, values } : opt))
      );
    },
    [options, setValue]
  );

  const handleDeleteOption = useCallback(
    (id: string) => {
      setValue(
        "options",
        options.filter((opt) => opt.id !== id)
      );
    },
    [options, setValue]
  );

  const handleVariantSelectionChange = useCallback(
    (event: SelectionChangedEvent) => {
      const selectedIds = new Set(
        event.api.getSelectedRows().map((row: IGeneratedVariant) => row.id)
      );
      setValue(
        "variants",
        variants.map((v) => ({
          ...v,
          enabled: selectedIds.has(v.id),
        }))
      );
    },
    [variants, setValue]
  );

  // Build dynamic columns based on options
  const columnDefs = useMemo<ColDef<IGeneratedVariant>[]>(() => {
    return [
      {
        headerName: "Variant",
        field: "title",
        flex: 1,
        minWidth: 150,
        sortable: false,
      },
    ];
  }, []);

  const rowSelection = useMemo<RowSelectionOptions>(() => {
    return {
      mode: "multiRow",
      enableClickSelection: true,
      enableSelectionWithoutKeys: true,
    };
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Pre-select enabled variants
    params.api.forEachNode((node) => {
      if (node.data?.enabled) {
        node.setSelected(true);
      }
    });
  }, []);

  // Sync selection state when variants change (e.g., new variants added)
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      const variant = variants.find((v) => v.id === node.data?.id);
      if (variant) {
        node.setSelected(variant.enabled);
      }
    });
  }, [variants]);

  const potentialVariantCount = countPotentialVariants(options);
  const enabledCount = variants.filter((v) => v.enabled).length;
  const showWarning = potentialVariantCount > 50;

  return (
    <Paper>
      <PaperHeader title="Variants" />

      <Flex gap={12} className={styles.switchRow}>
        <Switch
          data-testid="create-product-has-variants-switch"
          className={styles.switch}
          checked={hasVariants}
          onChange={handleHasVariantsChange}
          size="small"
        />

        <Flex vertical>
          <Typography.Text strong>
            This is a product with variants
          </Typography.Text>
          <Typography.Text type="secondary">
            When unchecked, we will create a default variant for you
          </Typography.Text>
        </Flex>
      </Flex>

      {hasVariants && (
        <>
          <div className={styles.optionsHeader}>
            <Typography.Text strong>Product options</Typography.Text>
            <Button
              data-testid="create-product-add-option-button"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddOption}
            >
              Add
            </Button>
          </div>

          {options.map((option, index) => (
            <OptionCard
              key={option.id}
              option={option}
              index={index}
              onUpdateName={handleUpdateOptionName}
              onUpdateValues={handleUpdateOptionValues}
              onDelete={handleDeleteOption}
              canDelete={options.length > 1}
            />
          ))}

          {variants.length > 0 && (
            <>
              <div className={styles.variantsHeader}>
                <Typography.Text strong>
                  Product variants ({enabledCount}/{variants.length})
                </Typography.Text>
              </div>
              <div className={styles.variantsDescription}>
                This ranking will affect the variants&apos; order in your
                storefront.
              </div>

              {showWarning && (
                <Alert
                  type="warning"
                  message={`You are about to create ${potentialVariantCount} variants. Consider reducing options to improve performance.`}
                  className={styles.warningAlert}
                  showIcon
                />
              )}

              {errors.variants && (
                <Alert
                  type="error"
                  message="Please select at least one variant."
                  className={styles.warningAlert}
                  showIcon
                  closable
                />
              )}

              <div
                className={styles.gridContainer}
                data-testid="create-product-variants-grid"
              >
                <AgGridReact
                  ref={gridRef}
                  theme={agGridTheme}
                  rowData={variants}
                  columnDefs={columnDefs}
                  rowSelection={rowSelection}
                  suppressCellFocus={true}
                  suppressRowHoverHighlight={true}
                  suppressMovableColumns={true}
                  onSelectionChanged={handleVariantSelectionChange}
                  onGridReady={onGridReady}
                  getRowId={(params) => params.data.id}
                  domLayout="autoHeight"
                  rowHeight={40}
                  headerHeight={40}
                />
              </div>

              <div className={styles.tip}>
                Tip: Variants left unchecked won&apos;t be created. You can
                always create and edit variants afterwards but this list fits
                the variations in your product options.
              </div>
            </>
          )}
        </>
      )}
    </Paper>
  );
};
