"use client";

import { Tag } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type { IBundleGroup } from "@/domains/promos/bundles/types";
import type { BundleType } from "@/mocks/products/bundles-list";
import { BUNDLE_TYPE_CONFIG } from "./constants";
import { useStyles } from "./styles";
import { GroupLane } from "./components/group-lane";

interface IGroupsSectionProps {
  groups: IBundleGroup[];
  bundleType?: BundleType | null;
  onEdit: () => void;
}

export const GroupsSection = ({
  groups,
  bundleType,
  onEdit,
}: IGroupsSectionProps) => {
  const { styles } = useStyles();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Bundle"
        extra={
          bundleType && BUNDLE_TYPE_CONFIG[bundleType] ? (
            <Tag color={BUNDLE_TYPE_CONFIG[bundleType].color}>
              {BUNDLE_TYPE_CONFIG[bundleType].label}
            </Tag>
          ) : undefined
        }
        actions={<EditAction onEdit={onEdit} label="Edit bundle items" />}
      />
      <div className={styles.lanes}>
        {groups.map((group) => (
          <GroupLane key={group.id} group={group} />
        ))}
      </div>
    </Paper>
  );
};
