"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Radio,
  Select,
  Input,
  Button,
  Flex,
  Typography,
  Spin,
  Alert,
  Divider,
} from "antd";
import {
  ThunderboltOutlined,
  ReloadOutlined,
  TagOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import type { OutputData } from "@editorjs/editorjs";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { BlockEditor, renderContent } from "@/ui-kit/BlockEditor";
import { Paper } from "../components/Paper";
import type {
  IProductAIWriterModalPayload,
  AIGenerateTarget,
  AITone,
} from "../modals";

// ============================================================================
// Types
// ============================================================================

interface IAIWriterForm {
  target: AIGenerateTarget;
  tone: AITone;
  instructions: string;
}

interface IGeneratedContent {
  description: OutputData | null;
  excerpt: OutputData | null;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  contextCard: {
    padding: 16,
    background: token.colorFillQuaternary,
    borderRadius: 8,
    marginBottom: 20,
  },
  contextHeader: {
    fontSize: 11,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 12,
    fontWeight: 600,
  },
  contextRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  contextIcon: {
    color: token.colorTextSecondary,
    marginTop: 2,
  },
  contextLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
    minWidth: 70,
  },
  contextValue: {
    fontSize: 13,
    color: token.colorText,
    flex: 1,
  },
  formSection: {
    padding: 20,
  },
  formLabel: {
    display: "block",
    marginBottom: 8,
    fontWeight: 500,
  },
  formRow: {
    marginBottom: 20,
  },
  generateButton: {
    height: 44,
    fontSize: 15,
    fontWeight: 500,
    background:
      "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%)",
    border: "none",
    "&:hover": {
      background:
        "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #d946ef 100%)",
    },
  },
  resultSection: {
    marginTop: 20,
    padding: 16,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
    background: token.colorBgContainer,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: token.colorText,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
    gap: 20,
  },
  loadingText: {
    fontSize: 14,
    color: token.colorTextSecondary,
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    color: "#a855f7",
    fontSize: 18,
  },
  selectRow: {
    display: "flex",
    gap: 16,
  },
  selectItem: {
    flex: 1,
  },
}));

// ============================================================================
// Mock AI Generation (replace with actual API)
// ============================================================================

interface IGenerateParams {
  productContext: {
    title: string;
    category: string | null;
    attributes: string[];
    price: number;
  };
  target: AIGenerateTarget;
  tone: AITone;
  instructions: string;
}

const mockGenerateContent = async (
  params: IGenerateParams
): Promise<IGeneratedContent> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { productContext, target, tone } = params;

  const toneStyles: Record<AITone, string> = {
    professional:
      "Experience premium quality and exceptional craftsmanship with",
    casual: "Check out the awesome",
    luxury: "Indulge in the exquisite elegance of",
    friendly: "You're going to love",
  };

  const descriptionText = `${toneStyles[tone]} the ${productContext.title}. ${
    productContext.category
      ? `Perfect for ${productContext.category.toLowerCase()} enthusiasts, `
      : ""
  }this product delivers outstanding performance and style.

Key Features:
- Premium quality materials for lasting durability
- Thoughtfully designed for optimal user experience
- Versatile enough for any occasion
${productContext.attributes.length > 0 ? `- Available with: ${productContext.attributes.join(", ")}` : ""}

Whether you're looking for reliability, style, or both, the ${productContext.title} exceeds expectations at every turn.`;

  const excerptText = `${toneStyles[tone]} the ${productContext.title}. Premium quality meets exceptional design for an unmatched experience.`;

  const createEditorData = (text: string): OutputData => ({
    time: Date.now(),
    version: "2.28.2",
    blocks: text.split("\n\n").map((paragraph, index) => {
      if (paragraph.startsWith("Key Features:")) {
        return {
          id: `block-${index}`,
          type: "header",
          data: { text: "Key Features", level: 3 },
        };
      }
      if (paragraph.startsWith("- ")) {
        return {
          id: `block-${index}`,
          type: "list",
          data: {
            style: "unordered",
            items: paragraph.split("\n").map((item) => item.replace(/^- /, "")),
          },
        };
      }
      return {
        id: `block-${index}`,
        type: "paragraph",
        data: { text: paragraph },
      };
    }),
  });

  return {
    description:
      target === "excerpt" ? null : createEditorData(descriptionText),
    excerpt: target === "description" ? null : createEditorData(excerptText),
  };
};

// ============================================================================
// Component
// ============================================================================

export const AIWriterModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductAIWriterModalPayload;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<IGeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, watch } = useForm<IAIWriterForm>({
    defaultValues: {
      target: "both",
      tone: "professional",
      instructions: "",
    },
  });

  const target = watch("target");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  // Build product context for AI
  const productContext = {
    title: typedPayload.product.title,
    category:
      typedPayload.product.primaryCategory?.title ||
      typedPayload.product.categories[0]?.title ||
      null,
    attributes: typedPayload.product.attributes
      .flatMap((g) => g.features.map((f) => `${g.title}: ${f.title}`))
      .slice(0, 5),
    price: typedPayload.product.price,
  };

  const handleGenerate = async (values: IAIWriterForm) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await mockGenerateContent({
        productContext,
        target: values.target,
        tone: values.tone,
        instructions: values.instructions,
      });

      setGeneratedContent(response);
    } catch {
      setError("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generatedContent) return;

    typedPayload.onApply?.({
      description: generatedContent.description
        ? renderContent(generatedContent.description)
        : undefined,
      excerpt: generatedContent.excerpt
        ? renderContent(generatedContent.excerpt)
        : undefined,
    });
    pop();
  };

  const handleRegenerate = (field: "description" | "excerpt") => {
    handleSubmit((values) => {
      const newTarget: AIGenerateTarget = field;
      handleGenerate({ ...values, target: newTarget });
    })();
  };

  return (
    <ModalLayout
      name="ai-writer"
      header={
        <ModalHeader
          name="ai-writer"
          rawTitle
          title={
            <div className={styles.headerTitle}>
              <ThunderboltOutlined className={styles.headerIcon} />
              <span>Write with AI</span>
            </div>
          }
          onClose={pop}
          submitButtonProps={
            generatedContent
              ? {
                  children: "Apply to Product",
                  onClick: handleApply,
                }
              : null
          }
        />
      }
    >
      <Paper className={styles.formSection}>
        {/* Product Context Card */}
        <div className={styles.contextCard}>
          <Typography.Text className={styles.contextHeader}>
            Product Context
          </Typography.Text>
          <div className={styles.contextRow}>
            <TagOutlined className={styles.contextIcon} />
            <Typography.Text className={styles.contextLabel}>
              Title
            </Typography.Text>
            <Typography.Text className={styles.contextValue}>
              {productContext.title}
            </Typography.Text>
          </div>
          {productContext.category && (
            <div className={styles.contextRow}>
              <FolderOutlined className={styles.contextIcon} />
              <Typography.Text className={styles.contextLabel}>
                Category
              </Typography.Text>
              <Typography.Text className={styles.contextValue}>
                {productContext.category}
              </Typography.Text>
            </div>
          )}
          {productContext.attributes.length > 0 && (
            <div className={styles.contextRow}>
              <TagOutlined className={styles.contextIcon} />
              <Typography.Text className={styles.contextLabel}>
                Attributes
              </Typography.Text>
              <Typography.Text className={styles.contextValue}>
                {productContext.attributes.join(" | ")}
              </Typography.Text>
            </div>
          )}
        </div>

        {/* Generation Form */}
        <form>
          {/* Target Selection */}
          <div className={styles.formRow}>
            <Typography.Text strong className={styles.formLabel}>
              What to generate?
            </Typography.Text>
            <Controller
              name="target"
              control={control}
              render={({ field }) => (
                <Radio.Group
                  {...field}
                  optionType="button"
                  buttonStyle="solid"
                  size="middle"
                >
                  <Radio.Button value="description">
                    Full Description
                  </Radio.Button>
                  <Radio.Button value="excerpt">Short Excerpt</Radio.Button>
                  <Radio.Button value="both">Both</Radio.Button>
                </Radio.Group>
              )}
            />
          </div>

          {/* Tone & Language Row */}
          <div className={styles.formRow}>
            <div className={styles.selectRow}>
              <div className={styles.selectItem}>
                <Typography.Text strong className={styles.formLabel}>
                  Tone
                </Typography.Text>
                <Controller
                  name="tone"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} style={{ width: "100%" }} size="middle">
                      <Select.Option value="professional">
                        Professional
                      </Select.Option>
                      <Select.Option value="casual">Casual</Select.Option>
                      <Select.Option value="luxury">Luxury</Select.Option>
                      <Select.Option value="friendly">Friendly</Select.Option>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Additional Instructions */}
          <div className={styles.formRow}>
            <Typography.Text strong className={styles.formLabel}>
              Additional instructions (optional)
            </Typography.Text>
            <Controller
              name="instructions"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  placeholder="E.g., Focus on sustainability, mention free shipping, highlight premium materials..."
                  rows={3}
                  size="middle"
                />
              )}
            />
          </div>

          {/* Generate Button */}
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            size="large"
            block
            className={styles.generateButton}
            onClick={handleSubmit(handleGenerate)}
            loading={isGenerating}
          >
            Generate Content
          </Button>
        </form>

        {/* Error State */}
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginTop: 20 }}
          />
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className={styles.loadingContainer}>
            <Spin size="large" />
            <Typography.Text className={styles.loadingText}>
              AI is crafting your content...
            </Typography.Text>
          </div>
        )}

        {/* Generated Results */}
        {generatedContent && !isGenerating && (
          <>
            <Divider style={{ margin: "24px 0 0" }} />

            {(target === "description" || target === "both") &&
              generatedContent.description && (
                <div className={styles.resultSection}>
                  <div className={styles.resultHeader}>
                    <Typography.Text className={styles.resultTitle}>
                      Generated Description
                    </Typography.Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => handleRegenerate("description")}
                    >
                      Regenerate
                    </Button>
                  </div>
                  <BlockEditor
                    value={generatedContent.description}
                    onChange={(data) =>
                      setGeneratedContent((prev) => ({
                        ...prev!,
                        description: data,
                      }))
                    }
                    minHeight={150}
                  />
                </div>
              )}

            {(target === "excerpt" || target === "both") &&
              generatedContent.excerpt && (
                <div className={styles.resultSection}>
                  <div className={styles.resultHeader}>
                    <Typography.Text className={styles.resultTitle}>
                      Generated Excerpt
                    </Typography.Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => handleRegenerate("excerpt")}
                    >
                      Regenerate
                    </Button>
                  </div>
                  <BlockEditor
                    value={generatedContent.excerpt}
                    onChange={(data) =>
                      setGeneratedContent((prev) => ({
                        ...prev!,
                        excerpt: data,
                      }))
                    }
                    minHeight={100}
                  />
                </div>
              )}
          </>
        )}
      </Paper>
    </ModalLayout>
  );
};
