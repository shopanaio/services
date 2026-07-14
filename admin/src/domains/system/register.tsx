import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "system-settings",
  domain: "system",
  sidebar: {
    label: "Settings",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "general-settings",
      path: "/:orgName/:storeName/system/settings/general",
      sidebar: {
        label: "General",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/system/general-settings/page/page"),
      ),
    },
    {
      key: "localization-settings",
      path: "/:orgName/:storeName/system/settings/localization",
      sidebar: {
        label: "Localization",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/system/localization/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "system-notifications",
  domain: "system",
  sidebar: {
    label: "Notifications",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "email-settings",
      path: "/:orgName/:storeName/system/notifications/email-settings",
      sidebar: {
        label: "Email Settings",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/system/notifications/page/page"),
      ),
    },
    {
      key: "email-templates",
      path: "/:orgName/:storeName/system/notifications/email-templates",
      sidebar: {
        label: "Email Templates",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/system/email-templates/page/page"),
      ),
    },
    {
      key: "sender-domains",
      path: "/:orgName/:storeName/system/notifications/sender-domains",
      sidebar: {
        label: "Sender Domains",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/system/sender-domains/page/page"),
      ),
    },
    {
      key: "delivery-logs",
      path: "/:orgName/:storeName/system/notifications/delivery-logs",
      sidebar: {
        label: "Delivery Logs",
        icon: null,
        order: 4,
      },
      component: dynamic(
        () => import("@/domains/system/delivery-logs/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "system-access",
  domain: "system",
  sidebar: {
    label: "Access",
    icon: null,
    order: 3,
  },
  items: [
    {
      key: "system-users",
      path: "/:orgName/:storeName/system/access/users",
      sidebar: {
        label: "Users",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/system/users/page/page"),
      ),
    },
    {
      key: "system-roles",
      path: "/:orgName/:storeName/system/access/roles",
      sidebar: {
        label: "Roles",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/system/roles/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "system-integrations",
  domain: "system",
  sidebar: {
    label: "Integrations",
    icon: null,
    order: 4,
  },
  items: [
    {
      key: "system-apps",
      path: "/:orgName/:storeName/system/integrations/apps",
      sidebar: {
        label: "Apps",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/system/apps/page/page"),
      ),
    },
    {
      key: "system-api-keys",
      path: "/:orgName/:storeName/system/integrations/api-keys",
      sidebar: {
        label: "API Keys",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/system/api-keys/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "system-activity",
  domain: "system",
  sidebar: {
    label: "Activity",
    icon: null,
    order: 5,
  },
  items: [
    {
      key: "system-audit-log",
      path: "/:orgName/:storeName/system/activity/audit-log",
      sidebar: {
        label: "Audit Log",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/system/audit-log/page/page"),
      ),
    },
  ],
});
