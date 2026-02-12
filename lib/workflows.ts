/**
 * Workflow definitions — ported from YAML to TypeScript objects.
 * Each workflow defines a DAG of nodes that execute sequentially.
 */
import type { WorkflowDefinition, WorkflowInfo } from "./types";

export const WORKFLOW_INFO: Record<string, WorkflowInfo> = {
  arxiv_search: {
    name: "arXiv Search",
    description: "Search arXiv for academic papers and parse results",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  wiki_summary: {
    name: "Wikipedia Summary",
    description: "Search Wikipedia and extract article summaries",
    icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
  book_search: {
    name: "Book Search",
    description: "Search Open Library for books by title or author",
    icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
  },
};

export const PRESET_QUERIES: Record<string, string[]> = {
  arxiv_search: ["transformer", "reinforcement learning", "LLM agents"],
  wiki_summary: ["generative AI", "neural networks", "Alan Turing"],
  book_search: ["dune", "artificial intelligence", "Isaac Asimov"],
};

export const WORKFLOWS: Record<string, WorkflowDefinition> = {
  arxiv_search: {
    kind: "process",
    version: "1",
    metadata: {
      name: "arxiv_search",
      description: "Search arXiv for papers and extract results",
      risk: "low",
      principal: { id: "system:demo", permissions: ["read:http"] },
      termination: { maxNodes: 5, maxRuntimeMs: 30000, warnAtPct: 80 },
    },
    nodes: [
      {
        id: "fetch_arxiv",
        actionRef: "plugin.http.get",
        schemaVersion: "v1",
        input: {
          url: "https://export.arxiv.org/api/query",
          params: {
            search_query: "all:{query}",
            start: 0,
            max_results: 5,
          },
          headers: {
            Accept: "application/atom+xml",
            "User-Agent": "agentic-workflow-engine",
          },
        },
        timeoutMs: 15000,
        retry: { maxAttempts: 2, backoffMs: 1000 },
      },
      {
        id: "parse_xml",
        actionRef: "plugin.transform.xml2json",
        schemaVersion: "v1",
        dependsOn: ["fetch_arxiv"],
        input: {
          xml: { $ref: "$.nodes.fetch_arxiv.output.body" },
        },
      },
    ],
  },

  wiki_summary: {
    kind: "process",
    version: "1",
    metadata: {
      name: "wiki_summary",
      description: "Search Wikipedia and summarize top result",
      risk: "low",
      principal: { id: "system:demo", permissions: ["read:http"] },
      termination: { maxNodes: 10, maxRuntimeMs: 60000, warnAtPct: 80 },
    },
    nodes: [
      {
        id: "search_wiki",
        actionRef: "plugin.http.get",
        schemaVersion: "v1",
        input: {
          url: "https://en.wikipedia.org/w/api.php",
          params: {
            action: "query",
            list: "search",
            srsearch: "{query}",
            srlimit: 3,
            format: "json",
          },
          headers: { "User-Agent": "agentic-workflow-engine" },
        },
        retry: { maxAttempts: 2, backoffMs: 1000 },
        timeoutMs: 15000,
      },
      {
        id: "extract_title",
        actionRef: "plugin.transform.jq",
        schemaVersion: "v1",
        dependsOn: ["search_wiki"],
        input: {
          data: { $ref: "$.nodes.search_wiki.output.body" },
          expression: ".query.search[0].title",
        },
      },
      {
        id: "fetch_extract",
        actionRef: "plugin.http.get",
        schemaVersion: "v1",
        dependsOn: ["extract_title"],
        input: {
          url: "https://en.wikipedia.org/w/api.php",
          params: {
            action: "query",
            prop: "extracts",
            explaintext: 1,
            exintro: 1,
            titles: { $ref: "$.nodes.extract_title.output.result" },
            format: "json",
          },
          headers: { "User-Agent": "agentic-workflow-engine" },
        },
        timeoutMs: 15000,
      },
      {
        id: "extract_content",
        actionRef: "plugin.transform.jq",
        schemaVersion: "v1",
        dependsOn: ["fetch_extract"],
        input: {
          data: { $ref: "$.nodes.fetch_extract.output.body" },
          expression:
            ".query.pages | to_entries | .[0].value.extract",
        },
      },
    ],
  },

  book_search: {
    kind: "process",
    version: "1",
    metadata: {
      name: "book_search",
      description: "Search Open Library for books and authors",
      risk: "low",
      principal: { id: "system:demo", permissions: ["read:http"] },
      termination: { maxNodes: 5, maxRuntimeMs: 30000, warnAtPct: 80 },
    },
    nodes: [
      {
        id: "search_books",
        actionRef: "plugin.http.get",
        schemaVersion: "v1",
        input: {
          url: "https://openlibrary.org/search.json",
          params: {
            q: "{query}",
            limit: 5,
            fields: "key,title,author_name,first_publish_year,subject,cover_i",
          },
          headers: { "User-Agent": "agentic-workflow-engine" },
        },
        timeoutMs: 15000,
        retry: { maxAttempts: 2, backoffMs: 1000 },
      },
      {
        id: "extract_books",
        actionRef: "plugin.transform.jq",
        schemaVersion: "v1",
        dependsOn: ["search_books"],
        input: {
          data: { $ref: "$.nodes.search_books.output.body" },
          expression: ".docs",
        },
      },
    ],
  },
};

/** Registry data for the Architecture tab */
export const REGISTRY: Record<string, { title: string; inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown> }> = {
  "plugin.http.get": {
    title: "HTTP GET Request",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string" },
        params: { type: "object" },
        headers: { type: "object" },
      },
    },
    outputSchema: {
      type: "object",
      required: ["status", "body"],
      properties: {
        status: { type: "integer" },
        body: {},
      },
    },
  },
  "plugin.transform.xml2json": {
    title: "Transform XML to JSON",
    inputSchema: {
      type: "object",
      required: ["xml"],
      properties: { xml: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      required: ["json"],
      properties: { json: {} },
    },
  },
  "plugin.transform.jq": {
    title: "JQ Transform",
    inputSchema: {
      type: "object",
      required: ["data", "expression"],
      properties: { data: {}, expression: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: {} },
    },
  },
  "plugin.llm.complete": {
    title: "LLM Completion",
    inputSchema: {
      type: "object",
      required: ["prompt"],
      properties: { prompt: { type: "string" }, model: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } },
    },
  },
  "plugin.core.echo": {
    title: "Echo (passthrough)",
    inputSchema: {
      type: "object",
      properties: { data: {} },
    },
    outputSchema: {
      type: "object",
      properties: { data: {} },
    },
  },
  "plugin.files.write": {
    title: "Write File",
    inputSchema: {
      type: "object",
      required: ["path", "content"],
      properties: { path: { type: "string" }, content: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      required: ["bytesWritten"],
      properties: { bytesWritten: { type: "integer" } },
    },
  },
};
