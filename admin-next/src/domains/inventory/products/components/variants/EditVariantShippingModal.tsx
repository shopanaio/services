"use client";

import { useEffect, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import {
  ShippingVariantsTable,
  IShippingVariantRow,
  getShippingDataForSave,
} from "./ShippingVariantsTable";
import type { IEditVariantShippingModalPayload } from "../../modals";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
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

export const EditVariantShippingModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantShippingModalPayload;

  const rowDataRef = useRef<IShippingVariantRow[]>([]);

  const handleChange = useCallback(
    (rows: IShippingVariantRow[]) => {
      rowDataRef.current = rows;
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    const dataForSave = getShippingDataForSave(rowDataRef.current);
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
      name="edit-variant-shipping"
      header={
        <ModalHeader
          name="edit-variant-shipping"
          title="Edit Variant Shipping"
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
        <ShippingVariantsTable
          variants={typedPayload.variants}
          onChange={handleChange}
        />
      </div>
    </ModalLayout>
  );
};
