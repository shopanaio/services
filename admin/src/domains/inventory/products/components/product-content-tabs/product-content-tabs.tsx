import { createStyles } from "antd-style";
import { App, Button, Typography, Tabs, Dropdown, Flex } from "antd";
import { WarningOutlined, MoreOutlined } from "@ant-design/icons";
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

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  tabsSection: {
    minHeight: 120,
  },
  contentText: {
    "&&": {
      margin: 0,
      fontSize: 13,
      color: token.colorText,
      lineHeight: 1.6,
    },
  },
  renderedContent: {
    fontSize: 13,
    color: token.colorText,
    lineHeight: 1.6,
    minHeight: 80,
    maxHeight: 120,
    overflow: "hidden",
    position: "relative" as const,
    "& p": {
      margin: "0 0 8px 0",
      "&:last-child": {
        marginBottom: 0,
      },
    },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      margin: "12px 0 8px 0",
      fontWeight: 600,
      "&:first-child": {
        marginTop: 0,
      },
    },
    "& h3": {
      fontSize: 14,
    },
    "& ul, & ol": {
      margin: "8px 0",
      paddingLeft: 20,
    },
    "& li": {
      marginBottom: 4,
    },
    "&::after": {
      content: '""',
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
      background: `linear-gradient(transparent, ${token.colorBgContainer})`,
      pointerEvents: "none" as const,
    },
  },
  emptyContainer: {
    padding: "16px 0",
  },
  emptyIcon: {
    color: token.colorTextQuaternary,
  },
  emptyText: {
    fontSize: 12,
  },
  addButton: {
    padding: 0,
    height: "auto",
  },
}));

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

    if (result.userErrors.length > 0) {
      message.error(result.userErrors[0].message);
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
              <Flex align="center" gap={8} className={styles.emptyContainer}>
                <WarningOutlined className={styles.emptyIcon} />
                <Typography.Text type="secondary" className={styles.emptyText}>
                  No description added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleEditDescription}
                  className={styles.addButton}
                >
                  Add now
                </Button>
              </Flex>
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
              <Flex align="center" gap={8} className={styles.emptyContainer}>
                <WarningOutlined className={styles.emptyIcon} />
                <Typography.Text type="secondary" className={styles.emptyText}>
                  No excerpt added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleEditDescription}
                  className={styles.addButton}
                >
                  Add now
                </Button>
              </Flex>
            ),
          },
        ]}
      />
    </Paper>
  );
};
