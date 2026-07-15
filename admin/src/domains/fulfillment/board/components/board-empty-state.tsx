import { Empty, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
export function BoardEmptyState({ onCreate }: { onCreate: () => void }) { return <Empty description="Create the first fulfillment stage"><Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>Create stage</Button></Empty>; }
