import { agentTextHeaders, readFullAgentReference } from "@/lib/benchmark/agent-docs";
import { GET as readResults } from "../results.md/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const reference = await readFullAgentReference();
  const results = await readResults();
  const live = results.ok
    ? await results.text()
    : "## Live results\n\nLive results are temporarily unavailable. Do not infer current scores from the dated README snapshot. Retry https://trace.context.dev/results.md later.\n";
  return new Response(reference + "\n---\n\n" + live, {
    headers: {
      ...agentTextHeaders,
      "Cache-Control": results.ok ? agentTextHeaders["Cache-Control"] : "public, max-age=60",
    },
  });
}
