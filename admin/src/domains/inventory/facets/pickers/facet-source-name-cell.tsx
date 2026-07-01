"use client";

import { Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import type { CustomCellRendererProps } from "ag-grid-react";
import { getFacetTypeIcon } from "../mappers";
import type { FacetSourcePickerEntity } from "./facet-source-picker-config";

const useStyles = createStyles(({ token }) => ({
  sourceNameCell: {
    minWidth: 0,
  },
  sourceIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: token.colorTextSecondary,
    fontSize: 14,
  },
  sourceTitle: {
    lineHeight: 1.3,
  },
}));

export function FacetSourceNameCell(
  props: CustomCellRendererProps<FacetSourcePickerEntity>,
) {
  const { styles } = useStyles();
  const { data } = props;

  if (!data) return null;

  return (
    <Flex align="center" gap="small" className={styles.sourceNameCell}>
      <span className={styles.sourceIcon}>{getFacetTypeIcon(data.facetType)}</span>
      <Typography.Text strong className={styles.sourceTitle}>
        {data.title}
      </Typography.Text>
    </Flex>
  );
}
