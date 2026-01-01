import { routes } from '@modules/router/routes';
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { withRoute } from '@modules/router/components/Route';
import { AppLayout } from '@src/layouts/app/components/Layout/Layout';

import {
  AuthRedirect,
  NotFoundRedirect,
} from '@modules/router/components/Redirect';
import { ProjectsLayoutFallback } from '@modules/projects/components/LayoutFallback';
import { AccountLayoutFallback } from '@modules/account/components/LayoutFallback';
import { AppLayoutNoSidebar } from '@src/layouts/app/components/Layout/LayoutNoSidebar';
import { OAuth2Callback } from '@modules/auth/components/Oath2Callback';

const Translations = lazy(
  () =>
    import(
      /* webpackChunkName: 'Translations' */ '@modules/translations/components/Translations'
    ),
);

const Reviews = lazy(
  () =>
    import(
      /* webpackChunkName: 'Reviews' */ '@modules/reviews/components/Reviews'
    ),
);

const CreateProject = lazy(
  () =>
    import(
      /* webpackChunkName: 'CreateProject' */ '@modules/projects/components/CreateProject/CreateProject'
    ),
);

const Auth = lazy(
  () => import(/* webpackChunkName: 'Auth' */ '@modules/auth/components/Auth'),
);

const Home = lazy(
  () => import(/* webpackChunkName: 'Home' */ '@modules/home/components/Home'),
);

const Account = lazy(
  () =>
    import(
      /* webpackChunkName: 'Account' */ '@modules/account/components/Account'
    ),
);

const Stores = lazy(
  () =>
    import(
      /* webpackChunkName: 'Stores' */ '@modules/projects/components/Stores'
    ),
);

// const Orders = lazy(
//   () =>
//     import(
//       /* webpackChunkName: 'Orders' */ '@modules/orders/components/Orders'
//     ),
// );

const Categories = lazy(
  () =>
    import(
      /* webpackChunkName: 'Categories' */ '@modules/categories/components/Categories'
    ),
);

const Products = lazy(
  () =>
    import(
      /* webpackChunkName: 'Products' */ '@modules/products/components/Products'
    ),
);

const Pages = lazy(
  () =>
    import(/* webpackChunkName: 'Posts' */ '@modules/pages/components/Pages'),
);

const Customers = lazy(
  () =>
    import(
      /* webpackChunkName: 'Customers' */ '@modules/customers/components/Customers'
    ),
);

const Media = lazy(
  () =>
    import(
      /* webpackChunkName: 'MediaFiles' */ '@modules/media/components/MediaFiles'
    ),
);

// const Reviews = lazy(
//   () =>
//     import(
//       /* webpackChunkName: 'Reviews' */ '@modules/reviews/components/Reviews'
//     ),
// );

// const Navigation = lazy(
//   () =>
//     import(
//       /* webpackChunkName: 'Navigation' */ '@modules/discovery/components/Navigation'
//     ),
// );

const Settings = lazy(
  () =>
    import(
      /* webpackChunkName: 'Settings' */ '@modules/settings/components/Settings'
    ),
);

// const CrmView = lazy(
//   () =>
//     import(
//       /* webpackChunkName: 'Settings' */ '@modules/crm/components/CrmView'
//     ),
// );

const Menus = lazy(
  () =>
    import(/* webpackChunkName: 'Menus' */ '@modules/menus/components/Menus'),
);

const Csv = lazy(
  () => import(/* webpackChunkName: 'Csv' */ '@modules/csv/components/Csv'),
);

const Carts = lazy(
  () =>
    import(/* webpackChunkName: 'Carts' */ '@modules/carts/components/Carts'),
);

export const router = createBrowserRouter([
  {
    path: routes.login.path,
    Component: withRoute(Auth),
  },
  {
    path: '/oauth2/callback',
    Component: withRoute(OAuth2Callback),
  },
  {
    path: routes.account.path,
    Component: withRoute(Account, {
      fallbackComponent: AccountLayoutFallback,
    }),
  },
  {
    path: routes.stores.path,
    Component: withRoute(Stores, {
      fallbackComponent: ProjectsLayoutFallback,
    }),
  },
  {
    path: routes.createProject.path,
    Component: withRoute(CreateProject, {
      fallbackComponent: ProjectsLayoutFallback,
    }),
  },
  {
    path: routes.csv.path,
    Component: withRoute(AppLayoutNoSidebar),
    children: [
      {
        index: true,
        Component: withRoute(Csv),
      },
    ],
  },
  {
    path: routes.store.path,
    Component: withRoute(AppLayout),
    children: [
      {
        index: true,
        Component: withRoute(Products),
      },
      {
        path: ':page?',
        Component: withRoute(Home),
      },
      {
        path: routes.pages.path,
        Component: withRoute(Pages),
      },
      {
        path: routes.categories.path,
        Component: withRoute(Categories),
      },
      {
        path: routes.products.path,
        Component: withRoute(Products),
      },
      {
        path: routes.customers.path,
        Component: withRoute(Customers),
      },
      {
        path: routes.media.path,
        Component: withRoute(Media),
      },
      // {
      //   path: routes.orders.path,
      //   Component: withRoute(Orders),
      // },
      // {
      //   path: routes.fulfillment.path,
      //   Component: withRoute(CrmView),
      // },
      {
        path: routes.carts.path,
        Component: withRoute(Carts),
      },
      // {
      //   path: routes.navigation.path,
      //   Component: withRoute(Navigation),
      // },
      {
        path: routes.menus.path,
        Component: withRoute(Menus),
      },
      {
        path: routes.settings.path,
        Component: withRoute(Settings),
      },
      {
        path: routes.productReviews.path,
        Component: withRoute(Reviews),
      },
      {
        path: routes.translations.path,
        Component: withRoute(Translations),
      },
      {
        path: '*',
        Component: NotFoundRedirect,
      },
    ],
  },
  {
    path: '*',
    Component: AuthRedirect,
  },
]);
