import {
  ShoppingOutlined,
  UsergroupAddOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useIntl } from 'react-intl';
import { routes } from '@modules/router/routes';
import { t } from '@src/lang/messages';
import {
  MdNotes,
  MdOutlineCategory,
  MdOutlineRateReview,
} from 'react-icons/md';
import { Typography } from 'antd';
import { CgBoard } from 'react-icons/cg';
import { TbPackage } from 'react-icons/tb';
import { MiddleArrow } from '@modules/products/components/variants/Arrows';
import { css } from '@emotion/react';

export const sidebarMenuItems = {
  carts: {
    key: 'carts',
    route: routes.carts,
    parent: null,
  },
  orders: {
    key: 'orders',
    route: routes.orders,
    parent: null,
  },
  fulfillment: {
    key: 'fulfillment',
    route: routes.fulfillment,
    parent: null,
  },
  customers: {
    key: 'customers',
    route: routes.customers,
    parent: null,
  },
  products: {
    key: 'products',
    route: routes.products,
    parent: null,
  },
  categories: {
    key: 'categories',
    route: routes.categories,
    parent: null,
  },
  content: {
    key: 'content',
    route: null,
    parent: null,
  },
  pages: {
    key: 'pages',
    route: routes.pages,
    parent: 'content',
  },
  menus: {
    key: 'menus',
    route: routes.menus,
    parent: 'content',
  },
  media: {
    key: 'media',
    route: routes.media,
    parent: 'content',
  },
  translations: {
    key: 'translations',
    route: routes.translations,
    parent: 'content',
  },
  settings: {
    key: 'settings',
    route: routes.settings,
    parent: null,
  },
  searchDiscovery: {
    key: 'searchDiscovery',
    route: routes.searchFilters,
    parent: null,
  },
  searchFilters: {
    key: 'searchFilters',
    route: routes.searchFilters,
    parent: 'searchDiscovery',
  },
  searchSynonyms: {
    key: 'searchSynonyms',
    route: routes.searchSynonyms,
    parent: 'searchDiscovery',
  },
  searchRecommendations: {
    key: 'searchRecommendations',
    route: routes.searchRecommendations,
    parent: 'searchDiscovery',
  },
  searchSettings: {
    key: 'searchSettings',
    route: routes.searchSettings,
    parent: 'searchDiscovery',
  },
  productReviews: {
    key: 'productReviews',
    route: routes.productReviews,
    parent: null,
  },
};

const SubitemIcon = ({ isFinal }: { isFinal?: boolean }) => {
  return (
    <div
      css={css`
        margin-left: -22px;
        margin-right: var(--x3);
        margin-top: var(--x3);
      `}
    >
      <MiddleArrow isFinal={isFinal} />
    </div>
  );
};

export const useMenuItems = () => {
  const { formatMessage } = useIntl();

  return [
    {
      label: (
        <Typography.Text ellipsis type="secondary">
          {formatMessage({ id: t('layouts.sidebar.group.store') })}
        </Typography.Text>
      ),
      key: 'store',
      ['data-testid']: 'sidebar-menu-group-store',
      type: 'group',
      children: [
        {
          label: formatMessage({ id: t('sidebar.menu_item.products') }),
          key: sidebarMenuItems.products.key,
          icon: <TbPackage />,
          ['data-testid']: 'sidebar-menu-item-products',
        },
        {
          label: formatMessage({ id: t('sidebar.menu_item.categories') }),
          key: sidebarMenuItems.categories.key,
          icon: <MdOutlineCategory />,
          ['data-testid']: 'sidebar-menu-item-categories',
        },
        {
          label: formatMessage({ id: t('layouts.sidebar.item.content') }),
          key: sidebarMenuItems.content.key,
          icon: <MdNotes />,
          ['data-testid']: 'sidebar-menu-item-online-store',
          children: [
            {
              icon: <SubitemIcon />,
              label: formatMessage({ id: t('sidebar.menu_item.pages') }),
              key: sidebarMenuItems.pages.key,
              ['data-testid']: 'sidebar-menu-item-pages',
            },
            {
              icon: <SubitemIcon />,
              label: formatMessage({ id: t('layouts.sidebar.item.menus') }),
              key: sidebarMenuItems.menus.key,
              ['data-testid']: 'sidebar-menu-item-menus',
            },
            {
              icon: <SubitemIcon />,
              label: formatMessage({ id: t('layouts.sidebar.item.files') }),
              key: sidebarMenuItems.media.key,
              ['data-testid']: 'sidebar-menu-item-media',
            },
            {
              icon: <SubitemIcon isFinal />,
              label: formatMessage({
                id: t('layouts.sidebar.item.translations'),
              }),
              key: sidebarMenuItems.translations.key,
              ['data-testid']: 'sidebar-menu-item-translations',
            },
          ],
        },
      ],
    },
    {
      label: (
        <Typography.Text ellipsis type="secondary">
          {formatMessage({ id: t('layouts.sidebar.group.marketing') })}
        </Typography.Text>
      ),
      key: 'marketing',
      ['data-testid']: 'sidebar-menu-group-marketing',
      type: 'group',
      children: [
        {
          label: formatMessage({ id: t('layouts.sidebar.item.reviews') }),
          key: sidebarMenuItems.productReviews.key,
          ['data-testid']: 'sidebar-menu-item-product-reviews',
          icon: <MdOutlineRateReview />,
        },
      ],
    },
    {
      label: (
        <Typography.Text ellipsis type="secondary">
          {formatMessage({ id: t('layouts.sidebar.group.salesCustomers') })}
        </Typography.Text>
      ),
      key: 'sales',
      ['data-testid']: 'sidebar-menu-group-sales',
      type: 'group',
      children: [
        {
          label: formatMessage({ id: t('sidebar.menu_item.customers') }),
          key: sidebarMenuItems.customers.key,
          ['data-testid']: 'sidebar-menu-item-customers',
          icon: <UsergroupAddOutlined />,
        },
        // {
        //   label: formatMessage({ id: t('layouts.sidebar.item.carts') }),
        //   key: sidebarMenuItems.carts.key,
        //   ['data-testid']: 'sidebar-menu-item-carts',
        //   icon: <ShoppingCartOutlined />,
        // },
        {
          label: formatMessage({ id: t('sidebar.menu_item.orders') }),
          key: sidebarMenuItems.orders.key,
          ['data-testid']: 'sidebar-menu-item-orders',
          icon: <ShoppingOutlined />,
        },
        // {
        //   label: formatMessage({ id: t('layouts.sidebar.item.fulfillment') }),
        //   key: sidebarMenuItems.fulfillment.key,
        //   ['data-testid']: 'sidebar-menu-item-orders-board',
        //   icon: <CgBoard />,
        // },
      ],
    },
    {
      label: (
        <Typography.Text ellipsis type="secondary">
          {formatMessage({ id: t('layouts.sidebar.group.administration') })}
        </Typography.Text>
      ),
      key: 'administration',
      ['data-testid']: 'sidebar-menu-group-system',
      type: 'group',
      children: [
        {
          label: formatMessage({ id: t('sidebar.menu_item.settings') }),
          key: sidebarMenuItems.settings.key,
          icon: <SettingOutlined />,
          ['data-testid']: 'sidebar-menu-item-settings',
        },
      ],
    },
  ];
};

export const items = []; // Placeholder, use useMenuItems() hook
