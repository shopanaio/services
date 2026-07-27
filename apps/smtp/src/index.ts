import { defineApp } from "@shopana/app-sdk";
import { smtpManifest } from "../app.manifest.js";
import { SmtpApp } from "./SmtpApp.js";

export { smtpManifest } from "../app.manifest.js";
export {
  parseSmtpConfiguration,
  SMTP_PASSWORD_SECRET,
  type SmtpConfiguration,
  validateSmtpPassword,
} from "./configuration.js";
export { SmtpApp } from "./SmtpApp.js";

export default defineApp({
  manifest: smtpManifest,
  create: (host) => new SmtpApp(host),
});
