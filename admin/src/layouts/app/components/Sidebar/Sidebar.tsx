import { useEffect, useState } from 'react';
import { ConfigProvider, Layout, Menu, MenuProps } from 'antd';
import {
  useMenuItems,
  sidebarMenuItems,
} from '@src/layouts/app/components/Sidebar/config';
import { StoreMenu } from '@src/layouts/app/components/StoreMenu/StoreMenu';
import { SelectInfo } from 'rc-menu/lib/interface';
import { router } from '@modules/router/router';
import { matchPath, useLocation } from 'react-router-dom';
import { SidebarLogo } from '@src/layouts/app/components/Sidebar/SidebarLogo';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';

interface Props extends MenuProps {}

export const Sidebar = (menuProps: Props) => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<(string | never)[]>([]);
  const [openKeys, setOpenKeys] = useState<(string | never)[]>([]);
  const items = useMenuItems();

  const onOpenChange: MenuProps['onOpenChange'] = (keys) => {
    const latestOpenKey = keys.at(-1);
    setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
  };

  const onCollapse = (value: boolean) => setCollapsed(value);
  const onSelect = ({ key }: SelectInfo) => {
    // @ts-expect-error
    const link = sidebarMenuItems[key]?.route?.link;
    if (link) {
      router.navigate(link);
    }
  };

  useEffect(() => {
    const sidebarItemKey = Object.values(sidebarMenuItems).find((el) => {
      if (!el?.route) {
        return false;
      }

      return Boolean(matchPath(el.route.route, pathname));
    });
    if (!sidebarItemKey) {
      return;
    }
    setSelectedKeys([sidebarItemKey.key]);
    setTimeout(() => {
      if (collapsed || !sidebarItemKey.parent) {
        return;
      }
      onOpenChange([sidebarItemKey.parent]);
    }, 100);
  }, [pathname, collapsed]);

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
        style={{
          background: 'var(--color-gray-2)',
          borderRight: '1px solid var(--color-gray-5)',
        }}
      />
      <Layout.Sider
        collapsible
        theme="light"
        collapsed={collapsed}
        collapsedWidth={72}
        width={260}
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'transparent',
        }}
      >
        <Box
          css={css`
            transition: transform 0.2s ease;
            transform: ${collapsed
              ? 'translateX(var(--x1))'
              : 'translateX(var(--x4))'};
          `}
        >
          <SidebarLogo isCollapsed={collapsed} />
          <StoreMenu isCollapsed={collapsed} />
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemHeight: 32,
                  itemMarginInline: 0,
                  itemMarginBlock: 4,
                  subMenuItemBg: 'transparent',
                },
              },
            }}
          >
            <Menu
              {...menuProps}
              style={{
                border: 'none',
                transition: 'width 0.2s ease',
                background: 'transparent',
                width: collapsed
                  ? 'calc(100% - var(--x2))'
                  : 'calc(100% - var(--x8))',
              }}
              selectedKeys={selectedKeys}
              theme="light"
              mode="inline"
              items={items}
              openKeys={openKeys}
              onOpenChange={onOpenChange}
              onSelect={onSelect}
            />
          </ConfigProvider>
        </Box>
      </Layout.Sider>
    </>
  );
};
