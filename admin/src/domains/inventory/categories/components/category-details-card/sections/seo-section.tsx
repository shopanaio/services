"use client";

import { Button } from "antd";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { EntitySeoSection } from "@/domains/inventory/components/entity-details-sections";
import type { ApiCategory } from "@/graphql/types";
import { getCategoryRoutePath } from "../../../utils/category-route-path";

interface SeoSectionProps {
  category: ApiCategory;
  onEdit?: () => void;
}

export const SeoSection = ({ category, onEdit }: SeoSectionProps) => {
  const categoryPath = getCategoryRoutePath(category);

  return (
    <EntitySeoSection
      sectionTestId="category-seo-section"
      data={{
        seoTitle: category.seo?.seoTitle ?? null,
        seoDescription: category.seo?.seoDescription ?? null,
        ogTitle: category.seo?.ogTitle ?? null,
        ogDescription: category.seo?.ogDescription ?? null,
        ogImage: category.seo?.ogImage ?? null,
        title: category.name,
        excerpt: category.excerpt?.text ?? null,
        slug: categoryPath,
        baseUrl: "shopana.store",
        resourcePath: `categories › ${categoryPath}`,
      }}
      actions={
        <>
          {onEdit ? (
            <EditAction
              label="Edit SEO"
              onEdit={onEdit}
              testId="category-seo-actions-button"
            />
          ) : null}
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
        </>
      }
    />
  );
};
