const singleton = {
  singleton: true,
  requiredVersion: false,
} as const;

const config = {
  name: "shopana_smtp_admin",
  filename: "remoteEntry.js",
  exposes: {
    "./Page": "./src/page.tsx",
    "./CreateSmtpConnectionModal": "./src/modals/create-smtp-connection-modal.tsx",
    "./SmtpDisconnectModal": "./src/modals/smtp-disconnect-modal.tsx",
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
