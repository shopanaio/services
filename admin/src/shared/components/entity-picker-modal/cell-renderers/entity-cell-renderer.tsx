"use client";

import type { ReactNode } from "react";
import { Flex, Typography } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { IPickableEntity } from "../types";
import { TableCoverImage } from "@/shared/components/table-cover-image";

const useStyles = createStyles(({ token }) => ({
  image: {
    borderRadius: token.borderRadiusXS,
    objectFit: "cover" as const,
    flexShrink: 0,
  },
  title: {
    lineHeight: 1.3,
  },
}));

export function EntityCellRenderer<T extends IPickableEntity>(
  props: CustomCellRendererProps<T> & { fallbackIcon?: ReactNode },
) {
  const { styles } = useStyles();
  const { data, fallbackIcon = <PictureOutlined /> } = props;

  if (!data) return null;

  return (
    <Flex align="center" gap="small">
      <TableCoverImage
        src={data.image ?? null}
        alt={data.title}
        fallbackIcon={fallbackIcon}
        className={styles.image}
      />
      <Typography.Text strong className={styles.title}>
        {data.title}
      </Typography.Text>
    </Flex>
  );
}
