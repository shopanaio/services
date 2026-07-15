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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
