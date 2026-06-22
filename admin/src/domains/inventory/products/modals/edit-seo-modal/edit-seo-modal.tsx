"use client";

import { useModalStackContext } from "@/layouts/modals";
import { EntitySeoModal } from "@/domains/inventory/components/entity-edit-forms";
import type { IEditSeoModalPayload } from "../../modals";

export const EditSeoModal = () => {
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditSeoModalPayload;
  const productSlug = typedPayload.productSlug || "product";

  return (
    <EntitySeoModal
      name="edit-seo"
      title="Edit SEO & Social"
      initialValues={{
        seoTitle: typedPayload.seoTitle || "",
        seoDescription: typedPayload.seoDescription || "",
        ogTitle: typedPayload.ogTitle || "",
        ogDescription: typedPayload.ogDescription || "",
        ogImage: typedPayload.ogImage || null,
      }}
      entityTitle={typedPayload.productTitle || ""}
      entitySlug={productSlug}
      previewPath={`products › ${productSlug}`}
      baseUrl={typedPayload.baseUrl || "yourstore.com"}
      metaTitleTestId="edit-seo-meta-title-input"
      metaDescriptionTestId="edit-seo-meta-description-input"
      ogTitleTestId="edit-seo-og-title-input"
      ogDescriptionTestId="edit-seo-og-description-input"
      onClose={pop}
      onSubmit={(formValues) => typedPayload.onSave?.(formValues)}
    />
  );
};
