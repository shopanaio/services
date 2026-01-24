"use client";

import { Typography, Tag } from "antd";
import {
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import type { IBundleGroup } from "@/domains/promos/bundles/types";
import { getSelectionLabel } from "../helpers";
import { useStyles } from "../styles";
import { BundleItemRow } from "./bundle-item-row";

interface IGroupLaneProps {
  group: IBundleGroup;
  onClick?: () => void;
}

export const GroupLane = ({ group, onClick }: IGroupLaneProps) => {
  const { styles } = useStyles();

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
            icon={group.isRequired ? <LockOutlined /> : <UnlockOutlined />}
          >
            {group.isRequired ? "Required" : "Optional"}
          </Tag>
          <Tag
            className={styles.laneTag}
            icon={
              group.isMultiple ? (
                <CheckSquareOutlined />
              ) : (
                <CheckCircleOutlined />
              )
            }
          >
            {group.isMultiple
              ? `Multiple ${getSelectionLabel(group)}`
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
