import { Select } from "antd";
import type { ApiFulfillmentStage } from "../graphql/operation-types";
export function FulfillmentStageSelect({ stages, value, onChange, disabled }: { stages: ApiFulfillmentStage[]; value?: string; onChange?: (value: string) => void; disabled?: boolean }) { return <Select value={value} onChange={onChange} disabled={disabled} options={stages.map((stage) => ({ value: stage.id, label: stage.title }))} />; }
