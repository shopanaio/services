import { registerLocalAdminApp } from "../runtime/local-app-registry";
import { CREATE_SMTP_CONNECTION_MODAL_ID, SMTP_DISCONNECT_MODAL_ID } from "./src/modals";

registerLocalAdminApp(
  {
    appCode: "shopana-smtp",
    remoteName: "shopana_smtp_admin",
    pageModule: "./Page",
    defaultPath: "connections",
    modals: [
      {
        id: CREATE_SMTP_CONNECTION_MODAL_ID,
        module: "./CreateSmtpConnectionModal",
        confirmOnDirtyClose: true,
        closeConfirmMessage: "Discard SMTP connection settings?",
        load: () => import("./src/modals/create-smtp-connection-modal"),
      },
      {
        id: SMTP_DISCONNECT_MODAL_ID,
        module: "./SmtpDisconnectModal",
        load: () => import("./src/modals/smtp-disconnect-modal"),
      },
    ],
  },
  () => import("./src/page"),
);
