"use client";

import { Button, Dropdown, Flex } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { EntityContentTabs } from "@/domains/inventory/components/entity-details-sections";
import type { ApiCategory } from "@/graphql/types";

// ============================================================================
// Types
// ============================================================================

interface ICategoryContentTabsProps {
  category: ApiCategory;
  onEdit?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const CategoryContentTabs = ({
  category,
  onEdit,
}: ICategoryContentTabsProps) => {
  const descriptionHtml = category.description?.html ?? null;
  const excerptHtml = category.excerpt?.html ?? null;

  return (
    <EntityContentTabs
      descriptionHtml={descriptionHtml}
      excerptHtml={excerptHtml}
      sectionTestId="category-content-section"
      descriptionTestId="category-content-description"
      excerptTestId="category-content-excerpt"
      onEdit={onEdit}
      descriptionEmpty={{
        title: "No description added",
        description:
          "Add a detailed category description to help customers understand what this category contains.",
        actionLabel: "Add description",
      }}
      excerptEmpty={{
        title: "No excerpt added",
        description:
          "Add a short category excerpt for previews, search snippets, and quick scans.",
        actionLabel: "Add excerpt",
      }}
      actions={
        <Flex gap={8}>
          <Dropdown
            menu={{
              items: [
                {
                  key: "edit",
                  label: "Edit content",
                  onClick: onEdit,
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button
              size="small"
              icon={<MoreOutlined />}
              data-testid="category-content-actions-button"
            />
          </Dropdown>
        </Flex>
      }
    />
  );
};
