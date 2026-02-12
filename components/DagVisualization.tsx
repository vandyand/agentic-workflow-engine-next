"use client";

import type { WorkflowNode } from "@/lib/types";

interface DagVisualizationProps {
  nodes: WorkflowNode[];
  activeNodeId?: string;
  completedNodeIds?: string[];
  errorNodeId?: string;
}

export default function DagVisualization({
  nodes,
  activeNodeId,
  completedNodeIds = [],
  errorNodeId,
}: DagVisualizationProps) {
  // Build topological order for layout
  const orderedNodes = topoOrder(nodes);

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {orderedNodes.map((node, idx) => {
        const shortAction = node.actionRef.split(".").pop() ?? node.actionRef;
        const isActive = activeNodeId === node.id;
        const isCompleted = completedNodeIds.includes(node.id);
        const isError = errorNodeId === node.id;

        let borderColor = "border-border";
        let bgColor = "bg-bg-card";
        let statusDot = "";

        if (isError) {
          borderColor = "border-error";
          bgColor = "bg-error/10";
          statusDot = "bg-error";
        } else if (isActive) {
          borderColor = "border-accent";
          bgColor = "bg-accent/10";
          statusDot = "bg-accent animate-pulse";
        } else if (isCompleted) {
          borderColor = "border-success";
          bgColor = "bg-success/10";
          statusDot = "bg-success";
        }

        return (
          <div key={node.id} className="flex flex-col items-center">
            {/* Arrow from previous node */}
            {idx > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-border" />
                <svg width="12" height="8" viewBox="0 0 12 8" className="text-border">
                  <path d="M6 8L0 0h12z" fill="currentColor" />
                </svg>
              </div>
            )}

            {/* Node box */}
            <div
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg border ${borderColor} ${bgColor} min-w-[160px] transition-all duration-300`}
            >
              {statusDot && (
                <span
                  className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${statusDot}`}
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-primary">
                  {node.id}
                </span>
                <span className="text-xs text-text-secondary">{shortAction}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function topoOrder(nodes: WorkflowNode[]): WorkflowNode[] {
  const indeg: Record<string, number> = {};
  const byId: Record<string, WorkflowNode> = {};
  for (const n of nodes) {
    byId[n.id] = n;
    indeg[n.id] ??= 0;
  }
  for (const n of nodes) {
    for (const dep of n.dependsOn ?? []) {
      indeg[n.id] = (indeg[n.id] ?? 0) + 1;
    }
  }
  const queue = Object.entries(indeg)
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  const order: WorkflowNode[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (byId[cur]) order.push(byId[cur]);
    for (const n of nodes) {
      if ((n.dependsOn ?? []).includes(cur)) {
        indeg[n.id]--;
        if (indeg[n.id] === 0) queue.push(n.id);
      }
    }
  }
  return order;
}
