"use client";

import { useCallback, useMemo, useState } from "react";
import { App } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { EntityMediaGallery } from "@/domains/media/components";
import type { ApiFile } from "@/graphql/types";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategoryMediaToUpdateInput,
  type CategoryMediaFormValues,
} from "../../mappers";
import type { ICategoryEditMediaModalPayload } from "../../modals";

export const EditCategoryMediaModal = () => {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as ICategoryEditMediaModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading } = useUpdateCategory();
  const initialFiles = useMemo(
    () =>
      [...category.media]
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((item) => item.file),
    [category.media],
  );
  const [files, setFiles] = useState<ApiFile[]>(initialFiles);

  const handleChange = useCallback(
    (items: ApiFile[]) => {
      setFiles(items);
      setDirty(true);
    },
    [setDirty],
  );

  const handleSave = useCallback(async () => {
    const values: CategoryMediaFormValues = { files };
    const result = await updateCategory(
      category.id,
      mapCategoryMediaToUpdateInput(values),
      category.revision,
    );

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category media updated");
    await onSaved?.();
    forcePop();
  }, [category.id, category.revision, files, forcePop, message, onSaved, updateCategory]);

  return (
    <ModalLayout
      name="edit-category-media"
      header={
        <ModalHeader
          name="edit-category-media"
          title="Edit category media"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
            loading,
          }}
        />
      }
    >
      <EntityMediaGallery
        value={files}
        onChange={handleChange}
        title="Category Media"
        showViewSwitcher
        accept="image/*,video/*"
        hasFeatured
        featuredLabel="Featured"
        emptyMessage="No media files yet"
      />
    </ModalLayout>
  );
};
