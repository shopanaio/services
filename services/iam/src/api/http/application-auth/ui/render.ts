import type { ApplicationAuthFactoryRuntime } from "../../../../auth/ApplicationAuthFactory.js";
import type { ApplicationAuthUiMessageKey } from "./localization.js";
import { createApplicationAuthTranslator } from "./localization.js";
import { APPLICATION_AUTH_UI_STYLE_PATH } from "./assets.js";

export function renderApplicationAuthPage(input: {
  runtime: ApplicationAuthFactoryRuntime;
  title: string;
  body: string;
}): string {
  const { runtime } = input;
  const branding = runtime.branding;
  const displayName = branding.displayName ?? "Shopana";
  const headline = branding.headline ? `<p class="muted">${escapeHtml(branding.headline)}</p>` : "";
  const logo = branding.logoUrl ? `<img src="${escapeAttribute(branding.logoUrl)}" alt="">` : "";
  const primary = branding.primaryColor ?? "blue";
  const background = branding.backgroundColor ?? "white";
  const t = createApplicationAuthTranslator(runtime.defaultLocale);
  return `<!doctype html>
<html lang="${escapeAttribute(runtime.defaultLocale)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)} · ${escapeHtml(displayName)}</title><link rel="stylesheet" href="${escapeAttribute(runtime.issuer + APPLICATION_AUTH_UI_STYLE_PATH)}"></head>
<body class="theme-primary-${primary} theme-background-${background}">
<main class="auth-shell" tabindex="-1"><header class="brand">${logo}<span class="brand-name">${escapeHtml(displayName)}</span></header>${headline}${input.body}<footer class="footer">${escapeHtml(t("securityFooter"))}</footer></main>
</body></html>`;
}

export function renderMessage(
  runtime: ApplicationAuthFactoryRuntime,
  kind: "error" | "success",
  key: ApplicationAuthUiMessageKey,
): string {
  const t = createApplicationAuthTranslator(runtime.defaultLocale);
  return `<div class="${kind}" role="${kind === "error" ? "alert" : "status"}">${escapeHtml(t(key))}</div>`;
}

export function hiddenInput(name: string, value: string): string {
  return `<input type="hidden" name="${escapeAttribute(name)}" value="${escapeAttribute(value)}">`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const escapeAttribute = escapeHtml;
