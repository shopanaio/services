"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Radio,
  Select,
  Input,
  Button,
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
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { BlockEditor, renderContent } from "@/ui-kit/block-editor";
import { Paper } from "@/ui-kit/paper";
import type {
  IProductAIWriterModalPayload,
  AIGenerateTarget,
} from "../../modals";
import { useStyles } from "./ai-writer-modal.styles";
import type { IAIWriterForm, IGeneratedContent } from "./types";
import { mockGenerateContent } from "@/mocks/products/ai-writer";

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
