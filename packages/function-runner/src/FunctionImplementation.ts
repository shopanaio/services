import type {
  FunctionErrorClass,
  FunctionExecutionPlanItem,
  FunctionImplementationTrace,
  FunctionTargetDefinition,
} from "./contracts.js";

export interface FunctionExecutionContext<TInput = unknown> {
  readonly planIndex: number;
  readonly target: string;
  readonly storeId: string;
  readonly executionId: string;
  readonly correlationId?: string;
  readonly deadlineAt: string;
  readonly input: TInput;
  readonly item: FunctionExecutionPlanItem;
  readonly definition: FunctionTargetDefinition;
}

export interface FunctionExecutionSuccess {
  readonly ok: true;
  readonly data: unknown;
  readonly trace: FunctionImplementationTrace;
}

export interface FunctionExecutionFailure {
  readonly ok: false;
  readonly errorClass: FunctionErrorClass;
  readonly trace: FunctionImplementationTrace;
}

export interface FunctionExecutionSkipped {
  readonly ok: null;
  readonly trace: FunctionImplementationTrace;
}

export type FunctionExecutionOutcome =
  | FunctionExecutionSuccess
  | FunctionExecutionFailure
  | FunctionExecutionSkipped;

export interface FunctionImplementationExecutor {
  execute<TInput>(
    context: FunctionExecutionContext<TInput>,
  ): Promise<FunctionExecutionOutcome>;
}
