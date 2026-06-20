import { App, Button, Tabs, Dropdown, Flex } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import type { OutputData } from "@editorjs/editorjs";
import type { RenderedContent } from "@/ui-kit/editor/renderers";
import { AIButton } from "@/ui-kit/ai-button";
import { Paper } from "@/ui-kit/paper";
import type { ApiProduct } from "@/graphql/types";
import type { ApiProductContentInput } from "@/graphql/types";
import {
  useProductEditDescriptionModal,
  useProductAIWriterModal,
} from "../../modals";
import { useUpdateProduct } from "../../hooks";
import { ProductContentEmptyState } from "./components/product-content-empty-state";
import { useStyles } from "./product-content-tabs.styles";

// ============================================================================
// Types
// ============================================================================

interface IProductContentTabsProps {
  product: ApiProduct;
}

// ============================================================================
// Main Component
// ============================================================================

export const ProductContentTabs = ({ product }: IProductContentTabsProps) => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { updateProduct } = useUpdateProduct();
  const { push: openEditDescriptionModal } = useProductEditDescriptionModal();
  const { push: openAIWriterModal } = useProductAIWriterModal();

  const buildContentInput = (
    values: Partial<{
      description: RenderedContent;
      excerpt: RenderedContent;
    }>,
  ): ApiProductContentInput => {
    const content: ApiProductContentInput = {};

    if (values.description?.json?.blocks?.length) {
      content.description = {
        text: values.description.plain,
        html: values.description.html,
        json: values.description.json as unknown as Record<string, unknown>,
      };
    }

    if (values.excerpt?.json?.blocks?.length) {
      content.excerpt = {
        text: values.excerpt.plain,
        html: values.excerpt.html,
        json: values.excerpt.json as unknown as Record<string, unknown>,
      };
    }

    return content;
  };

  const saveContent = async (
    values: Partial<{
      description: RenderedContent;
      excerpt: RenderedContent;
    }>,
  ) => {
    const result = await updateProduct({
      productId: product.id,
      expectedRevision: product.revision,
      operations: {
        content: buildContentInput(values),
      },
    });

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return false;
    }

    message.success("Product content updated");
    return true;
  };

  const handleWriteWithAI = () => {
    openAIWriterModal({
      product,
      onApply: async (values: {
        description?: RenderedContent;
        excerpt?: RenderedContent;
      }) => {
        await saveContent(values);
      },
    });
  };

  const parseEditorData = (json: unknown): OutputData | null => {
    if (!json) return null;
    try {
      if (typeof json === "string") {
        return JSON.parse(json) as OutputData;
      }
      return json as OutputData;
    } catch {
      return null;
    }
  };

  const handleEditDescription = () => {
    openEditDescriptionModal({
      description: parseEditorData(product.description?.json),
      excerpt: parseEditorData(product.excerpt?.json),
      product,
      onSave: async (values: {
        description: RenderedContent;
        excerpt: RenderedContent;
      }) => {
        return saveContent(values);
      },
    });
  };

  const descriptionHtml = product.description?.html ?? null;
  const excerptHtml = product.excerpt?.html ?? null;

  return (
    <Paper className={styles.tabsSection}>
      <Tabs
        type="card"
        size="middle"
        tabBarExtraContent={
          <Flex gap={8}>
            <AIButton onClick={handleWriteWithAI} />
            <Dropdown
              menu={{
                items: [
                  {
                    key: "edit",
                    label: "Edit content",
                    onClick: handleEditDescription,
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Flex>
        }
        items={[
          {
            key: "description",
            label: "Description",
            children: descriptionHtml ? (
              <div
                className={styles.renderedContent}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <ProductContentEmptyState
                title="No description added"
                description="Add a detailed product description to help customers understand features, materials, and usage."
                actionLabel="Add description"
                onAction={handleEditDescription}
              />
            ),
          },
          {
            key: "excerpt",
            label: "Excerpt",
            children: excerptHtml ? (
              <div
                className={styles.renderedContent}
                dangerouslySetInnerHTML={{ __html: excerptHtml }}
              />
            ) : (
              <ProductContentEmptyState
                title="No excerpt added"
                description="Add a short summary for product previews, search snippets, and quick product scans."
                actionLabel="Add excerpt"
                onAction={handleEditDescription}
              />
            ),
          },
        ]}
      />
    </Paper>
  );
};
