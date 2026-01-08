"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Input, Select, Button, Typography, Flex, Switch, Alert } from "antd";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridReadyEvent,
  SelectionChangedEvent,
} from "ag-grid-community";
import { createStyles } from "antd-style";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "../../components/PaperHeader";
import {
  generateVariants,
  countPotentialVariants,
} from "./utils/generateVariants";
import type { ICreateProductFormValues } from "./types";
import type { IOptionInput, IGeneratedVariant } from "./utils/generateVariants";

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
  onUpdate: (id: string, updates: Partial<IOptionInput>) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

const OptionCard = ({
  option,
  onUpdate,
  onDelete,
  canDelete,
}: IOptionCardProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.optionCard}>
      <div className={styles.optionRow}>
        <div className={styles.optionFields}>
          <div className={styles.optionFieldRow}>
            <div className={styles.optionFieldLabel}>Title</div>
            <Input
              placeholder="e.g. Color"
              value={option.name}
              onChange={(e) => onUpdate(option.id, { name: e.target.value })}
            />
          </div>

          <div className={styles.optionFieldRow}>
            <div className={styles.optionFieldLabel}>Values</div>
            <Select
              mode="tags"
              placeholder="Type and press Enter"
              tokenSeparators={[","]}
              value={option.values}
              onChange={(values) => onUpdate(option.id, { values })}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <Button
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
  const { watch, setValue, getValues } = useFormContext<ICreateProductFormValues>();
  const gridRef = useRef<AgGridReact>(null);

  const hasVariants = watch("hasVariants");
  const options = watch("options");
  const variants = watch("variants");

  // Regenerate variants when options change
  useEffect(() => {
    if (hasVariants) {
      const newVariants = generateVariants(options);
      const currentVariants = getValues("variants");
      // Preserve enabled state for existing variants
      const updatedVariants = newVariants.map((newVar) => {
        const existing = currentVariants.find((v) => v.title === newVar.title);
        return existing ? { ...newVar, enabled: existing.enabled } : newVar;
      });
      setValue("variants", updatedVariants);
    }
  }, [options, hasVariants, setValue, getValues]);

  const handleHasVariantsChange = useCallback(
    (checked: boolean) => {
      setValue("hasVariants", checked);
      if (checked) {
        // Add empty option by default
        const emptyOption: IOptionInput = {
          id: `option-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
      id: `option-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "",
      values: [],
    };
    setValue("options", [...options, newOption]);
  }, [options, setValue]);

  const handleUpdateOption = useCallback(
    (id: string, updates: Partial<IOptionInput>) => {
      setValue(
        "options",
        options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt))
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

  const handleSelectAll = useCallback(() => {
    setValue(
      "variants",
      variants.map((v) => ({ ...v, enabled: true }))
    );
    gridRef.current?.api?.selectAll();
  }, [variants, setValue]);

  const handleDeselectAll = useCallback(() => {
    setValue(
      "variants",
      variants.map((v) => ({ ...v, enabled: false }))
    );
    gridRef.current?.api?.deselectAll();
  }, [variants, setValue]);

  // Build dynamic columns based on options
  const columnDefs = useMemo<ColDef<IGeneratedVariant>[]>(() => {
    const baseCols: ColDef<IGeneratedVariant>[] = [
      {
        headerName: "Variant",
        field: "title",
        flex: 1,
        minWidth: 150,
      },
    ];

    // Add dynamic columns for each option
    const validOptions = options.filter((o) => o.name.trim());
    const optionCols: ColDef<IGeneratedVariant>[] = validOptions.map((opt) => ({
      headerName: opt.name,
      valueGetter: (params) => {
        const optionValue = params.data?.options.find(
          (o) => o.name === opt.name
        );
        return optionValue?.value || "";
      },
      width: 100,
    }));

    return [...baseCols, ...optionCols];
  }, [options]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Pre-select enabled variants
    params.api.forEachNode((node) => {
      if (node.data?.enabled) {
        node.setSelected(true);
      }
    });
  }, []);

  const potentialVariantCount = countPotentialVariants(options);
  const enabledCount = variants.filter((v) => v.enabled).length;
  const showWarning = potentialVariantCount > 50;

  return (
    <Paper>
      <PaperHeader title="Variants" />

      <Flex gap={12} className={styles.switchRow}>
        <Switch
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
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddOption}
            >
              Add
            </Button>
          </div>

          {options.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              onUpdate={handleUpdateOption}
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
                <Flex gap={8}>
                  <Button size="small" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button size="small" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </Flex>
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

              <div className={styles.gridContainer}>
                <AgGridReact
                  ref={gridRef}
                  rowData={variants}
                  columnDefs={columnDefs}
                  rowSelection="multiple"
                  suppressRowClickSelection={true}
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
