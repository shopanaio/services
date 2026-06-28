"use client";

import { Typography, Tag } from "antd";
import {
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import type { IBundleGroup } from "@/domains/inventory/bundles/types";
import { getSelectionLabel } from "../helpers";
import { useStyles } from "../styles";
import { BundleItemRow } from "./bundle-item-row";

interface IGroupLaneProps {
  group: IBundleGroup;
  onClick?: () => void;
}

export const GroupLane = ({ group, onClick }: IGroupLaneProps) => {
  const { styles } = useStyles();

  // Derive isRequired/isMultiple from min/max
  const isRequired = group.minSelection != null && group.minSelection > 0;
  const isMultiple = group.maxSelection == null || group.maxSelection > 1;
  const selectionLabel = getSelectionLabel(group);

  return (
    <div className={styles.lane} onClick={onClick}>
      <div className={styles.laneHeader}>
        <div className={styles.laneInfo}>
          <Typography.Text className={styles.laneTitle}>
            {group.title}
          </Typography.Text>
          <Typography.Text type="secondary" className={styles.laneCount}>
            {group.items?.length || 0} items
          </Typography.Text>
        </div>
        <div className={styles.laneTags}>
          <Tag
            className={styles.laneTag}
            icon={isRequired ? <LockOutlined /> : <UnlockOutlined />}
          >
            {isRequired ? "Required" : "Optional"}
          </Tag>
          <Tag
            className={styles.laneTag}
            icon={isMultiple ? <CheckSquareOutlined /> : <CheckCircleOutlined />}
          >
            {isMultiple
              ? `Multiple ${selectionLabel ?? ""}`
              : "Single"}
          </Tag>
        </div>
      </div>
      <div className={styles.laneBody}>
        {group.items?.map((item) => (
          <BundleItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
