import { registerModule } from "@/registry";
import { LuHistory as HistoryOutlined } from "react-icons/lu";
import { LuSettings as SettingOutlined } from "react-icons/lu";
import dynamic from "next/dynamic";

registerModule({
  key: "system-settings",
  domain: "system",
  sidebar: {
    label: "Settings",
    icon: <SettingOutlined />,
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
      key: "notifications",
      path: "/:orgName/:storeName/system/notifications",
      sidebar: {
        label: "Notifications",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/system/notifications/page/page"),
      ),
    },
    {
      key: "sender-domains",
      path: "/:orgName/:storeName/system/notifications/sender-domains",
      disabled: true,
      component: dynamic(
        () => import("@/domains/system/sender-domains/page/page"),
      ),
    },
    {
      key: "delivery-logs",
      path: "/:orgName/:storeName/system/notifications/delivery-logs",
      disabled: true,
      component: dynamic(
        () => import("@/domains/system/delivery-logs/page/page"),
      ),
    },
    {
      key: "system-apps",
      path: "/:orgName/:storeName/system/settings/apps",
      sidebar: {
        label: "Apps",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/system/apps/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "system-access",
  domain: "system",
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
  key: "system-activity",
  domain: "system",
  sidebar: {
    label: "Activity",
    icon: <HistoryOutlined />,
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
