"use client";

import { useState, useCallback } from "react";
import type { ExecutionResult } from "@/lib/types";
import { WORKFLOW_INFO, PRESET_QUERIES, WORKFLOWS } from "@/lib/workflows";
import DagVisualization from "./DagVisualization";
import ExecutionResults from "./ExecutionResults";

const workflowKeys = Object.keys(WORKFLOW_INFO);

export default function WorkflowRunner() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflowKeys[0]);
  const [selectedQuery, setSelectedQuery] = useState(
    PRESET_QUERIES[workflowKeys[0]][0]
  );
  const [customQuery, setCustomQuery] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>();
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [errorNodeId, setErrorNodeId] = useState<string | undefined>();

  const info = WORKFLOW_INFO[selectedWorkflow];
  const presets = PRESET_QUERIES[selectedWorkflow];
  const workflow = WORKFLOWS[selectedWorkflow];
  const queryValue = isCustom ? customQuery : selectedQuery;

  const handleWorkflowChange = useCallback(
    (key: string) => {
      setSelectedWorkflow(key);
      setIsCustom(false);
      setSelectedQuery(PRESET_QUERIES[key][0]);
      setResult(null);
      setActiveNodeId(undefined);
      setCompletedNodeIds([]);
      setErrorNodeId(undefined);
    },
    []
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      if (value === "__custom__") {
        setIsCustom(true);
        setSelectedQuery("");
      } else {
        setIsCustom(false);
        setSelectedQuery(value);
      }
    },
    []
  );

  const runWorkflow = useCallback(async () => {
    if (!queryValue) return;
    setIsRunning(true);
    setResult(null);
    setActiveNodeId(undefined);
    setCompletedNodeIds([]);
    setErrorNodeId(undefined);

    // Animate DAG nodes
    const nodeIds = workflow.nodes.map((n) => n.id);
    for (const nid of nodeIds) {
      setActiveNodeId(nid);
      await new Promise((r) => setTimeout(r, 200));
    }

    try {
      const resp = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName: selectedWorkflow,
          query: queryValue,
        }),
      });
      const data: ExecutionResult = await resp.json();
      setResult(data);

      // Update DAG visualization state from results
      const completed = data.nodeExecutions
        .filter((ne) => ne.status === "success")
        .map((ne) => ne.nodeId);
      setCompletedNodeIds(completed);

      const errorNode = data.nodeExecutions.find(
        (ne) => ne.status === "error"
      );
      setErrorNodeId(errorNode?.nodeId);
      setActiveNodeId(undefined);
    } catch (e) {
      setResult({
        success: false,
        logs: [],
        nodeExecutions: [],
        executionTimeMs: 0,
        error: e instanceof Error ? e.message : "Network error",
      });
      setActiveNodeId(undefined);
    } finally {
      setIsRunning(false);
    }
  }, [queryValue, selectedWorkflow, workflow.nodes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Sidebar */}
      <div className="space-y-6">
        {/* Workflow selector */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <h2 className="text-lg font-semibold">Workflow Engine</h2>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Schema-driven orchestration
          </p>

          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Select Workflow
          </label>
          <select
            value={selectedWorkflow}
            onChange={(e) => handleWorkflowChange(e.target.value)}
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {workflowKeys.map((key) => (
              <option key={key} value={key}>
                {WORKFLOW_INFO[key].name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-secondary mt-1.5">{info.description}</p>

          <label className="block text-sm font-medium text-text-secondary mt-4 mb-1.5">
            Select Query
          </label>
          <select
            value={isCustom ? "__custom__" : selectedQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {presets.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
            <option value="__custom__">Custom query...</option>
          </select>

          {isCustom && (
            <input
              type="text"
              placeholder="Enter custom query"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="w-full mt-2 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
            />
          )}

          <button
            onClick={runWorkflow}
            disabled={isRunning || !queryValue}
            className="w-full mt-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Run Workflow
              </>
            )}
          </button>
        </div>

        {/* DAG visualization */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-3 text-text-secondary uppercase tracking-wider">
            Workflow DAG
          </h3>
          <DagVisualization
            nodes={workflow.nodes}
            activeNodeId={activeNodeId}
            completedNodeIds={completedNodeIds}
            errorNodeId={errorNodeId}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="min-w-0">
        <h2 className="text-2xl font-bold mb-4">Workflow Execution</h2>

        {queryValue ? (
          <div className="bg-bg-secondary/50 rounded-lg border border-border px-4 py-3 mb-6">
            <p className="text-sm">
              <span className="text-text-secondary">Workflow:</span>{" "}
              <span className="font-medium">{info.name}</span>
              <span className="mx-3 text-border">|</span>
              <span className="text-text-secondary">Query:</span>{" "}
              <span className="font-medium">{queryValue}</span>
            </p>
          </div>
        ) : (
          <div className="bg-bg-secondary/50 rounded-lg border border-border px-4 py-3 mb-6">
            <p className="text-sm text-text-secondary">
              Select a workflow and query, then click Run Workflow.
            </p>
          </div>
        )}

        {result && <ExecutionResults result={result} />}

        {!result && !isRunning && (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <p className="text-lg font-medium mb-1">Ready to execute</p>
            <p className="text-sm">Click "Run Workflow" to start the DAG execution.</p>
          </div>
        )}
      </div>
    </div>
  );
}
