import { readFile } from "node:fs/promises";
import path from "node:path";

export function readAgentIndex() {
  return readFile(path.join(process.cwd(), "llms.txt"), "utf8");
}

export function readFullAgentReference() {
  return readFile(path.join(process.cwd(), "llms-full.txt"), "utf8");
}

export const agentTextHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=900",
  "X-Content-Type-Options": "nosniff",
};
