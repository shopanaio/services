"use client";

import { Typography, Flex, Avatar } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useBundleItemsStyles } from "../product-details-card.styles";
import type { IBundleGroup, BundleItem } from "@/domains/inventory/bundles/types";
import { BundleItemType } from "@/domains/inventory/bundles/types";

interface IBundleItemsSectionProps {
  groups: IBundleGroup[];
  onEdit?: () => void;
}

// Helper to get image from bundle item
const getItemImageUrl = (item: BundleItem): string | null => {
  if (item.featuredImage?.url) {
    return item.featuredImage.url;
  }

  if (item.itemType === BundleItemType.VARIANT && item.assignedVariant) {
    return item.assignedVariant.media?.[0]?.file?.url ?? null;
  }

  // ApiProduct doesn't have media directly in current schema
  return null;
};

export const BundleItemsSection = ({
  groups,
  onEdit,
}: IBundleItemsSectionProps) => {
  const { styles } = useBundleItemsStyles();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Bundle Items"
        actions={onEdit && <EditAction onEdit={onEdit} label="Edit bundle items" />}
      />
      <Flex gap={8} wrap="wrap">
        {groups.map((group) => {
          const itemImages = group.items?.map((item) => getItemImageUrl(item));

          return (
            <div key={group.id} className={styles.groupCard}>
              <Flex justify="space-between" align="center">
                <Typography.Text strong className={styles.groupTitle}>
                  {group.title}
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  className={styles.groupItemsCount}
                >
                  {group.items?.length || 0} items
                </Typography.Text>
              </Flex>
              <div className={styles.avatarRow}>
                <Avatar.Group
                  max={{ count: 5, popover: { trigger: "hover" } }}
                  size={40}
                  shape="square"
                >
                  {itemImages?.map((img, idx) =>
                    img ? (
                      <Avatar key={idx} src={img} />
                    ) : (
                      <Avatar
                        key={idx}
                        icon={<PictureOutlined />}
                        className={styles.avatarPlaceholder}
                      />
                    )
                  )}
                </Avatar.Group>
              </div>
              <Typography.Text type="secondary" className={styles.groupMeta}>
                {[
                  group.isMultiple && "Multiple",
                  group.isRequired && "Required",
                  group.minSelection && group.minSelection > 0 && `Min: ${group.minSelection}`,
                  group.maxSelection && `Max: ${group.maxSelection}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography.Text>
            </div>
          );
        })}
      </Flex>
    </Paper>
  );
};
