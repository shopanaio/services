"use client";

import { Button, Flex, Typography } from "antd";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiCategory } from "@/graphql/types";
import { getCategoryRoutePath } from "../../../utils/category-route-path";

interface SeoSectionProps {
  category: ApiCategory;
  onEdit?: () => void;
}

export const SeoSection = ({ category, onEdit }: SeoSectionProps) => {
  const categoryPath = getCategoryRoutePath(category);
  const title = category.seo?.seoTitle || category.name;
  const description =
    category.seo?.seoDescription ||
    category.excerpt?.text ||
    "No SEO description";
  const seoIssuesCount =
    (!category.seo?.seoTitle ? 1 : 0) +
    (!category.seo?.seoDescription ? 1 : 0);

  return (
    <Paper data-testid="category-seo-section">
      <PaperHeader
        title="SEO"
        extra={
          seoIssuesCount > 0 ? (
            <Typography.Text style={{ fontSize: 11 }} type="danger">
              {seoIssuesCount} {seoIssuesCount === 1 ? "issue" : "issues"}
            </Typography.Text>
          ) : null
        }
        actions={
          onEdit ? (
            <EditAction
              label="Edit SEO"
              onEdit={onEdit}
              testId="category-seo-actions-button"
            />
          ) : null
        }
      />
      <Flex vertical gap={6}>
        <Typography.Text
          style={{ color: "#1a0dab", fontSize: 16 }}
          data-testid="category-seo-title"
        >
          {title}
        </Typography.Text>
        <Typography.Text
          type="success"
          style={{ fontSize: 12 }}
          data-testid="category-seo-url"
        >
          shopana.store/categories/{categoryPath}
        </Typography.Text>
        <Typography.Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ margin: 0 }}
          data-testid="category-seo-description"
        >
          {description}
        </Typography.Paragraph>
        {category.seo?.ogImage && (
          <Button
            size="small"
            type="link"
            href={category.seo.ogImage.url}
            target="_blank"
            style={{ alignSelf: "flex-start", padding: 0 }}
            data-testid="category-seo-og-image-link"
          >
            Open graph image
          </Button>
        )}
      </Flex>
    </Paper>
  );
};
