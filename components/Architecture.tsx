"use client";

import { useState } from "react";
import { REGISTRY, WORKFLOWS } from "@/lib/workflows";

export default function Architecture() {
  const registryKeys = Object.keys(REGISTRY);
  const workflowKeys = Object.keys(WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflowKeys[0]);
  const [showYaml, setShowYaml] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">Architecture</h2>

      {/* Action Registry */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Action Registry</h3>
        <p className="text-sm text-text-secondary mb-4">
          Available actions in this workflow engine:
        </p>

        <div className="space-y-3">
          {registryKeys.map((key) => {
            const action = REGISTRY[key];
            return (
              <RegistryCard key={key} actionName={key} action={action} />
            );
          })}
        </div>
      </div>

      {/* Workflow Inspector */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Workflow Inspector</h3>

        <select
          value={selectedWorkflow}
          onChange={(e) => {
            setSelectedWorkflow(e.target.value);
            setShowYaml(false);
          }}
          className="w-full max-w-xs bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mb-4"
        >
          {workflowKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>

        {/* Workflow nodes */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              {WORKFLOWS[selectedWorkflow].metadata.name}
            </h4>
            <span className="text-xs text-text-secondary">
              {WORKFLOWS[selectedWorkflow].nodes.length} nodes
            </span>
          </div>

          <p className="text-xs text-text-secondary">
            {WORKFLOWS[selectedWorkflow].metadata.description}
          </p>

          <div className="space-y-2">
            {WORKFLOWS[selectedWorkflow].nodes.map((node) => (
              <div
                key={node.id}
                className="bg-bg-card rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{node.id}</span>
                  <span className="text-xs font-mono text-accent">
                    {node.actionRef}
                  </span>
                </div>
                {node.dependsOn && node.dependsOn.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    Depends on:{" "}
                    {node.dependsOn.map((d) => (
                      <span
                        key={d}
                        className="inline-block bg-bg-secondary px-1.5 py-0.5 rounded text-xs font-mono mr-1"
                      >
                        {d}
                      </span>
                    ))}
                  </p>
                )}
                {node.retry && (
                  <p className="text-xs text-text-secondary mt-1">
                    Retry: {node.retry.maxAttempts} attempts, {node.retry.backoffMs}ms backoff
                  </p>
                )}
                {node.timeoutMs && (
                  <p className="text-xs text-text-secondary">
                    Timeout: {node.timeoutMs}ms
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Raw JSON toggle */}
          <button
            onClick={() => setShowYaml(!showYaml)}
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            {showYaml ? "Hide" : "Show"} Parsed IR (JSON)
          </button>

          {showYaml && (
            <pre className="text-xs text-text-secondary bg-bg-card rounded-lg p-4 overflow-auto max-h-96 border border-border">
              {JSON.stringify(WORKFLOWS[selectedWorkflow], null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* System overview */}
      <div>
        <h3 className="text-lg font-semibold mb-3">System Overview</h3>
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Actions" value={String(registryKeys.length)} />
            <StatCard label="Workflows" value={String(workflowKeys.length)} />
            <StatCard label="Max Runtime" value="30s" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistryCard({
  actionName,
  action,
}: {
  actionName: string;
  action: { title: string; inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown> };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-card/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.18 1.023-5.927L2.11 7.67l5.97-.867L11.42 1.5l2.79 5.303 5.97.867-4.948 4.753 1.023 5.927z" />
          </svg>
          <span className="text-sm font-medium">{actionName}</span>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Title:</span>{" "}
            {action.title}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">
                Input Schema:
              </p>
              <pre className="text-xs text-text-secondary bg-bg-card rounded-lg p-3 overflow-auto">
                {JSON.stringify(action.inputSchema, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">
                Output Schema:
              </p>
              <pre className="text-xs text-text-secondary bg-bg-card rounded-lg p-3 overflow-auto">
                {JSON.stringify(action.outputSchema, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-bg-card border border-border">
      <p className="text-2xl font-bold text-accent">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}
