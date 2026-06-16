"use client";

import { Flex, Image, Typography } from "antd";
import { createStyles } from "antd-style";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { IPickableEntity } from "../types";

const useStyles = createStyles(({ token }) => ({
  image: {
    borderRadius: token.borderRadiusXS,
    objectFit: "cover" as const,
    flexShrink: 0,
  },
  title: {
    lineHeight: 1.3,
  },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: token.borderRadiusXS,
    background: token.colorBgContainerDisabled,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextQuaternary,
    fontSize: token.fontSizeSM,
    flexShrink: 0,
  },
}));

export function EntityCellRenderer<T extends IPickableEntity>(
  props: CustomCellRendererProps<T>
) {
  const { styles } = useStyles();
  const { data } = props;

  if (!data) return null;

  return (
    <Flex align="center" gap="small">
      {data.image ? (
        <Image
          src={data.image}
          alt={data.title}
          width={40}
          height={40}
          className={styles.image}
          preview={false}
        />
      ) : (
        <div className={styles.placeholder}>—</div>
      )}
      <Typography.Text strong className={styles.title}>
        {data.title}
      </Typography.Text>
    </Flex>
  );
}
