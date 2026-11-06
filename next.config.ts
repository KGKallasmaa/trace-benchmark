import path from "node:path";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import { serverEnv } from "./src/lib/env.server";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.2.2"],
  devIndicators: false,
  async redirects() {
    return [
      { source: "/llms.full.txt", destination: "/llms-full.txt", permanent: true },
      { source: "/index.md", destination: "/results.md", permanent: true },
    ];
  },
  async headers() {
    return ["/", "/llms.txt", "/llms-full.txt", "/results.md", "/api/report", "/api/benchmark", "/api/download"].map((source) => ({
      source,
      headers: [
        {
          key: "Link",
          value: source === "/"
            ? '</llms.txt>; rel="describedby"; type="text/plain", </results.md>; rel="alternate"; type="text/markdown"'
            : '</llms.txt>; rel="describedby"; type="text/plain"',
        },
      ],
    }));
  },
  async rewrites() {
    return {
      beforeFiles: serverEnv.benchmarkDataOrigin
        ? [{
            source: "/api/:endpoint(benchmark|report|download)",
            destination: `${serverEnv.benchmarkDataOrigin}/api/:endpoint`,
          }]
        : [],
    };
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withWorkflow(nextConfig);
