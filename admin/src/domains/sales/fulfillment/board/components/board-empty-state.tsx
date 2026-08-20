import { Empty, Button } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
export function BoardEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty description="Create the first fulfillment stage">
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        Create stage
      </Button>
    </Empty>
  );
}
