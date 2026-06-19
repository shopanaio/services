"use client";

import {
  Typography,
  Tag } from "antd";
import type { DependencyTargetType } from "@/domains/promos/bundles/dependency-rules/enums";
import {
  TARGET_TYPE_COLORS,
  CHART_NODE_ICONS,
} from "@/domains/promos/bundles/dependency-rules";
import { useStyles } from "../styles";

export interface IFlowBlockItem {
  key: string;
  targetType: DependencyTargetType;
  name: string | null;
  description: string;
}

interface IFlowBlockProps {
  label: string;
  items: IFlowBlockItem[];
}

export const FlowBlock = ({ label, items }: IFlowBlockProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.flowBlock}>
      <div className={styles.flowLabel}>{label}</div>
      {items.map((item) => (
        <div key={item.key} className={styles.flowRow}>
          <Tag
            className={styles.targetTag}
            color={TARGET_TYPE_COLORS[item.targetType]}
          >
            {CHART_NODE_ICONS[item.targetType]}
          </Tag>
          {item.name && (
            <Typography.Text className={styles.targetName}>
              {item.name}
            </Typography.Text>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.description}
          </Typography.Text>
        </div>
      ))}
    </div>
  );
};
