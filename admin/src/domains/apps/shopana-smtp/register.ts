import { registerLocalAdminApp } from "../runtime/local-app-registry";
import {
  SMTP_DISCONNECT_MODAL_ID,
  SMTP_SETTINGS_MODAL_ID,
} from "./src/modals";

registerLocalAdminApp(
  {
    appCode: "shopana-smtp",
    remoteName: "shopana_smtp_admin",
    pageModule: "./Page",
    defaultPath: "connections",
    modals: [
      {
        id: SMTP_SETTINGS_MODAL_ID,
        module: "./SmtpSettingsModal",
        confirmOnDirtyClose: true,
        closeConfirmMessage: "Discard SMTP settings changes?",
        load: () => import("./src/modals/smtp-settings-modal"),
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
