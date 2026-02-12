/**
 * DAG-based workflow runner — server-side execution engine.
 *
 * Supports topological sorting, $ref resolution between nodes,
 * configurable retries with backoff, and timeout enforcement.
 */
import { XMLParser } from "fast-xml-parser";
import type {
  WorkflowDefinition,
  WorkflowNode,
  NodeExecution,
  LogEntry,
  ExecutionResult,
} from "./types";

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------

function topoSort(nodes: WorkflowNode[]): { order: string[]; cycles: string[] } {
  const indeg: Record<string, number> = {};
  for (const n of nodes) {
    indeg[n.id] ??= 0;
  }
  for (const n of nodes) {
    for (const dep of n.dependsOn ?? []) {
      indeg[n.id] = (indeg[n.id] ?? 0) + 1;
      // ensure dep exists
      indeg[dep] ??= 0;
    }
  }

  const queue = Object.entries(indeg)
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);
  const order: string[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const n of nodes) {
      if ((n.dependsOn ?? []).includes(cur)) {
        indeg[n.id]--;
        if (indeg[n.id] === 0) {
          queue.push(n.id);
        }
      }
    }
  }

  const cycles = Object.entries(indeg)
    .filter(([, deg]) => deg > 0)
    .map(([id]) => id);

  return { order, cycles };
}

// ---------------------------------------------------------------------------
// $ref resolution
// ---------------------------------------------------------------------------

function resolveRef(
  path: string,
  context: Record<string, Record<string, unknown>>
): unknown {
  // $.nodes.<id>.output.<field>[.<subfield>...]
  const parts = path.split(".");
  if (
    parts.length < 5 ||
    parts[0] !== "$" ||
    parts[1] !== "nodes" ||
    parts[3] !== "output"
  ) {
    throw new Error(`Unsupported $ref path: ${path}`);
  }
  const nodeId = parts[2];
  if (!(nodeId in context)) {
    throw new Error(`$ref to unknown node: ${nodeId}`);
  }

  let val: unknown = context[nodeId];
  for (const token of parts.slice(4)) {
    if (token.includes("[") && token.endsWith("]")) {
      const [head, idxRaw] = token.split("[");
      const idx = parseInt(idxRaw.replace("]", ""), 10);
      if (head) {
        if (typeof val !== "object" || val === null || !(head in val)) {
          throw new Error(`$ref field not found: ${path}`);
        }
        val = (val as Record<string, unknown>)[head];
      }
      if (!Array.isArray(val) || idx < 0 || idx >= val.length) {
        throw new Error(`$ref index out of range: ${path}`);
      }
      val = val[idx];
    } else {
      if (typeof val !== "object" || val === null || !(token in val)) {
        throw new Error(`$ref field not found: ${path}`);
      }
      val = (val as Record<string, unknown>)[token];
    }
  }
  return val;
}

function resolveInput(
  obj: unknown,
  context: Record<string, Record<string, unknown>>
): unknown {
  if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
    const record = obj as Record<string, unknown>;
    if (
      Object.keys(record).length === 1 &&
      typeof record["$ref"] === "string"
    ) {
      return resolveRef(record["$ref"], context);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      result[k] = resolveInput(v, context);
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => resolveInput(v, context));
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Query substitution
// ---------------------------------------------------------------------------

function substituteQuery(
  input: Record<string, unknown>,
  query: string
): Record<string, unknown> {
  const json = JSON.stringify(input);
  const replaced = json.replace(/\{query\}/g, query);
  return JSON.parse(replaced);
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

type ActionHandler = (
  node: WorkflowNode,
  input: Record<string, unknown>
) => Promise<Record<string, unknown>>;

async function httpGetHandler(
  _node: WorkflowNode,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = input.url as string;
  if (!url) throw new Error("'url' must be a non-empty string");

  const params = input.params as Record<string, string | number> | undefined;
  const headers = input.headers as Record<string, string> | undefined;

  const urlObj = new URL(url);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      urlObj.searchParams.set(k, String(v));
    }
  }

  const resp = await fetch(urlObj.toString(), {
    headers: headers ?? {},
    signal: AbortSignal.timeout(20000),
  });

  const contentType = resp.headers.get("content-type") ?? "";
  let body: unknown;
  if (contentType.includes("json")) {
    body = await resp.json();
  } else {
    body = await resp.text();
  }

  return { status: resp.status, body };
}

async function xml2jsonHandler(
  _node: WorkflowNode,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const xml = input.xml as string;
  if (!xml || typeof xml !== "string") {
    throw new Error("'xml' must be a non-empty string");
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const result = parser.parse(xml);
  return { json: result };
}

/** Simple jq-like expression evaluator */
function jqEval(data: unknown, expr: string): unknown {
  if (!expr || expr === ".") return data;

  // Split by pipes
  const parts = expr.split("|").map((p) => p.trim());
  let cur: unknown = data;

  for (const part of parts) {
    cur = jqSingle(cur, part);
  }
  return cur;
}

function jqSingle(data: unknown, expr: string): unknown {
  if (!expr || expr === ".") return data;

  if (expr === "to_entries") {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("to_entries requires object input");
    }
    return Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
      key,
      value,
    }));
  }
  if (expr === "keys") {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("keys requires object input");
    }
    return Object.keys(data as Record<string, unknown>);
  }
  if (expr === "length") {
    if (Array.isArray(data)) return data.length;
    if (typeof data === "object" && data !== null)
      return Object.keys(data).length;
    if (typeof data === "string") return data.length;
    throw new Error("length requires array, object, or string");
  }

  if (!expr.startsWith(".")) {
    throw new Error(`expression must start with '.', got: ${expr}`);
  }

  let cur: unknown = data;
  const path = expr.slice(1);
  if (!path) return cur;

  const tokens = path.split(".");
  for (const tok of tokens) {
    if (!tok) continue;
    // Handle array index like name[0]
    const bracketIdx = tok.indexOf("[");
    if (bracketIdx !== -1) {
      const head = tok.slice(0, bracketIdx);
      const indexPart = tok.slice(bracketIdx);
      if (head) {
        if (typeof cur !== "object" || cur === null || !(head in cur)) {
          throw new Error(`field not found: ${head}`);
        }
        cur = (cur as Record<string, unknown>)[head];
      }
      // Parse index [N]
      const match = indexPart.match(/\[(\d+)\]/);
      if (!match) throw new Error(`invalid index: ${indexPart}`);
      const idx = parseInt(match[1], 10);
      if (!Array.isArray(cur) || idx >= cur.length) {
        return null;
      }
      cur = cur[idx];
    } else {
      if (typeof cur !== "object" || cur === null || !(tok in cur)) {
        throw new Error(`field not found: ${tok}`);
      }
      cur = (cur as Record<string, unknown>)[tok];
    }
  }
  return cur;
}

async function jqHandler(
  _node: WorkflowNode,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const data = input.data;
  const expression = input.expression as string;
  if (typeof expression !== "string") {
    throw new Error("'expression' must be string");
  }
  const result = jqEval(data, expression);
  return { result };
}

const ACTION_HANDLERS: Record<string, ActionHandler> = {
  "plugin.http.get": httpGetHandler,
  "plugin.transform.xml2json": xml2jsonHandler,
  "plugin.transform.jq": jqHandler,
};

// ---------------------------------------------------------------------------
// Workflow execution
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  query: string
): Promise<ExecutionResult> {
  const logs: LogEntry[] = [];
  const nodeExecutions: NodeExecution[] = [];
  const startTime = Date.now();

  logs.push({
    timestamp: timestamp(),
    level: "info",
    message: `Starting workflow: ${workflow.metadata.name}`,
  });
  logs.push({
    timestamp: timestamp(),
    level: "info",
    message: `Query: ${query}`,
  });

  // Topological sort
  const { order, cycles } = topoSort(workflow.nodes);
  if (cycles.length > 0) {
    return {
      success: false,
      logs,
      nodeExecutions,
      executionTimeMs: Date.now() - startTime,
      error: `Cycle detected: ${cycles.join(", ")}`,
    };
  }

  const nodeMap = Object.fromEntries(workflow.nodes.map((n) => [n.id, n]));
  const context: Record<string, Record<string, unknown>> = {};

  for (const nodeId of order) {
    const node = nodeMap[nodeId];
    if (!node) continue;

    const handler = ACTION_HANDLERS[node.actionRef];
    if (!handler) {
      const err = `Action not implemented: ${node.actionRef}`;
      logs.push({ timestamp: timestamp(), level: "error", message: err, nodeId });
      nodeExecutions.push({
        nodeId,
        action: node.actionRef,
        status: "error",
        durationMs: 0,
        error: err,
      });
      return {
        success: false,
        logs,
        nodeExecutions,
        executionTimeMs: Date.now() - startTime,
        error: err,
      };
    }

    logs.push({
      timestamp: timestamp(),
      level: "running",
      message: `Starting ${nodeId} (${node.actionRef})`,
      nodeId,
    });

    // Resolve input: first substitute {query}, then resolve $refs
    const substituted = substituteQuery(node.input, query);
    let resolvedInput: Record<string, unknown>;
    try {
      resolvedInput = resolveInput(substituted, context) as Record<string, unknown>;
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      logs.push({ timestamp: timestamp(), level: "error", message: `Input resolution failed for ${nodeId}: ${err}`, nodeId });
      nodeExecutions.push({
        nodeId,
        action: node.actionRef,
        status: "error",
        durationMs: 0,
        error: err,
      });
      return {
        success: false,
        logs,
        nodeExecutions,
        executionTimeMs: Date.now() - startTime,
        error: err,
      };
    }

    // Execute with retry
    const maxAttempts = node.retry?.maxAttempts ?? 1;
    const backoffMs = node.retry?.backoffMs ?? 0;
    let lastError = "";
    let succeeded = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const nodeStart = Date.now();
      try {
        const output = await handler(node, resolvedInput);
        const durationMs = Date.now() - nodeStart;

        // Check timeout
        if (node.timeoutMs && durationMs > node.timeoutMs) {
          throw new Error(`Timeout exceeded: ${durationMs}ms > ${node.timeoutMs}ms`);
        }

        context[nodeId] = output;
        nodeExecutions.push({
          nodeId,
          action: node.actionRef,
          status: "success",
          durationMs,
          inputData: resolvedInput,
          outputData: output,
        });
        logs.push({
          timestamp: timestamp(),
          level: "success",
          message: `Completed ${nodeId} in ${durationMs}ms`,
          nodeId,
        });
        succeeded = true;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (attempt < maxAttempts) {
          logs.push({
            timestamp: timestamp(),
            level: "info",
            message: `Retrying ${nodeId} (attempt ${attempt}/${maxAttempts}): ${lastError}`,
            nodeId,
          });
          await sleep(backoffMs);
        }
      }
    }

    if (!succeeded) {
      logs.push({
        timestamp: timestamp(),
        level: "error",
        message: `Failed ${nodeId}: ${lastError}`,
        nodeId,
      });
      nodeExecutions.push({
        nodeId,
        action: node.actionRef,
        status: "error",
        durationMs: 0,
        error: lastError,
      });
      return {
        success: false,
        logs,
        nodeExecutions,
        executionTimeMs: Date.now() - startTime,
        error: lastError,
      };
    }
  }

  const executionTimeMs = Date.now() - startTime;
  logs.push({
    timestamp: timestamp(),
    level: "success",
    message: `Workflow completed in ${executionTimeMs}ms`,
  });

  return {
    success: true,
    logs,
    nodeExecutions,
    executionTimeMs,
  };
}
