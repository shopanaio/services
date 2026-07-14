"use client";

import { Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import type { CustomCellRendererProps } from "ag-grid-react";
import { getFacetTypeIcon } from "../mappers";
import type { FacetPickerEntity } from "./facet-picker-config";

const useStyles = createStyles(({ token }) => ({
  cell: {
    minWidth: 0,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: token.colorTextSecondary,
    fontSize: 14,
  },
  identity: {
    minWidth: 0,
  },
  slug: {
    fontSize: token.fontSizeSM,
  },
}));

export function FacetPickerNameCell(
  props: CustomCellRendererProps<FacetPickerEntity>,
) {
  const { styles } = useStyles();
  const { data } = props;
  if (!data) return null;

  return (
    <Flex align="center" gap="small" className={styles.cell}>
      <span className={styles.icon}>{getFacetTypeIcon(data.facetType)}</span>
      <Flex vertical className={styles.identity}>
        <Typography.Text strong ellipsis>
          {data.title}
        </Typography.Text>
        <Typography.Text type="secondary" ellipsis className={styles.slug}>
          {data.slug}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
