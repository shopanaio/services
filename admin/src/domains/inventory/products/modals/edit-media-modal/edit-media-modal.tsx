"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { EntityMediaGallery } from "@/domains/media/components";
import type { ApiFile } from "@/graphql/types";
import type { IEditMediaModalPayload } from "../../modals";
import { useStyles } from "./edit-media-modal.styles";

export const EditMediaModal = () => {
  const { styles } = useStyles();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditMediaModalPayload;
  const [submitting, setSubmitting] = useState(false);

  const [gallery, setGallery] = useState<ApiFile[]>(() => {
    const items = [...typedPayload.gallery];
    if (
      typedPayload.featured &&
      !items.find((item) => item.id === typedPayload.featured?.id)
    ) {
      items.unshift(typedPayload.featured);
    }
    return items;
  });

  const markDirty = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const handleChange = useCallback(
    (items: ApiFile[]) => {
      setGallery(items);
      markDirty();
    },
    [markDirty]
  );

  const handleSave = useCallback(async () => {
    setSubmitting(true);

    try {
      const result = await typedPayload.onSave?.({
        featured: gallery[0] ?? null,
        gallery,
      });

      if (result !== false) {
        forcePop();
      }
    } finally {
      setSubmitting(false);
    }
  }, [typedPayload, gallery, forcePop]);

  return (
    <ModalLayout
      name="edit-media"
      header={
        <ModalHeader
          name="edit-media"
          title="Edit Media"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
            loading: submitting,
          }}
        />
      }
    >
      <div className={styles.container}>
        <EntityMediaGallery
          value={gallery}
          onChange={handleChange}
          title="Product Media"
          showViewSwitcher
          accept="image/*,video/*"
          hasFeatured
          featuredLabel="Featured"
          emptyMessage="No media files yet"
        />
      </div>
    </ModalLayout>
  );
};
