import { NextResponse } from "next/server";
import { WORKFLOWS } from "@/lib/workflows";
import { executeWorkflow } from "@/lib/runner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowName, query } = body as {
      workflowName: string;
      query: string;
    };

    if (!workflowName || !query) {
      return NextResponse.json(
        { error: "Missing workflowName or query" },
        { status: 400 }
      );
    }

    const workflow = WORKFLOWS[workflowName];
    if (!workflow) {
      return NextResponse.json(
        { error: `Unknown workflow: ${workflowName}` },
        { status: 404 }
      );
    }

    const result = await executeWorkflow(workflow, query);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
