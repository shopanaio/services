"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Divider, Dropdown } from "antd";
import { LuPlus as PlusOutlined, LuFolder as FolderOutlined } from "react-icons/lu";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";

import { useStyles } from "./edit-groups-modal.styles";
import { ComponentGroupsGrid, rowsToGroups } from "./components";
import type { ComponentGroupsGridHandle } from "./components/component-groups-grid";
import type { ApiProductComponentGroup, ApiProductComponentPricingTemplate } from "@/graphql/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditGroupsModalPayload {
  groups: ApiProductComponentGroup[];
  pricingTemplates: ApiProductComponentPricingTemplate[];
  onSave?: (groups: ApiProductComponentGroup[]) => boolean | void | Promise<boolean | void>;
}

// ============================================================================
// Component
// ============================================================================

export const EditGroupsModal = () => {
  const { styles } = useStyles();
  const { pop, forcePop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditGroupsModalPayload | undefined;
  const pricingTemplates = modalPayload?.pricingTemplates ?? [];
  const [saving, setSaving] = useState(false);

  // Grid ref for accessing methods
  const gridRef = useRef<ComponentGroupsGridHandle>(null);

  // Handle rows change
  const handleRowsChange = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (saving) return;
    const rows = gridRef.current?.getRows() ?? [];
    const groups = rowsToGroups(rows);
    setSaving(true);
    try {
      const shouldClose = await modalPayload?.onSave?.(groups);
      if (shouldClose !== false) {
        setDirty(false);
        forcePop();
      }
    } finally {
      setSaving(false);
    }
  }, [forcePop, modalPayload, saving, setDirty]);

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
              "data-testid": "component-groups-add-group-menu-item",
              onClick: () => gridRef.current?.addGroup(),
            },
          ],
        }}
        trigger={["click"]}
      >
        <Button size="small" icon={<PlusOutlined />} data-testid="component-groups-add-button">
          Add
        </Button>
      </Dropdown>
      <Divider orientation="vertical" style={{ height: 48, margin: 0 }} />
    </div>
  );

  return (
    <ModalLayout
      name="edit-component-groups"
      fullWidth
      bodyClassName={styles.body}
      headerProps={{
        title: "Edit Component Items",
        onClose: pop,
        extra: headerExtra,
        submitButtonProps: {
          onClick: handleSave,
          children: "Save",
          loading: saving,
        },
      }}
    >
      <div className={styles.content}>
        <div className={styles.gridContainer}>
          <ComponentGroupsGrid
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
