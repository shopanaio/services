"use client";

import { Empty, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import type { ApiProductComponentGroup } from "@/graphql/types";
import { ProductComponentItemRow } from "./product-component-item-row";

const useStyles = createStyles(({ token }) => ({
  groups: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  group: {
    padding: "10px 12px 4px",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 6,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
}));

function getSelectionLabel(group: ApiProductComponentGroup) {
  const minimum = group.minSelection ?? 0;
  const maximum = group.maxSelection;

  if (minimum === 0 && maximum == null) return "Optional";
  if (maximum == null) return `At least ${minimum}`;
  if (minimum === maximum) return `Select ${minimum}`;
  return `Select ${minimum}–${maximum}`;
}

export const ProductComponentGroupsSection = ({
  groups,
}: {
  groups: ApiProductComponentGroup[];
}) => {
  const { styles } = useStyles();

  if (groups.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No component groups configured"
      />
    );
  }

  return (
    <div className={styles.groups}>
      {[...groups]
        .sort((left, right) => left.sortIndex - right.sortIndex)
        .map((group) => (
          <div key={group.id} className={styles.group}>
            <div className={styles.header}>
              <Typography.Text strong>{group.title}</Typography.Text>
              <div className={styles.meta}>
                <Tag>{group.items.length} items</Tag>
                <Tag color={(group.minSelection ?? 0) > 0 ? "blue" : undefined}>
                  {getSelectionLabel(group)}
                </Tag>
              </div>
            </div>
            {[...group.items]
              .sort((left, right) => left.sortIndex - right.sortIndex)
              .map((item) => (
                <ProductComponentItemRow key={item.id} item={item} />
              ))}
          </div>
        ))}
    </div>
  );
};
