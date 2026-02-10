import { Dropdown, Spin } from "antd";
import type { DropdownProps } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import InfiniteScroll from "react-infinite-scroller";

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
  threshold?: number;
}

export const ScrollableDropdown = ({
  children,
  menu,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  threshold = 50,
  ...dropdownProps
}: IScrollableDropdownProps) => {
  const { styles } = useStyles();

  return (
    <Dropdown
      {...dropdownProps}
      menu={menu}
      dropdownRender={(menuNode) => (
        <div className={styles.dropdownMenu}>
          <InfiniteScroll
            loadMore={onLoadMore}
            hasMore={hasNextPage && !isLoadingMore}
            useWindow={false}
            threshold={threshold}
            loader={
              <div key="loader" className={styles.loadingItem}>
                <Spin indicator={<LoadingOutlined spin />} size="small" />
              </div>
            }
          >
            {menuNode}
          </InfiniteScroll>
        </div>
      )}
    >
      {children}
    </Dropdown>
  );
};
