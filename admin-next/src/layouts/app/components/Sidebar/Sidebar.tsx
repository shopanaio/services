"use client";

import { useState, useMemo, useEffect } from "react";
import { ConfigProvider, Layout, Menu, MenuProps, Typography } from "antd";
import { StoreMenu } from "@/layouts/app/components/StoreMenu/StoreMenu";
import { SidebarLogo } from "@/layouts/app/components/Sidebar/SidebarLogo";
import { createStyles } from "antd-style";
import { useSidebarItems, type SidebarItem } from "@/registry";
import { SubitemIcon } from "@/ui-kit/Arrows/Arrows";
import { usePathname } from "next/navigation";
import { match } from "path-to-regexp";

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

function buildMenuItems(
  items: SidebarItem[],
  isSubitem = false,
  parentChildrenCount = 0
): AntMenuItem[] {
  return items.map((item, index) => {
    const isFinal = isSubitem && index === parentChildrenCount - 1;
    const icon = isSubitem
      ? <SubitemIcon isFinal={isFinal} />
      : item.icon;

    if (item.type === "group") {
      return {
        key: item.key,
        label: (
          <Typography.Text ellipsis type="secondary">
            {item.label}
          </Typography.Text>
        ),
        type: "group" as const,
        children: item.children
          ? buildMenuItems(item.children, false, 0)
          : [],
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
  ({ css }, { collapsed }: { collapsed: boolean }) => ({
    siderPlaceholder: css`
      background: var(--color-gray-2);
      border-right: 1px solid var(--color-gray-5);
    `,
    siderFixed: css`
      overflow-y: auto;
      overflow-x: hidden;
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      background: transparent;

      /* Hide scrollbar */
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar {
        display: none;
      }
    `,
    content: css`
      transition: transform 0.2s ease;
      transform: ${collapsed
        ? "translateX(var(--x1))"
        : "translateX(var(--x2))"};
    `,
    menu: css`
      border: none;
      transition: width 0.2s ease;
      background: transparent;
      width: ${collapsed ? "calc(100% - var(--x2))" : "calc(100% - var(--x4))"};
    `,
  })
);

export const Sidebar = () => {
  const pathname = usePathname();
  const sidebarItems = useSidebarItems();
  const menuItems = useMemo(() => buildMenuItems(sidebarItems), [sidebarItems]);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const { styles } = useStyles({ collapsed });

  const onOpenChange: MenuProps["onOpenChange"] = (keys) => {
    const latestOpenKey = keys.at(-1);
    setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
  };

  const onCollapse = (value: boolean) => setCollapsed(value);

  useEffect(() => {
    const matched = findMatchingItem(sidebarItems, pathname);
    if (!matched) {
      return;
    }
    setSelectedKeys([matched.key]);
    setTimeout(() => {
      if (collapsed || !matched.parentKey) {
        return;
      }
      setOpenKeys([matched.parentKey]);
    }, 100);
  }, [pathname, sidebarItems, collapsed]);

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
            />
          </ConfigProvider>
        </div>
      </Layout.Sider>
    </>
  );
};
