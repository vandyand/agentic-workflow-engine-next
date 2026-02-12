/** Core types for the workflow engine. */

export interface WorkflowNode {
  id: string;
  actionRef: string;
  schemaVersion: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
  timeoutMs?: number;
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface WorkflowMetadata {
  name: string;
  description: string;
  risk: string;
  principal: {
    id: string;
    permissions: string[];
  };
  termination: {
    maxNodes: number;
    maxRuntimeMs: number;
    warnAtPct: number;
  };
}

export interface WorkflowDefinition {
  kind: "process";
  version: string;
  metadata: WorkflowMetadata;
  nodes: WorkflowNode[];
}

export interface NodeExecution {
  nodeId: string;
  action: string;
  status: "running" | "success" | "error";
  durationMs: number;
  inputData?: unknown;
  outputData?: unknown;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "error" | "running";
  message: string;
  nodeId?: string;
}

export interface ExecutionResult {
  success: boolean;
  logs: LogEntry[];
  nodeExecutions: NodeExecution[];
  executionTimeMs: number;
  error?: string;
}

export interface WorkflowInfo {
  name: string;
  description: string;
  icon: string;
}

export interface RegistryAction {
  title: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}
