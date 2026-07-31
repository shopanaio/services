"use client";

import { useState, useRef, type ReactNode } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { LuChevronLeft as LeftOutlined, LuChevronRight as RightOutlined } from "react-icons/lu";

import { useStyles } from "./navigable-dropdown.styles";

// ============================================================================
// Types
// ============================================================================

export interface IMenuLevel {
  key: string;
  label: string;
  icon?: ReactNode;
  /** If provided without children, acts as a leaf item */
  onClick?: () => void;
  children?: Array<{
    key: string;
    label: string;
    onClick: () => void;
  }>;
}

interface INavigableDropdownProps {
  levels: IMenuLevel[];
  children: ReactNode;
  testId?: string;
}

// ============================================================================
// Component
// ============================================================================

export const NavigableDropdown = ({
  levels,
  children,
  testId,
}: INavigableDropdownProps) => {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [activeParent, setActiveParent] = useState<string | null>(null);
  const navigatingRef = useRef(false);

  const activeLevel = levels.find((l) => l.key === activeParent);

  const handleMenuClick: MenuProps["onClick"] = (info) => {
    const level = levels.find((l) => l.key === info.key);
    if (level?.children?.length) {
      // Has children — navigate to sublevel
      navigatingRef.current = true;
      setActiveParent(info.key);
    } else if (level?.onClick) {
      // Leaf item — fire and close
      level.onClick();
      setOpen(false);
    }
  };

  const topLevelItems: MenuProps["items"] = levels.map((level) => {
    const hasChildren = level.children && level.children.length > 0;
    return {
      key: level.key,
      icon: level.icon,
      "data-testid": testId ? `${testId}-option-${level.key}` : undefined,
      label: (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{level.label}</span>
          {hasChildren && <RightOutlined style={{ fontSize: 10, color: "rgba(0,0,0,0.25)" }} />}
        </span>
      ),
    };
  });

  return (
    <Dropdown
      menu={{ items: activeParent ? [] : topLevelItems, onClick: handleMenuClick }}
      trigger={["click"]}
      open={open}
      onOpenChange={(v) => {
        if (navigatingRef.current) {
          navigatingRef.current = false;
          return;
        }
        setOpen(v);
        if (!v) setActiveParent(null);
      }}
      popupRender={(menu) =>
        activeParent && activeLevel && activeLevel.children?.length ? (
          <div
            className={styles.panel}
            data-testid={testId ? `${testId}-children` : undefined}
          >
            <div
              className={styles.back}
              onClick={() => {
                navigatingRef.current = true;
                setActiveParent(null);
              }}
            >
              <LeftOutlined style={{ fontSize: 10 }} />
              <span>{activeLevel.label}</span>
            </div>
            <div className={styles.list}>
              {(activeLevel.children ?? []).map((child) => (
                <div
                  key={child.key}
                  className={styles.listItem}
                  data-testid={testId ? `${testId}-child-${child.key}` : undefined}
                  onClick={() => {
                    child.onClick();
                    setOpen(false);
                    setActiveParent(null);
                  }}
                >
                  {child.label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          menu
        )
      }
    >
      {children}
    </Dropdown>
  );
};
