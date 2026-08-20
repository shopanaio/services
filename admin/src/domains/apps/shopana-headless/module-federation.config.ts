const singleton = {
  singleton: true,
  requiredVersion: false,
} as const;

const config = {
  name: "shopana_headless_admin",
  filename: "remoteEntry.js",
  exposes: {
    "./Page": "./src/page.tsx",
    "./CreateStorefrontModal": "./src/modals/create-storefront-modal.tsx",
    "./RenameStorefrontModal": "./src/modals/rename-storefront-modal.tsx",
    "./DisconnectStorefrontModal": "./src/modals/disconnect-storefront-modal.tsx",
  },
  shared: {
    react: singleton,
    "react-dom": singleton,
    antd: singleton,
    "antd-style": singleton,
    "@ant-design/cssinjs": singleton,
    "@apollo/client": singleton,
    "ag-grid-react": singleton,
    "ag-grid-community": singleton,
  },
} as const;

export default config;
