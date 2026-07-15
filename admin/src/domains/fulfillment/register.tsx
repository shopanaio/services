import { AppstoreOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import { registerModule } from "@/registry";

registerModule({ key: "fulfillment-board", domain: "fulfillment", sidebar: { label: "Fulfillment", icon: <AppstoreOutlined />, order: 1 }, items: [{ key: "fulfillment-board-page", path: "/:orgName/:storeName/fulfillment", component: dynamic(() => import("@/domains/fulfillment/board/page/page")) }] });
