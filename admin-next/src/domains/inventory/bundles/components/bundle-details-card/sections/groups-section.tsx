"use client";

import { Typography, Flex, Avatar } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  IComponentGroup,
  ComponentItem,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import { ComponentItemType } from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  groupCard: {
    flex: 1,
    minWidth: 180,
    padding: 12,
    background: token.colorBgContainer,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  groupTitle: {
    fontSize: 13,
  },
  groupItemsCount: {
    fontSize: 11,
  },
  avatarRow: {
    margin: "12px 0",
    minHeight: 40,
    display: "flex",
    alignItems: "center",
  },
  avatarPlaceholder: {
    "&&": {
      background: token.colorFillSecondary,
      color: token.colorTextQuaternary,
    },
  },
  groupMeta: {
    fontSize: token.fontSizeSM,
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IGroupsSectionProps {
  groups: IComponentGroup[];
  onEdit: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

const getItemImageUrl = (item: ComponentItem): string | null => {
  if (item.featuredImage?.url) {
    return item.featuredImage.url;
  }
  if (item.itemType === ComponentItemType.VARIANT && item.assignedVariant) {
    return item.assignedVariant.media?.[0]?.file?.url ?? null;
  }
  return null;
};

// ============================================================================
// Component
// ============================================================================

export const GroupsSection = ({
  groups,
  onEdit,
}: IGroupsSectionProps) => {
  const { styles } = useStyles();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Component Groups"
        actions={<EditAction onEdit={onEdit} label="Edit groups" />}
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
                    ),
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
