import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Delay scripts, fonts, and the first refresh independently: the server-rendered
// schedule must keep its position throughout hydration and slow network loads.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const evidence = resolve("artifacts/status-layout/browser");
mkdirSync(evidence, { recursive: true });
const providers = ["context", "exa", "firecrawl", "keenable"];
const day = "2026-11-06";
const protocol = "scraping-bench-v5";
const latest = {
  id: `${protocol}:${day}`, day, protocol, status: "completed", pages: 2527, target: 2527,
  finishedAt: `${day}T03:57:00Z`, categories: { jobs: 2527 },
  providers: providers.map(id => ({ id, total: 2527, useful: 2527, failed: 0, unknown: 0, pending: 0,
    rate: 1, p50: 100, p95: 100, rateLimited: 0,
    categories: { jobs: { total: 2527, useful: 2527, unknown: 0, completed: 2527 } } })),
};
const dataset = {
  report: { latest, history: [latest], collecting: null, records: [], totalRecords: 0, page: 0,
    health: { lastTick: null, error: null, sources: 0, healthySources: 0, evidenceBytes: 0 } },
  pages: Array.from({ length: 2527 }, (_, index) => ({ id: `fixture-${index}`, url: `https://fixture.example/jobs/${index}`,
    category: "jobs", source: "daily", day, protocol,
    results: Object.fromEntries(providers.map(id => [id, { success: true, state: "done", ms: 100 }])) })),
};
const empty = { ...dataset, report: { ...dataset.report, latest: null, history: [] }, pages: [] };
let currentDataset = dataset;
const fixture = createServer((_request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(currentDataset));
});
await new Promise(resolve => fixture.listen(0, "127.0.0.1", resolve));
const port = process.env.TEST_PORT || "3191";
const base = `http://localhost:${port}`;
const app = spawn(process.execPath,
  ["node_modules/next/dist/bin/next", process.env.BENCHMARK_E2E_SERVER || "dev", "--port", port],
  { env: { ...process.env, BENCHMARK_DATA_ORIGIN: `http://127.0.0.1:${fixture.address().port}`, TRACE_WORKER_ENABLED: "0" },
    stdio: ["ignore", "pipe", "pipe"] });
let log = "";
app.stdout.on("data", data => { log += data; });
app.stderr.on("data", data => { log += data; });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const checks = [];
const errors = [];
const selectors = [".bench-status", ".bench-status-chip", ".bench-status-copy", ".bench-status-copy > span:first-child", ".bench-status-completed", ".bench-status-actions", "#overview"];
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const geometry = page => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
  const element = document.querySelector(selector);
  const { x, y, width, height } = element.getBoundingClientRect();
  const copy = element.closest(".bench-status-copy");
  return [selector, { x, y, width, height, visible: !copy || getComputedStyle(copy).clipPath === "none" }];
})), selectors);
function stable(before, after, label) {
  for (const selector of selectors) {
    // The compact phone header keeps its schedule available to assistive tech.
    if (!before[selector].visible) continue;
    // Font metrics may change text width and the inline completion's x position;
    // header height and the positions of the copy, actions, and next section stay fixed.
    const dimensions = selector === ".bench-status" ? ["x", "y", "height"]
      : [".bench-status-actions", ".bench-status-completed"].includes(selector) ? ["y"] : ["x", "y"];
    for (const dimension of dimensions) assert.ok(Math.abs(before[selector][dimension] - after[selector][dimension]) <= 1,
      `${label}: ${selector} ${dimension} moved from ${before[selector][dimension]} to ${after[selector][dimension]}`);
  }
}
try {
  const deadline = Date.now() + 60000;
  while (true) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error(log || "Next did not start");
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  for (const [width, expanded] of [[320, false], [375, false], [390, false], [768, false], [1024, false], [1024, true], [1280, true], [1440, true]]) {
    const label = `${width}px${expanded ? " expanded" : ""}`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript(expanded => { if (expanded) localStorage.setItem("bench-rail", "expanded"); }, expanded);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    let releaseScripts, releaseFonts, releaseRefresh;
    const scripts = new Promise(resolve => { releaseScripts = resolve; });
    const fonts = new Promise(resolve => { releaseFonts = resolve; });
    const refresh = new Promise(resolve => { releaseRefresh = resolve; });
    await context.route("**/*", async route => {
      const request = route.request();
      if (request.resourceType() === "script") await scripts;
      if (request.resourceType() === "font") await fonts;
      if (new URL(request.url()).pathname === "/api/benchmark") {
        await refresh;
        return route.fulfill({ json: dataset });
      }
      return route.continue();
    });
    await page.goto(base, { waitUntil: "commit" });
    await page.locator(".bench-status-copy").waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".bench-status-copy")).display === "flex");
    await frames(page);
    const server = await geometry(page);
    releaseScripts();
    await page.locator('.bench-status-refresh[aria-hidden="false"]').waitFor({ state: "attached" });
    await frames(page);
    // Restoring a manually expanded rail intentionally changes horizontal layout.
    if (!expanded || width >= 1280) stable(server, await geometry(page), `${label} hydration`);
    const refreshing = await geometry(page);
    releaseFonts();
    await page.evaluate(() => document.fonts.ready);
    await frames(page);
    stable(refreshing, await geometry(page), `${label} fonts`);
    releaseRefresh();
    await page.locator('.bench-status-refresh[aria-hidden="true"]').waitFor({ state: "attached" });
    await frames(page);
    stable(refreshing, await geometry(page), `${label} refresh completion`);
    const inline = await geometry(page);
    if (inline[".bench-status-copy"].visible) {
      assert.equal(inline[".bench-status-copy > span:first-child"].y, inline[".bench-status-completed"].y,
        `${label}: schedule and last completion share one line`);
    }
    const overflow = await page.evaluate(() => {
      const status = document.querySelector(".bench-status").getBoundingClientRect();
      return [...document.querySelectorAll(".bench-status-copy, .bench-status-chip, .bench-status-actions")]
        .filter(element => { const box = element.getBoundingClientRect(); return box.left < status.left - 1 || box.right > status.right + 1; })
        .map(element => element.className);
    });
    assert.deepEqual(overflow, [], `${label}: header content fits its container`);
    assert.equal(await page.locator(".bench-rail-meta, .bench-sample-protocol, .bench-sample-count").count(), 0,
      `${label}: sidebar sample summary is removed`);
    assert.equal(await page.getByRole("button", { name: "Filters", exact: true }).count(), 0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: resolve(evidence, `${width}${expanded ? "-expanded" : ""}.png`) });
    const download = page.waitForEvent("download");
    const headerDownload = page.locator("[data-download-results]");
    await (await headerDownload.isVisible() ? headerDownload
      : page.locator(".bench-downloads").getByRole("button", { name: "JSON", exact: true })).click();
    assert.equal((await download).suggestedFilename(), "trace-filtered.json");
    assert.equal(await page.getByRole("link", { name: "Trace benchmark on GitHub", exact: true }).getAttribute("href"), "https://github.com/context-dot-dev/trace-benchmark");
    if (width === 390) {
      await page.getByRole("button", { name: /Open the section list/ }).click();
      await page.getByRole("dialog", { name: "Sections and sample" }).waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.ok(await page.getByRole("button", { name: /Open the section list/ }).evaluate(element => element === document.activeElement));
    }
    checks.push(`${label}: stable hydration, font loading and refresh; contained header; working actions`);
    await context.close();
  }
  currentDataset = empty;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/api/benchmark?*", route => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".bench-rail-meta").count(), 0);
  assert.equal(await page.locator(".bench-status-completed").textContent(), "");
  assert.ok((await page.locator(".bench-status-completed").boundingBox()).height > 0);
  assert.ok(await page.locator("[data-download-results]").isDisabled());
  await page.getByRole("alert").filter({ hasText: "Results could not be refreshed" }).waitFor();
  checks.push("Empty sample and failed refresh retain header space, disable downloads, and expose the error");
  assert.deepEqual(errors, [], "No browser runtime errors");
  writeFileSync(resolve(evidence, "checks.json"), JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ ok: true, checks }, null, 2));
} finally {
  await browser.close();
  app.kill("SIGTERM");
  await new Promise(resolve => fixture.close(resolve));
}
