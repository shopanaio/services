import { Alert, Button } from "antd";
export function BoardErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert
      type="error"
      showIcon
      message="Unable to load fulfillment"
      description={error.message}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  );
}
