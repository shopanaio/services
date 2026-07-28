import { registerLocalAdminApp } from "../runtime/local-app-registry";
import {
  CREATE_STOREFRONT_MODAL_ID,
  DISCONNECT_STOREFRONT_MODAL_ID,
  RENAME_STOREFRONT_MODAL_ID,
} from "./src/modals";

registerLocalAdminApp(
  {
    appCode: "shopana-headless",
    remoteName: "shopana_headless_admin",
    pageModule: "./Page",
    defaultPath: "storefronts",
    modals: [
      {
        id: CREATE_STOREFRONT_MODAL_ID,
        module: "./CreateStorefrontModal",
        confirmOnDirtyClose: true,
        closeConfirmMessage: "Discard storefront connection settings?",
        load: () => import("./src/modals/create-storefront-modal"),
      },
      {
        id: RENAME_STOREFRONT_MODAL_ID,
        module: "./RenameStorefrontModal",
        confirmOnDirtyClose: true,
        closeConfirmMessage: "Discard storefront name changes?",
        load: () => import("./src/modals/rename-storefront-modal"),
      },
      {
        id: DISCONNECT_STOREFRONT_MODAL_ID,
        module: "./DisconnectStorefrontModal",
        load: () => import("./src/modals/disconnect-storefront-modal"),
      },
    ],
  },
  () => import("./src/page"),
);
