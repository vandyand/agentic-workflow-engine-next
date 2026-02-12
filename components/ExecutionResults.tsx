"use client";

import { useState } from "react";
import type { ExecutionResult, NodeExecution } from "@/lib/types";

interface ExecutionResultsProps {
  result: ExecutionResult;
}

export default function ExecutionResults({ result }: ExecutionResultsProps) {
  return (
    <div className="space-y-6">
      {/* Status header */}
      {result.success ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-success/10 border border-success/30">
          <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-success font-medium">
            Completed in {result.executionTimeMs}ms
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-error/10 border border-error/30">
          <svg className="w-5 h-5 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-error font-medium">
            Failed: {result.error ?? "Unknown error"}
          </span>
        </div>
      )}

      {/* Node execution details */}
      {result.nodeExecutions.length > 0 && (
        <NodeExecutionDetails executions={result.nodeExecutions} />
      )}

      {/* Final result display */}
      {result.success && result.nodeExecutions.length > 0 && (
        <FinalResult
          nodeExecutions={result.nodeExecutions}
        />
      )}

      {/* Metrics */}
      {result.success && result.nodeExecutions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Nodes Executed"
            value={String(result.nodeExecutions.length)}
          />
          <MetricCard
            label="Successful"
            value={`${result.nodeExecutions.filter((n) => n.status === "success").length}/${result.nodeExecutions.length}`}
          />
          <MetricCard
            label="Total Time"
            value={`${result.executionTimeMs}ms`}
          />
        </div>
      )}

      {/* Raw logs */}
      {result.logs.length > 0 && (
        <Collapsible title="Raw Execution Log" defaultOpen={false}>
          <div className="space-y-1 font-mono text-xs">
            {result.logs.map((log, i) => {
              const icon =
                log.level === "success"
                  ? "[OK]"
                  : log.level === "error"
                    ? "[ERR]"
                    : log.level === "running"
                      ? "[RUN]"
                      : "[INFO]";
              const color =
                log.level === "success"
                  ? "text-success"
                  : log.level === "error"
                    ? "text-error"
                    : "text-text-secondary";
              return (
                <div key={i} className={color}>
                  [{log.timestamp}] {icon} {log.message}
                </div>
              );
            })}
          </div>
        </Collapsible>
      )}
    </div>
  );
}

function NodeExecutionDetails({
  executions,
}: {
  executions: NodeExecution[];
}) {
  return (
    <Collapsible title="Node Execution Details" defaultOpen={false}>
      <div className="space-y-3">
        {executions.map((ne, i) => (
          <div key={ne.nodeId}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${ne.status === "success" ? "bg-success" : "bg-error"}`}
                />
                <span className="font-medium text-sm">{ne.nodeId}</span>
                <span className="text-xs text-text-secondary font-mono">
                  {ne.action}
                </span>
              </div>
              <span className="text-xs text-text-secondary">
                {ne.durationMs}ms
              </span>
            </div>
            {ne.error && (
              <p className="mt-1 text-xs text-error ml-4">{ne.error}</p>
            )}
            {i < executions.length - 1 && (
              <div className="flex justify-center mt-2">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </Collapsible>
  );
}

function FinalResult({
  nodeExecutions,
}: {
  nodeExecutions: NodeExecution[];
}) {
  const lastNode = nodeExecutions[nodeExecutions.length - 1];
  if (!lastNode?.outputData) return null;

  let output = lastNode.outputData as Record<string, unknown>;

  // Extract meaningful result
  let resultValue: unknown = output;
  if (typeof output === "object" && output !== null) {
    for (const key of ["result", "text", "content", "extract", "summary", "data", "json"]) {
      if (key in output) {
        resultValue = output[key];
        break;
      }
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Result</h3>
      <ResultDisplay value={resultValue} />
    </div>
  );
}

function ResultDisplay({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return (
      <div className="bg-bg-card rounded-lg p-4 border-l-4 border-accent">
        <p className="text-sm text-text-primary whitespace-pre-wrap">{value}</p>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-text-secondary font-medium">
          Found {value.length} items:
        </p>
        {value.slice(0, 10).map((item, i) => {
          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            const title =
              (obj.title as string) ??
              (obj.name as string) ??
              `Item ${i + 1}`;
            const authorName = obj.author_name as string[] | string | undefined;
            const year = obj.first_publish_year as number | undefined;
            const coverId = obj.cover_i as number | undefined;
            const bookKey = obj.key as string | undefined;

            return (
              <Collapsible
                key={i}
                title={`${i + 1}. ${typeof title === 'object' ? JSON.stringify(title) : title}`}
                defaultOpen={false}
              >
                <div className="text-sm space-y-1">
                  {authorName && (
                    <p className="text-text-secondary">
                      Author(s):{" "}
                      {Array.isArray(authorName)
                        ? authorName.slice(0, 3).join(", ")
                        : String(authorName)}
                    </p>
                  )}
                  {year && (
                    <p className="text-text-secondary">
                      First published: {String(year)}
                    </p>
                  )}
                  {coverId && (
                    <img
                      src={`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`}
                      alt="cover"
                      className="w-20 rounded mt-1"
                    />
                  )}
                  {bookKey && (
                    <a
                      href={`https://openlibrary.org${bookKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-xs"
                    >
                      View on Open Library
                    </a>
                  )}
                  {!authorName && !year && (
                    <pre className="text-xs text-text-secondary overflow-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  )}
                </div>
              </Collapsible>
            );
          }
          return (
            <div key={i} className="text-sm text-text-primary">
              - {String(item)}
            </div>
          );
        })}
        {value.length > 10 && (
          <p className="text-xs text-text-secondary">
            ... and {value.length - 10} more items
          </p>
        )}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    // Check for arXiv-like feed data
    if ("feed" in obj || "entry" in obj) {
      return <ArxivResults data={obj} />;
    }

    return (
      <Collapsible title="View full result" defaultOpen>
        <pre className="text-xs text-text-secondary overflow-auto max-h-96">
          {JSON.stringify(value, null, 2)}
        </pre>
      </Collapsible>
    );
  }

  return (
    <div className="bg-bg-card rounded-lg p-4">
      <p className="text-sm text-text-primary">{String(value)}</p>
    </div>
  );
}

function ArxivResults({ data }: { data: Record<string, unknown> }) {
  const feed = (data.feed ?? data) as Record<string, unknown>;
  let entries = feed.entry as Record<string, unknown>[] | Record<string, unknown>;
  if (!entries) return <p className="text-text-secondary text-sm">No papers found</p>;
  if (!Array.isArray(entries)) entries = [entries];

  return (
    <div className="space-y-2">
      <p className="text-sm text-text-secondary font-medium">
        Found {entries.length} papers:
      </p>
      {entries.slice(0, 10).map((entry, i) => {
        let title = entry.title as string ?? "Untitled";
        if (typeof title === "object") title = JSON.stringify(title);
        title = title.replace(/\s+/g, " ").trim();

        let summary = (entry.summary as string) ?? "";
        if (typeof summary === "object") summary = JSON.stringify(summary);
        summary = summary.replace(/\s+/g, " ").trim().slice(0, 300);

        let authors = entry.author as Record<string, unknown>[] | Record<string, unknown>;
        if (authors && !Array.isArray(authors)) authors = [authors];
        const authorNames = (authors as Record<string, unknown>[])
          ?.slice(0, 3)
          .map((a) => (a.name as string) ?? "")
          .filter(Boolean) ?? [];

        const link = (entry.id as string) ?? "";

        return (
          <Collapsible key={i} title={`${i + 1}. ${title}`} defaultOpen={false}>
            <div className="text-sm space-y-1">
              {authorNames.length > 0 && (
                <p className="text-text-secondary">
                  {authorNames.join(", ")}
                  {(authors as unknown[])?.length > 3 && ` +${(authors as unknown[]).length - 3} more`}
                </p>
              )}
              {summary && (
                <p className="text-text-secondary text-xs">{summary}...</p>
              )}
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline text-xs"
                >
                  View on arXiv
                </a>
              )}
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card rounded-lg p-4 border border-border text-center">
      <p className="text-2xl font-bold text-accent">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}

function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-card/50 transition-colors"
      >
        <span className="text-sm font-medium text-text-primary">{title}</span>
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
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
