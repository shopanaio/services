"use client";

import { useEffect, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import {
  InventoryVariantsTable,
  IInventoryVariantRow,
  getInventoryDataForSave,
} from "../components/variants";
import type { IEditVariantInventoryModalPayload } from "../modals";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: 16,
  },
}));

// ============================================================================
// Main Component
// ============================================================================

export const EditVariantInventoryModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantInventoryModalPayload;

  const rowDataRef = useRef<IInventoryVariantRow[]>([]);

  const handleChange = useCallback(
    (rows: IInventoryVariantRow[]) => {
      rowDataRef.current = rows;
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    const dataForSave = getInventoryDataForSave(rowDataRef.current);
    typedPayload.onSave?.(dataForSave);
    pop();
  }, [typedPayload, pop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  return (
    <ModalLayout
      name="edit-variant-inventory"
      header={
        <ModalHeader
          name="edit-variant-inventory"
          title="Edit Variant Inventory"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
      fullWidth
    >
      <div className={styles.container}>
        <InventoryVariantsTable
          variants={typedPayload.variants}
          lowStockThreshold={typedPayload.lowStockThreshold}
          onChange={handleChange}
        />
      </div>
    </ModalLayout>
  );
};
