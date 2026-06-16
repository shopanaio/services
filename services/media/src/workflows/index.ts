import {
  FileHardDeleteWorkflow,
  type FileHardDeleteOutput,
} from "./FileHardDeleteWorkflow.js";
import {
  FileGarbageCollectorWorkflow,
  type FileGarbageCollectorOutput,
} from "./FileGarbageCollectorWorkflow.js";
import {
  FileDeleteCleanupWorkflow,
  type FileDeleteCleanupOutput,
} from "./FileDeleteCleanupWorkflow.js";

export {
  FileHardDeleteWorkflow,
  FileGarbageCollectorWorkflow,
  FileDeleteCleanupWorkflow,
};

export type {
  FileHardDeleteOutput,
  FileGarbageCollectorOutput,
  FileDeleteCleanupOutput,
};

export const workflows = [
  FileHardDeleteWorkflow,
  FileGarbageCollectorWorkflow,
  FileDeleteCleanupWorkflow,
];
