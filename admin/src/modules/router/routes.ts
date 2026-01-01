class R {
  private static _STORE_ID = '';

  static get STORE_ID() {
    if (!this._STORE_ID) {
      throw new Error('Store ID is not set');
    }

    return this._STORE_ID;
  }

  static setStoreId(id: string) {
    this._STORE_ID = id;
  }

  static login = {
    path: '/auth',
    route: '/auth',
    link: '/auth',
    url: `${location.origin}/auth`,
  };
  static stores = {
    path: '/stores',
    route: '/stores',
    link: `/stores`,
    url: `${location.origin}/stores`,
  };
  static createProject = {
    path: '/create-store',
    route: '/create-store',
    link: `/create-store`,
    url: `${location.origin}/create-store`,
  };
  static account = {
    path: '/account',
    route: '/account',
    link: `/account`,
    url: `${location.origin}/account`,
  };
  static store = {
    path: '/store/:storeId/',
    route: '/store/:storeId',
    get link() {
      return `/store/${R.STORE_ID}`;
    },
    get url() {
      return `${location.origin}/store/${R.STORE_ID}`;
    },
    getUrl(storeId: string) {
      return `${location.origin}/store/${storeId}`;
    },
  };
  static products = {
    path: 'products',
    route: '/store/:storeId/products',
    get link() {
      return `/store/${R.STORE_ID}/products`;
    },
  };
  static categories = {
    path: 'categories',
    route: '/store/:storeId/categories',
    get link() {
      return `/store/${R.STORE_ID}/categories`;
    },
  };
  static features = {
    path: 'features',
    route: '/store/:storeId/features',
    get link() {
      return `/store/${R.STORE_ID}/features`;
    },
  };
  static tags = {
    path: 'tags',
    route: '/store/:storeId/tags',
    get link() {
      return `/store/${R.STORE_ID}/tags`;
    },
  };
  static orders = {
    path: 'orders',
    route: '/store/:storeId/orders',
    get link() {
      return `/store/${R.STORE_ID}/orders`;
    },
  };
  static carts = {
    path: 'carts',
    route: '/store/:storeId/carts',
    get link() {
      return `/store/${R.STORE_ID}/carts`;
    },
  };
  static fulfillment = {
    path: 'fulfillment',
    route: '/store/:storeId/fulfillment',
    get link() {
      return `/store/${R.STORE_ID}/fulfillment`;
    },
  };
  static customers = {
    path: 'customers',
    route: '/store/:storeId/customers',
    get link() {
      return `/store/${R.STORE_ID}/customers`;
    },
  };
  static posts = {
    path: 'posts',
    route: '/store/:storeId/posts',
    get link() {
      return `/store/${R.STORE_ID}/posts`;
    },
  };
  static topics = {
    path: 'topics',
    route: '/store/:storeId/topics',
    get link() {
      return `/store/${R.STORE_ID}/topics`;
    },
  };
  static media = {
    path: 'media',
    route: '/store/:storeId/media',
    get link() {
      return `/store/${R.STORE_ID}/media`;
    },
  };
  static menus = {
    path: 'menus',
    route: '/store/:storeId/menus',
    get link() {
      return `/store/${R.STORE_ID}/menus`;
    },
  };
  static pages = {
    path: 'pages',
    route: '/store/:storeId/pages',
    get link() {
      return `/store/${R.STORE_ID}/pages`;
    },
  };
  static onlineStorePreferences = {
    path: 'preferences',
    route: '/store/:storeId/preferences',
    get link() {
      return `/store/${R.STORE_ID}/preferences`;
    },
  };
  static settings = {
    path: 'settings/:tab?',
    route: '/store/:storeId/settings/:tab',
    get link() {
      return `/store/${R.STORE_ID}/settings/general`;
    },
    tabLink(tab: string) {
      return `/store/${R.STORE_ID}/settings/${tab}`;
    },
  };
  static csv = {
    path: '/store/:storeId/csv',
    route: '/store/:storeId/csv',
    get link() {
      return `/store/${R.STORE_ID}/csv`;
    },
  };
  static searchFilters = {
    path: '/store/:storeId/search-filters',
    route: '/store/:storeId/search-filters',
    get link() {
      return `/store/${R.STORE_ID}/search-filters`;
    },
  };
  static searchSynonyms = {
    path: '/store/:storeId/search-synonyms',
    route: '/store/:storeId/search-synonyms',
    get link() {
      return `/store/${R.STORE_ID}/search-synonyms`;
    },
  };
  static searchRecommendations = {
    path: '/store/:storeId/search-recommendations',
    route: '/store/:storeId/search-recommendations',
    get link() {
      return `/store/${R.STORE_ID}/search-recommendations`;
    },
  };
  static searchSettings = {
    path: '/store/:storeId/search-settings',
    route: '/store/:storeId/search-settings',
    get link() {
      return `/store/${R.STORE_ID}/search-settings`;
    },
  };
  static translations = {
    path: '/store/:storeId/translations',
    route: '/store/:storeId/translations',
    get link() {
      return `/store/${R.STORE_ID}/translations`;
    },
  };
  static productReviews = {
    path: '/store/:storeId/product-reviews',
    route: '/store/:storeId/product-reviews',
    get link() {
      return `/store/${R.STORE_ID}/product-reviews`;
    },
  };
}

export const routes = R;
