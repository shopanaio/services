"use client";

import { useModalStackContext } from "@/layouts/modals";
import { renderContent } from "@/ui-kit/editor";
import type { RenderedContent } from "@/ui-kit/editor/renderers";
import { AIButton } from "@/ui-kit/ai-button";
import { EntityContentModal } from "@/domains/inventory/components/entity-edit-forms";
import type { IProductEditDescriptionModalPayload } from "../../modals";
import { useProductAIWriterModal } from "../../modals";

export const EditDescriptionModal = () => {
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductEditDescriptionModalPayload;
  const { push: openAIWriterModal } = useProductAIWriterModal();

  return (
    <EntityContentModal
      name="edit-description"
      title="Edit Content"
      initialValues={{
        description: typedPayload.description || null,
        excerpt: typedPayload.excerpt || null,
      }}
      descriptionPlaceholder="Start writing product description..."
      excerptPlaceholder="Write a short product excerpt..."
      descriptionTestId="edit-description-description-editor"
      excerptTestId="edit-description-excerpt-editor"
      onClose={pop}
      onSubmit={(values) =>
        typedPayload.onSave?.({
          description: renderContent(values.description),
          excerpt: renderContent(values.excerpt),
        })
      }
      renderExtraActions={({ setValue }) =>
        typedPayload.product ? (
          <AIButton
            onClick={() => {
              if (!typedPayload.product) return;
              openAIWriterModal({
                product: typedPayload.product,
                onApply: (values: {
                  description?: RenderedContent;
                  excerpt?: RenderedContent;
                }) => {
                  if (values.description?.json) {
                    setValue("description", values.description.json);
                  }
                  if (values.excerpt?.json) {
                    setValue("excerpt", values.excerpt.json);
                  }
                },
              });
            }}
          />
        ) : null
      }
    />
  );
};
