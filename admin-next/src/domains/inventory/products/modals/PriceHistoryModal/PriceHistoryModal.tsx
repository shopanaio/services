"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { formatPrice as defaultFormatPrice } from "../../components/pricing/utils";
import {
  OverviewSection,
  ScheduledSection,
  ChangeLogSection,
} from "./components";
import type {
  IPriceHistoryModalPayload,
  IPriceHistoryRecord,
  IScheduledPriceRecord,
} from "./types";

export const PriceHistoryModal = () => {
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as unknown as IPriceHistoryModalPayload;

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    typedPayload.variantId || (typedPayload.variants?.length ? "all" : undefined)
  );

  const formatPrice = typedPayload.formatPrice || defaultFormatPrice;

  const isAllVariants = selectedVariantId === "all";

  const selectedVariant = isAllVariants
    ? undefined
    : typedPayload.variants?.find((v) => v.id === selectedVariantId);

  // Combine all variants data when "All variants" is selected
  const allVariantsHistory = useMemo(() => {
    if (!typedPayload.variants?.length) return [];
    const combined: IPriceHistoryRecord[] = [];
    typedPayload.variants.forEach((v) => {
      v.priceHistory.forEach((h) => {
        combined.push({
          ...h,
          id: `${v.id}-${h.id}`,
        });
      });
    });
    return combined.sort(
      (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()
    );
  }, [typedPayload.variants]);

  const allVariantsScheduled = useMemo(() => {
    if (!typedPayload.variants?.length) return [];
    const combined: IScheduledPriceRecord[] = [];
    typedPayload.variants.forEach((v) => {
      v.scheduledPrices?.forEach((s) => {
        combined.push({
          ...s,
          id: `${v.id}-${s.id}`,
          reason: `${v.title}: ${s.reason || "Scheduled change"}`,
        });
      });
    });
    return combined.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [typedPayload.variants]);

  const currentPrice = isAllVariants
    ? typedPayload.currentPrice
    : (selectedVariant?.price ?? typedPayload.currentPrice);

  const compareAtPrice = isAllVariants
    ? typedPayload.compareAtPrice ?? null
    : (selectedVariant?.compareAtPrice ?? typedPayload.compareAtPrice ?? null);

  const priceHistory = isAllVariants
    ? allVariantsHistory
    : (selectedVariant?.priceHistory ?? typedPayload.priceHistory);

  const scheduledPrices = isAllVariants
    ? allVariantsScheduled
    : (selectedVariant?.scheduledPrices ?? typedPayload.scheduledPrices ?? []);

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
      name="price-history"
      header={
        <ModalHeader
          name="price-history"
          title="Price History"
          onClose={pop}
          submitButtonProps={null}
        />
      }
    >
      <OverviewSection
        currentPrice={currentPrice}
        compareAtPrice={compareAtPrice}
        priceHistory={priceHistory}
        variants={typedPayload.variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={setSelectedVariantId}
        formatPrice={formatPrice}
      />

      <ScheduledSection
        scheduledPrices={scheduledPrices}
        currentPrice={currentPrice}
        formatPrice={formatPrice}
        onAdd={typedPayload.onAddScheduled}
        onEdit={typedPayload.onEditScheduled}
        onDelete={typedPayload.onDeleteScheduled}
      />

      <ChangeLogSection history={priceHistory} />
    </ModalLayout>
  );
};
