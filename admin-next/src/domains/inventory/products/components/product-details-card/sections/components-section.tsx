"use client";

import { Typography, Flex, Avatar } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useComponentsStyles } from "../product-details-card.styles";
import type { IComponentGroup } from "../../../modals/edit-components-modal/types";

interface IComponentsSectionProps {
  groups: IComponentGroup[];
  onEdit: () => void;
  getItemImage?: (productId: string, variantId?: string | null) => string | null;
}

export const ComponentsSection = ({
  groups,
  onEdit,
  getItemImage,
}: IComponentsSectionProps) => {
  const { styles } = useComponentsStyles();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Components"
        actions={<EditAction onEdit={onEdit} label="Edit components" />}
      />
      <Flex gap={8} wrap="wrap">
        {groups.map((group) => {
          const itemImages = group.items?.map((item) => {
            return getItemImage?.(item.productId, item.variantId) ?? null;
          });

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
                  group.minSelection > 0 && `Min: ${group.minSelection}`,
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
