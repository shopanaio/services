"use client";

import { useMemo, useEffect } from "react";
import { ConfigProvider, Layout, Menu, MenuProps, Typography } from "antd";
import { StoreMenu } from "@/layouts/app/components/store-menu/store-menu";
import { SidebarLogo } from "@/layouts/app/components/sidebar/sidebar-logo";
import { createStyles } from "antd-style";
import { useSidebarItems, usePathParamsOptional, type SidebarItem } from "@/registry";
import { SubitemIcon } from "@/ui-kit/arrows/arrows";
import { usePathname, useRouter } from "next/navigation";
import { match } from "path-to-regexp";
import { useSidebarStore } from "./sidebar-store";

type AntMenuItem = NonNullable<MenuProps["items"]>[number];

interface MatchedItem {
  key: string;
  parentKey?: string;
}

function findMatchingItem(
  items: SidebarItem[],
  pathname: string,
  parentKey?: string
): MatchedItem | null {
  for (const item of items) {
    if (item.path) {
      const matcher = match(item.path, { decode: decodeURIComponent });
      if (matcher(pathname)) {
        return { key: item.key, parentKey };
      }
    }
    if (item.children) {
      const found = findMatchingItem(
        item.children,
        pathname,
        item.type === "group" ? parentKey : item.key
      );
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findItemByKey(items: SidebarItem[], key: string): SidebarItem | null {
  for (const item of items) {
    if (item.key === key) {
      return item;
    }
    if (item.children) {
      const found = findItemByKey(item.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function buildMenuItems(
  items: SidebarItem[],
  isSubitem = false,
  parentChildrenCount = 0
): AntMenuItem[] {
  return items.map((item, index) => {
    const isFinal = isSubitem && index === parentChildrenCount - 1;
    const icon = isSubitem ? <SubitemIcon isFinal={isFinal} /> : item.icon;

    if (item.type === "group") {
      return {
        key: item.key,
        label: (
          <Typography.Text ellipsis type="secondary">
            {item.label}
          </Typography.Text>
        ),
        type: "group" as const,
        children: item.children ? buildMenuItems(item.children, false, 0) : [],
      };
    }

    if (item.children && item.children.length > 0) {
      return {
        key: item.key,
        label: item.label,
        icon,
        children: buildMenuItems(item.children, true, item.children.length),
      };
    }

    return {
      key: item.key,
      label: item.label,
      icon,
    };
  });
}

const useStyles = createStyles(
  ({ css, token }, { collapsed }: { collapsed: boolean }) => ({
    siderPlaceholder: css`
      background: ${token.colorBgLayout};
      border-right: 1px solid ${token.colorFill};
    `,
    siderFixed: css`
      overflow-y: auto;
      overflow-x: hidden;
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      background: transparent;
      display: flex;
      flex-direction: column;

      /* Hide scrollbar */
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar {
        display: none;
      }
    `,
    content: css`
      flex: 1;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease;
      transform: ${collapsed
        ? `translateX(${token.paddingXXS}px)`
        : `translateX(${token.paddingXS}px)`};
    `,
    menu: css`
      border: none;
      transition: width 0.2s ease;
      background: transparent;
      flex: 1;
      width: ${collapsed
        ? `calc(100% - ${token.paddingXS}px)`
        : `calc(100% - ${token.padding}px)`};
    `,
  })
);

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarItems = useSidebarItems();
  const pathContext = usePathParamsOptional();
  const menuItems = useMemo(() => buildMenuItems(sidebarItems), [sidebarItems]);
  const { collapsed, openKeys, setCollapsed, setOpenKeys } = useSidebarStore();
  const { styles } = useStyles({ collapsed });

  // Derive selectedKeys from pathname
  const selectedKeys = useMemo(() => {
    const matched = findMatchingItem(sidebarItems, pathname);
    return matched ? [matched.key] : [];
  }, [sidebarItems, pathname]);

  const onOpenChange: MenuProps["onOpenChange"] = (keys) => {
    const latestOpenKey = keys.at(-1);
    setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
  };

  const onClick: MenuProps["onClick"] = (info) => {
    const item = findItemByKey(sidebarItems, info.key);
    if (item?.path) {
      // Resolve path patterns with current params (e.g., /:orgName/:storeName/products -> /acme/main/products)
      const resolvedPath = pathContext?.resolvePath(item.path) ?? item.path;
      router.push(resolvedPath);
    }
  };

  const onCollapse = (value: boolean) => setCollapsed(value);

  // Auto-open parent submenu when navigating to a page
  useEffect(() => {
    const matched = findMatchingItem(sidebarItems, pathname);
    if (matched?.parentKey && !collapsed && !openKeys.includes(matched.parentKey)) {
      setOpenKeys([matched.parentKey]);
    }
  }, [pathname, sidebarItems, collapsed, openKeys, setOpenKeys]);

  return (
    <>
      <Layout.Sider
        collapsible
        theme="light"
        collapsed={collapsed}
        collapsedWidth={72}
        width={260}
        trigger={null}
        onCollapse={onCollapse}
        className={styles.siderPlaceholder}
      />
      <Layout.Sider
        collapsible
        theme="light"
        collapsed={collapsed}
        collapsedWidth={72}
        width={260}
        trigger={null}
        className={styles.siderFixed}
      >
        <div className={styles.content}>
          <SidebarLogo isCollapsed={collapsed} />
          <StoreMenu isCollapsed={collapsed} />
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  activeBarBorderWidth: 0,
                  itemHeight: 32,
                  itemMarginInline: 0,
                  itemMarginBlock: 4,
                  subMenuItemBg: "transparent",
                },
              },
            }}
          >
            <Menu
              className={styles.menu}
              selectedKeys={selectedKeys}
              theme="light"
              mode="inline"
              items={menuItems}
              openKeys={openKeys}
              onOpenChange={onOpenChange}
              onClick={onClick}
            />
          </ConfigProvider>
        </div>
      </Layout.Sider>
    </>
  );
};
