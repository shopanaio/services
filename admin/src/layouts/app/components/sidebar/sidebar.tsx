"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { ConfigProvider, Layout, Menu, MenuProps, Typography } from "antd";
import { StoreMenu } from "@/layouts/app/components/store-menu/store-menu";
import { SidebarLogo } from "@/layouts/app/components/sidebar/sidebar-logo";
import { createStyles } from "antd-style";
import {
  SidebarRuntimeProviders,
  useSidebarItems,
  usePathParams,
  type SidebarItem,
} from "@/registry";
import { SubitemIcon } from "@/ui-kit/arrows/arrows";
import { usePathname, useRouter } from "next/navigation";
import { match } from "path-to-regexp";
import { useSidebarStore } from "./sidebar-store";
import {
  mergeDynamicSidebarItems,
  useDynamicSidebarStore,
} from "./dynamic-sidebar-store";

type AntMenuItem = NonNullable<MenuProps["items"]>[number];

interface MatchedItem {
  key: string;
  parentKey?: string;
}

function wrapMenuIcon(icon: ReactNode): ReactNode {
  return icon ? <span>{icon}</span> : icon;
}

function findMatchingItem(
  items: SidebarItem[],
  pathname: string,
  parentKey?: string
): MatchedItem | null {
  for (const item of items) {
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
    if (item.path) {
      const paths = [item.path, ...(item.activePaths ?? [])];
      if (
        paths.some((path) =>
          match(path, { decode: decodeURIComponent })(pathname),
        )
      ) {
        return { key: item.key, parentKey };
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
    const icon =
      isSubitem && !item.icon
        ? <SubitemIcon isFinal={isFinal} />
        : wrapMenuIcon(item.icon);

    if (item.type === "group") {
      return {
        key: item.key,
        label: (
          <Typography.Text ellipsis type="secondary">
            {item.icon} {item.label}
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
        disabled: item.disabled,
        children: buildMenuItems(item.children, true, item.children.length),
      };
    }

    return {
      key: item.key,
      label: item.label,
      icon,
      disabled: item.disabled,
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
      padding-bottom: 200px;
      width: ${collapsed
        ? `calc(100% - ${token.paddingXS}px)`
        : `calc(100% - ${token.padding}px)`};
    `,
  })
);

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const staticSidebarItems = useSidebarItems();
  const dynamicChildren = useDynamicSidebarStore(
    (state) => state.childrenByParentKey,
  );
  const pathContext = usePathParams();
  const sidebarItems = useMemo(
    () => mergeDynamicSidebarItems(staticSidebarItems, dynamicChildren),
    [dynamicChildren, staticSidebarItems],
  );
  const menuItems = useMemo(() => buildMenuItems(sidebarItems), [sidebarItems]);
  const { collapsed, openKeys, setCollapsed, setOpenKeys } = useSidebarStore();
  const { styles } = useStyles({ collapsed });
  const lastMatchedParentKeyRef = useRef<string | undefined>(undefined);

  const matchedItem = useMemo(
    () => findMatchingItem(sidebarItems, pathname),
    [sidebarItems, pathname],
  );

  // Derive selectedKeys from pathname
  const selectedKeys = useMemo(() => {
    return matchedItem ? [matchedItem.key] : [];
  }, [matchedItem]);

  useEffect(() => {
    const parentKey = matchedItem?.parentKey;
    const parentChanged = parentKey !== lastMatchedParentKeyRef.current;

    lastMatchedParentKeyRef.current = parentKey;

    if (parentChanged && parentKey) {
      if (openKeys.length !== 1 || openKeys[0] !== parentKey) {
        setOpenKeys([parentKey]);
      }
      return;
    }

    if (openKeys.length > 1) {
      setOpenKeys([openKeys[openKeys.length - 1]]);
    }
  }, [matchedItem?.parentKey, openKeys, setOpenKeys]);

  const onOpenChange: MenuProps["onOpenChange"] = (keys) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
  };

  const onClick: MenuProps["onClick"] = (info) => {
    const item = findItemByKey(sidebarItems, info.key);
    if (item?.path) {
      // Resolve path patterns with current params (e.g., /:orgName/:storeName/products -> /acme/main/products)
      const resolvedPath = pathContext.resolvePath(item.path);
      router.push(resolvedPath);
    }
  };

  const onCollapse = (value: boolean) => setCollapsed(value);

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
        <SidebarRuntimeProviders />
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
                  paddingContentHorizontal: 0,
                  itemPaddingInline: 0,
                  itemMarginBlock: 0,
                  subMenuItemBg: "transparent",
                },
              },
            }}
          >
            <Menu
              className={styles.menu}
              inlineIndent={16}
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
