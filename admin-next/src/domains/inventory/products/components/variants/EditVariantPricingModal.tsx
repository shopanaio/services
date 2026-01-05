"use client";

import { useEffect, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import {
  PricingVariantsTable,
  IPricingVariantRow,
  getPricingDataForSave,
} from "./PricingVariantsTable";
import type { IEditVariantPricingModalPayload } from "../../modals";

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

export const EditVariantPricingModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantPricingModalPayload;

  const rowDataRef = useRef<IPricingVariantRow[]>([]);

  const handleChange = useCallback(
    (rows: IPricingVariantRow[]) => {
      rowDataRef.current = rows;
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    const dataForSave = getPricingDataForSave(rowDataRef.current);
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
      name="edit-variant-pricing"
      header={
        <ModalHeader
          name="edit-variant-pricing"
          title="Edit Variant Pricing"
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
        <PricingVariantsTable
          variants={typedPayload.variants}
          formatPrice={typedPayload.formatPrice}
          onChange={handleChange}
        />
      </div>
    </ModalLayout>
  );
};
