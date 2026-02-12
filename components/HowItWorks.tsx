"use client";

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">How It Works</h2>

      <p className="text-text-secondary leading-relaxed">
        This workflow engine executes <strong className="text-text-primary">DAG-based workflows</strong> where
        each node represents an action:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StepCard
          step={1}
          title="Workflow Definition"
          description="YAML files define nodes, their actions, inputs, and dependencies"
          icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
        <StepCard
          step={2}
          title="Topological Sort"
          description="Nodes are ordered based on their dependencies to ensure correct execution order"
          icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
        />
        <StepCard
          step={3}
          title="Sequential Execution"
          description="Each node runs in order, with outputs passed to dependent nodes via $ref"
          icon="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
        />
        <StepCard
          step={4}
          title="Error Handling"
          description="Configurable retries with exponential backoff for resilient execution"
          icon="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M4.031 9.865V4.873"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Key Concepts</h3>

        <div className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <ConceptRow
            title="DAG (Directed Acyclic Graph)"
            description="Workflows are modeled as DAGs where nodes represent actions and edges represent data dependencies. This ensures there are no circular dependencies and execution can proceed in a deterministic order."
          />
          <ConceptRow
            title="$ref Resolution"
            description='Nodes reference outputs from upstream nodes using $ref syntax (e.g., $.nodes.fetch_arxiv.output.body). These references are resolved at runtime before each node executes.'
          />
          <ConceptRow
            title="Action Handlers"
            description="Each node specifies an actionRef (e.g., plugin.http.get) that maps to a handler function. Handlers are registered in the action registry with input/output schemas for validation."
          />
          <ConceptRow
            title="Schema-Driven"
            description="Workflow definitions, action registries, and I/O schemas are all declarative. This makes workflows inspectable, testable, and portable."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Example Flow: arXiv Search</h3>
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-medium">fetch_arxiv</p>
                <p className="text-text-secondary text-xs">HTTP GET to arXiv API with search query. Returns raw Atom XML.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-medium">parse_xml</p>
                <p className="text-text-secondary text-xs">Transforms the XML response body into JSON using xml2json action. References fetch_arxiv output via $ref.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium mb-0.5">
            <span className="text-accent mr-1">{step}.</span> {title}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ConceptRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm font-medium text-text-primary mb-1">{title}</p>
      <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}
