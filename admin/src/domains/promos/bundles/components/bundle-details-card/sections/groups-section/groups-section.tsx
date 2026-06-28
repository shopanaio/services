"use client";

import { Empty } from "antd";
import type { IBundleGroup } from "@/domains/promos/bundles/types";
import { useStyles } from "./styles";
import { GroupLane } from "./components/group-lane";

interface IGroupsSectionProps {
  groups: IBundleGroup[];
  onEdit: () => void;
}

export const GroupsSection = ({
  groups,
  onEdit,
}: IGroupsSectionProps) => {
  const { styles } = useStyles();

  if (!groups || groups.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No bundle groups configured"
      />
    );
  }

  return (
    <div className={styles.lanes}>
      {groups.map((group) => (
        <GroupLane key={group.id} group={group} onClick={onEdit} />
      ))}
    </div>
  );
};
