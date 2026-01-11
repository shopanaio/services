import { Dropdown, Spin } from "antd";
import type { DropdownProps, MenuProps } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { useCallback, useRef } from "react";

const useStyles = createStyles(() => ({
  dropdownMenu: {
    maxHeight: 300,
    overflowY: "auto",
    "& .ant-dropdown-menu": {
      maxHeight: "none",
      overflow: "visible",
      boxShadow: "none",
    },
  },
  loadingItem: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 0",
  },
}));

export interface IScrollableDropdownProps
  extends Omit<DropdownProps, "dropdownRender"> {
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadingKey?: string;
  threshold?: number;
}

export const ScrollableDropdown = ({
  children,
  menu,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  loadingKey = "loading",
  threshold = 50,
  ...dropdownProps
}: IScrollableDropdownProps) => {
  const { styles } = useStyles();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const isNearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <
        threshold;

      if (isNearBottom && hasNextPage && !isLoadingMore) {
        onLoadMore();
      }
    },
    [hasNextPage, isLoadingMore, onLoadMore, threshold]
  );

  const menuWithLoading: MenuProps | undefined = menu
    ? {
        ...menu,
        items: isLoadingMore
          ? [
              ...(menu.items ?? []),
              {
                key: loadingKey,
                label: (
                  <div className={styles.loadingItem}>
                    <Spin indicator={<LoadingOutlined spin />} size="small" />
                  </div>
                ),
              },
            ]
          : menu.items,
        onClick: (info) => {
          if (info.key !== loadingKey) {
            menu.onClick?.(info);
          }
        },
      }
    : undefined;

  return (
    <Dropdown
      {...dropdownProps}
      menu={menuWithLoading}
      dropdownRender={(menuNode) => (
        <div
          ref={menuRef}
          className={styles.dropdownMenu}
          onScroll={handleScroll}
        >
          {menuNode}
        </div>
      )}
    >
      {children}
    </Dropdown>
  );
};
