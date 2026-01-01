import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  InMemoryCache,
  HttpLink,
  ObservableQuery,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { createFragmentRegistry } from '@apollo/client/cache';

import { ReactNode } from 'react';

import { ProjectFragment } from '@modules/projects/graphql/fragments/project';
import { UserFragment } from '@modules/account/graphql/fragments/user';
import { LocaleFragment } from '@modules/locales/graphql/fragments/locale';
import {
  CategoryFragment,
  BrowseCategoryFragment,
} from '@modules/categories/graphql/fragments/category';
import {
  ProductFeatureFragment,
  ProductFragment,
  VariantFragment,
  ProductGroupFragment,
  ListingProductFragment,
  FeatureSwatchFragment,
  ProductFeatureV2Fragment,
  ProductFeatureSwatchV2Fragment,
} from '@modules/products/graphql/fragments/fragments';
import {
  PageFragment,
  BrowsePageFragment,
} from '@modules/pages/graphql/fragments';

import { TagFragment } from '@modules/tags/graphql/fragments';
import { ApiKeyFragment } from '@modules/apiKeys/graphql/fragments';
import { matchPath } from 'react-router-dom';
import { routes } from '@modules/router/routes';
import { FileFragment } from '@modules/media/graphql/fragments/file';
import { CustomerFragment } from '@modules/customers/graphql/fragments';
import {
  OrderFragment,
  AddressFragment,
  PaymentMethodFragment,
  PaymentServiceFragment,
  ShippingMethodFragment,
  ShippingServiceFragment,
  OrderItemFragment,
  PaymentItemFragment,
  ShippingItemFragment,
} from '@modules/orders/graphql/fragments';
import { CrmOrderFragment } from '@modules/crm/graphql/crm';
import { API_ROUTES } from '@modules/router/api';
import { getAuthToken } from '@src/utils/utils';
import { PROJECT_KEY_HEADER } from '@src/defs/constants';
import { ReviewFragment } from '@modules/reviews/graphql/fragments/review';
import {
  CartFragment,
  CartItemFragment,
} from '@modules/carts/graphql/fragments';

const authLink = setContext((_, { headers }) => {
  const token = getAuthToken();
  const match = matchPath(
    { path: routes.store.route, end: false },
    location.pathname,
  );

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(match?.params?.storeId
        ? { [PROJECT_KEY_HEADER]: match.params.storeId }
        : {}),
    },
  };
});

const httpLink = new HttpLink({
  uri: API_ROUTES.GRAPHQL,
  headers: {
    'Apollo-Require-Preflight': 'true',
  },
});

const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Content: {
        keyFields: false,
      },
      ProductFeature: {
        keyFields: false,
      },
      ProductFeatureV2: {
        keyFields: false,
      },
      Locale: {
        keyFields: ['code'],
      },
      Currency: {
        keyFields: ['code'],
      },
      ProductFeaturesSection: {
        keyFields: false,
      },
      StockStatus: {
        keyFields: ['code'],
      },
    },
    fragments: createFragmentRegistry(
      AddressFragment,
      ApiKeyFragment,
      BrowseCategoryFragment,
      BrowsePageFragment,
      CategoryFragment,
      CrmOrderFragment,
      CustomerFragment,
      FileFragment,
      ListingProductFragment,
      LocaleFragment,
      OrderFragment,
      OrderItemFragment,
      PageFragment,
      PaymentItemFragment,
      PaymentMethodFragment,
      PaymentServiceFragment,
      ProductFeatureFragment,
      ProductFragment,
      ProductGroupFragment,
      ProjectFragment,
      ReviewFragment,
      ShippingItemFragment,
      ShippingMethodFragment,
      ShippingServiceFragment,
      TagFragment,
      UserFragment,
      VariantFragment,
      CartFragment,
      CartItemFragment,
      FeatureSwatchFragment,
      ProductFeatureV2Fragment,
      ProductFeatureSwatchV2Fragment,
    ),
  }),
});

export { client as apolloClient };

export const Apollo = ({ children }: { children: ReactNode }) => (
  <ApolloProvider client={client}>{children}</ApolloProvider>
);

export const getRefetchQueries = () => {
  return Array.from(
    // @ts-expect-error
    client.queryManager.getObservableQueries()?.values() || [],
  )
    .map((it) => (it as ObservableQuery).queryName)
    .filter(
      (q) => q && !['Me', 'Project', 'GetLocales'].includes(q),
    ) as string[];
};
