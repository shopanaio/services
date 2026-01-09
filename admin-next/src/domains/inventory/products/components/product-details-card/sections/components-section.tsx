"use client";

import { Typography, Tag, Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useComponentsStyles } from "../product-details-card.styles";
import type { IComponentGroup } from "../../../modals/edit-components-modal/types";
import { getProductById, getVariantById } from "../../../modals/edit-components-modal/mocks/mock-data";

interface IComponentsSectionProps {
  groups: IComponentGroup[];
  onEdit: () => void;
}

export const ComponentsSection = ({
  groups,
  onEdit,
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
      <Flex vertical gap={8}>
        {groups.map((group) => (
          <div key={group.id} className={styles.groupBox}>
            <Flex justify="space-between" align="center">
              <Typography.Text strong className={styles.groupTitle}>
                {group.title}
              </Typography.Text>
              <Flex gap={4}>
                {group.isRequired && (
                  <Tag color="red" className={styles.groupTag}>
                    Required
                  </Tag>
                )}
                {group.isMultiple && (
                  <Tag
                    color="blue"
                    className={styles.groupTag}
                    variant="outlined"
                  >
                    Multiple
                  </Tag>
                )}
                <Typography.Text
                  type="secondary"
                  className={styles.groupItemsCount}
                >
                  {group.items?.length || 0} items
                </Typography.Text>
              </Flex>
            </Flex>
            {group.items && group.items.length > 0 && (
              <Flex gap={4} wrap="wrap" className={styles.groupItems}>
                {group.items.map((item) => {
                  const product = getProductById(item.productId);
                  const variant = item.variantId
                    ? getVariantById(item.productId, item.variantId)
                    : undefined;
                  return (
                    <Tag key={item.id} className={styles.groupItemTag}>
                      {item.customTitle ||
                        variant?.title ||
                        product?.title ||
                        "\u2014"}
                    </Tag>
                  );
                })}
              </Flex>
            )}
          </div>
        ))}
      </Flex>
    </Paper>
  );
};
