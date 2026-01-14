"use client";

import { useMemo, useCallback } from "react";
import { Tooltip } from "antd";
import { CheckCircleFilled, MinusCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type ValueGetterParams,
} from "ag-grid-community";
import { Action } from "@/graphql/types";

ModuleRegistry.registerModules([AllCommunityModule]);
import type { ApiResourceDefinition } from "@/graphql/types";
import { PERMISSION_LEVELS } from "../constants";
import type { FormPermission, IPermissionCategory } from "../types";
import { useAgGridTheme } from "@/hooks";

const useStyles = createStyles(({ token }) => ({
  container: {
    width: "100%",

    "--ag-row-border": "transparent",

    ".ag-cell": {
      display: "flex",
      alignItems: "center",
      fontSize: 13,
    },
  },
  resourceCell: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 0",
  },
  resourceLabel: {
    fontWeight: 500,
    lineHeight: 1.4,
  },
  resourceDescription: {
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: 1.3,
  },
  levelCell: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  levelButton: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    border: "2px solid transparent",
  },
  levelButtonInactive: {
    background: token.colorBgContainerDisabled,
    color: token.colorTextDisabled,
    "&:hover": {
      borderColor: token.colorBorder,
      color: token.colorTextSecondary,
    },
  },
  levelButtonActive: {
    color: token.colorWhite,
  },
  levelButtonDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
    "&:hover": {
      borderColor: "transparent",
    },
  },
}));

interface IPermissionMatrixProps {
  categories: IPermissionCategory[];
  permissions: FormPermission[];
  onChange: (permissions: FormPermission[]) => void;
  disabled?: boolean;
}

interface RowData {
  id: string;
  resource: ApiResourceDefinition;
  category: IPermissionCategory;
}

export const PermissionMatrix = ({
  categories,
  permissions,
  onChange,
  disabled = false,
}: IPermissionMatrixProps) => {
  const { styles, cx, theme } = useStyles();
  const agGridTheme = useAgGridTheme();

  const rowData = useMemo((): RowData[] => {
    return categories.flatMap((category) =>
      category.resources.map((resource) => ({
        id: resource.name,
        resource,
        category,
      }))
    );
  }, [categories]);

  const getPermissionForResource = useCallback(
    (resource: string): Action | null => {
      return permissions.find((p) => p.resource === resource)?.action ?? null;
    },
    [permissions]
  );

  const handlePermissionChange = useCallback(
    (resource: string, action: Action | null) => {
      if (disabled) return;

      const currentAction = getPermissionForResource(resource);
      const newAction = currentAction === action ? null : action;

      const newPermissions = permissions.map((p) =>
        p.resource === resource ? { ...p, action: newAction } : p
      );
      onChange(newPermissions);
    },
    [disabled, getPermissionForResource, permissions, onChange]
  );

  const getLevelColor = useCallback(
    (action: Action): string => {
      switch (action) {
        case Action.Read:
          return theme.colorInfo;
        case Action.Write:
          return theme.colorWarning;
        case Action.Admin:
          return theme.colorError;
      }
    },
    [theme]
  );

  const ResourceCellRenderer = useCallback(
    (params: ICellRendererParams<RowData>) => {
      const { resource } = params.data!;
      return (
        <div className={styles.resourceCell}>
          <div className={styles.resourceLabel}>
            {resource.displayName ?? resource.name}
          </div>
          <div className={styles.resourceDescription}>
            {resource.description ?? resource.displayName ?? resource.name}
          </div>
        </div>
      );
    },
    [styles]
  );

  const createLevelCellRenderer = useCallback(
    (level: (typeof PERMISSION_LEVELS)[number]) => {
      const LevelCellRenderer = (params: ICellRendererParams<RowData>) => {
        const resourceName = params.data!.resource.name;
        const currentAction = getPermissionForResource(resourceName);
        const isActive = currentAction === level.action;
        const bgColor = isActive ? getLevelColor(level.action) : undefined;

        return (
          <div className={styles.levelCell}>
            <Tooltip
              title={disabled ? "System roles cannot be modified" : level.label}
            >
              <div
                className={cx(
                  styles.levelButton,
                  isActive
                    ? styles.levelButtonActive
                    : styles.levelButtonInactive,
                  disabled && styles.levelButtonDisabled
                )}
                style={isActive ? { background: bgColor } : undefined}
                onClick={() =>
                  handlePermissionChange(resourceName, level.action)
                }
              >
                {isActive ? (
                  <CheckCircleFilled style={{ fontSize: 16 }} />
                ) : (
                  <MinusCircleOutlined style={{ fontSize: 16 }} />
                )}
              </div>
            </Tooltip>
          </div>
        );
      };
      return LevelCellRenderer;
    },
    [
      cx,
      disabled,
      getLevelColor,
      getPermissionForResource,
      handlePermissionChange,
      styles,
    ]
  );

  const columnDefs = useMemo((): ColDef<RowData>[] => {
    const resourceColumn: ColDef<RowData> = {
      headerName: "Resource",
      field: "resource",
      flex: 1,
      minWidth: 200,
      cellRenderer: ResourceCellRenderer,
      autoHeight: true,
    };

    const levelColumns: ColDef<RowData>[] = PERMISSION_LEVELS.map((level) => ({
      headerName: level.label,
      field: level.action,
      width: 100,
      cellRenderer: createLevelCellRenderer(level),
      headerTooltip: level.description,
      valueGetter: (params: ValueGetterParams<RowData>) =>
        getPermissionForResource(params.data!.resource.name),
    }));

    return [resourceColumn, ...levelColumns];
  }, [ResourceCellRenderer, createLevelCellRenderer, getPermissionForResource]);

  const defaultColDef = useMemo(
    (): ColDef<RowData> => ({
      resizable: false,
      sortable: false,
      suppressMovable: true,
    }),
    []
  );

  return (
    <div className={styles.container}>
      <AgGridReact<RowData>
        theme={agGridTheme}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(params) => params.data.id}
        headerHeight={44}
        rowHeight={60}
        domLayout="autoHeight"
        suppressRowHoverHighlight
        suppressCellFocus
      />
    </div>
  );
};
