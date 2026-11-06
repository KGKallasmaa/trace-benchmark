import { agentTextHeaders, readAgentIndex } from "@/lib/benchmark/agent-docs";

export const dynamic = "force-static";

/** A small, database-independent entry point for agents. */
export async function GET() {
  return new Response(await readAgentIndex(), { headers: agentTextHeaders });
}
