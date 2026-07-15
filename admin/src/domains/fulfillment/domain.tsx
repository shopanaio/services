import { PartitionOutlined } from "@ant-design/icons";
import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";

registerDomain({ key: "fulfillment", layout: AppLayout, sidebar: { label: "Fulfillment", icon: <PartitionOutlined />, order: 3 } });
