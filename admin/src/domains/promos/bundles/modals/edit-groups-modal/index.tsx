"use client";

import { useCallback, useRef } from "react";
import { Button, Divider, Dropdown } from "antd";
import { PlusOutlined, FolderOutlined } from "@ant-design/icons";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";

import { useStyles } from "./edit-groups-modal.styles";
import { BundleGroupsGrid, rowsToGroups } from "./components";
import type { BundleGroupsGridHandle } from "./components";
import type { IBundleGroup, PricingRuleTemplate } from "../../types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditGroupsModalPayload {
  groups: IBundleGroup[];
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (groups: IBundleGroup[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditGroupsModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditGroupsModalPayload | undefined;
  const pricingTemplates = modalPayload?.pricingTemplates ?? [];

  // Grid ref for accessing methods
  const gridRef = useRef<BundleGroupsGridHandle>(null);

  // Handle rows change
  const handleRowsChange = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  // Handle save
  const handleSave = useCallback(() => {
    const rows = gridRef.current?.getRows() ?? [];
    const groups = rowsToGroups(rows);
    modalPayload?.onSave?.(groups);
    pop();
  }, [modalPayload, pop]);

  // Header extra with Add button
  const headerExtra = (
    <div className={styles.headerExtra}>
      <Dropdown
        menu={{
          items: [
            {
              key: "group",
              label: "Add Group",
              icon: <FolderOutlined />,
              onClick: () => gridRef.current?.addGroup(),
            },
          ],
        }}
        trigger={["click"]}
      >
        <Button size="small" icon={<PlusOutlined />}>
          Add
        </Button>
      </Dropdown>
      <Divider orientation="vertical" style={{ height: 48, margin: 0 }} />
    </div>
  );

  return (
    <ModalLayout
      name="edit-bundle-groups"
      fullWidth
      bodyClassName={styles.body}
      headerProps={{
        title: "Edit Bundle Items",
        onClose: pop,
        extra: headerExtra,
        submitButtonProps: {
          onClick: handleSave,
          children: "Save",
        },
      }}
    >
      <div className={styles.content}>
        <div className={styles.gridContainer}>
          <BundleGroupsGrid
            ref={gridRef}
            groups={modalPayload?.groups ?? []}
            pricingTemplates={pricingTemplates}
            onRowsChange={handleRowsChange}
          />
        </div>
      </div>
    </ModalLayout>
  );
};

export default EditGroupsModal;
