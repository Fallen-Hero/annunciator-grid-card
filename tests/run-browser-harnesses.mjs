import { spawn, spawnSync } from "node:child_process";
import {
  accessSync,
  constants as fsConstants,
  createReadStream,
  existsSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..");
const REAL_REPO_ROOT = realpathSync(REPO_ROOT);
const PROFILE_PREFIX = "annunciator-browser-harness-";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_CAPTURE_BYTES = 24 * 1024 * 1024;

// Keep this list explicit. A new top-level browser harness must be reviewed and
// intentionally added here before it can silently enter the release gate.
const HARNESS_MANIFEST = Object.freeze([
  { file: "browser-brightness-harness.html", label: "State-based lamp brightness and editor" },
  { file: "browser-derived-font-harness.html", label: "Derived lamps, tally labels, and fonts" },
  { file: "browser-dynamic-text-icon-harness.html", label: "Dynamic text and state icon colors" },
  { file: "browser-editor-cleanup-harness.html", label: "Visual editor cleanup" },
  { file: "browser-final-audit-harness.html", label: "Final layout and interaction audit" },
  { file: "browser-frame-harness.html", label: "Panel and lamp frame separation" },
  { file: "browser-history-pair-harness.html", label: "Historical tallies and paired lamps" },
  { file: "browser-icon-radius-harness.html", label: "Icons, fonts, and rounded surfaces" },
  { file: "browser-retro-alert-harness.html", label: "Retro illumination and alert effects" },
  { file: "browser-rc-polish-harness.html", label: "Release-candidate editor polish" },
  { file: "browser-spacer-ack-harness.html", label: "Spacer appearance and ACK rearm" },
  { file: "browser-spacer-differential-harness.html", label: "v1.0.2 spacer differential" },
]);

const VIEWPORTS = Object.freeze([
  { name: "desktop", width: 1440, height: 1100, mobile: false },
  { name: "mobile", width: 430, height: 932, mobile: true },
]);

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
});

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const options = { viewport: "all", filter: "", list: false };
  for (const argument of argv) {
    if (argument === "--desktop-only") options.viewport = "desktop";
    else if (argument === "--mobile-only") options.viewport = "mobile";
    else if (argument === "--list") options.list = true;
    else if (argument.startsWith("--harness=")) options.filter = argument.slice("--harness=".length).trim().toLowerCase();
    else fail(`Unknown argument: ${argument}`);
  }
  return options;
}

function validateManifest() {
  const listed = new Set();
  for (const entry of HARNESS_MANIFEST) {
    if (!/^browser-[a-z0-9-]+-harness\.html$/.test(entry.file)) fail(`Unsafe harness filename in manifest: ${entry.file}`);
    if (listed.has(entry.file)) fail(`Duplicate harness in manifest: ${entry.file}`);
    listed.add(entry.file);
    const fullPath = resolve(TESTS_DIR, entry.file);
    if (!existsSync(fullPath)) fail(`Manifest harness is missing: ${entry.file}`);
  }
  const discovered = readdirSync(TESTS_DIR)
    .filter((name) => /^browser-[a-z0-9-]+-harness\.html$/.test(name))
    .sort();
  const unlisted = discovered.filter((name) => !listed.has(name));
  const stale = [...listed].filter((name) => !discovered.includes(name));
  if (unlisted.length || stale.length) {
    fail(`Browser harness manifest mismatch. Unlisted: ${unlisted.join(", ") || "none"}; stale: ${stale.join(", ") || "none"}`);
  }
}

function executableFromPath(command) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [command], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return "";
  return String(result.stdout || "").split(/\r?\n/).map((value) => value.trim()).find(Boolean) || "";
}

function isExecutable(candidate) {
  if (!candidate) return false;
  try {
    accessSync(candidate, process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK);
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function findBrowser() {
  const requested = String(process.env.ANNUNCIATOR_BROWSER || "").trim();
  if (requested) {
    const candidate = isAbsolute(requested) ? requested : executableFromPath(requested);
    if (!isExecutable(candidate)) fail(`ANNUNCIATOR_BROWSER is not an executable browser: ${requested}`);
    return candidate;
  }

  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : process.platform === "darwin"
      ? [
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : ["microsoft-edge", "microsoft-edge-stable", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];

  for (const value of candidates) {
    const candidate = isAbsolute(value) ? value : executableFromPath(value);
    if (isExecutable(candidate)) return candidate;
  }
  fail("No supported Edge, Chrome, or Chromium executable was found. Set ANNUNCIATOR_BROWSER to its path.");
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function resolveStaticFile(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, "http://127.0.0.1").pathname);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length || !["tests", "dist"].includes(segments[0]) || segments.some((segment) => segment === "." || segment === ".." || segment.startsWith(".") || segment.includes("\\") || segment.includes(":"))) return null;

  const candidate = resolve(REPO_ROOT, ...segments);
  if (!isInside(REPO_ROOT, candidate)) return null;
  try {
    const realCandidate = realpathSync(candidate);
    if (!isInside(REAL_REPO_ROOT, realCandidate) || !statSync(realCandidate).isFile()) return null;
    return realCandidate;
  } catch {
    return null;
  }
}

function validateStaticBoundary() {
  const knownHarness = resolveStaticFile("/tests/browser-frame-harness.html");
  if (!knownHarness || basename(knownHarness) !== "browser-frame-harness.html") fail("Static-server boundary rejected a known harness");
  for (const unsafeUrl of [
    "/package.json",
    "/.git/config",
    "/tests/../../package.json",
    "/tests/%2e%2e/package.json",
    "/tests/%2e%2e%2fpackage.json",
    "/tests/%5c%5cserver%5cshare%5cfile.html",
    "/dist/%00annunciator-grid-card.js",
  ]) {
    if (resolveStaticFile(unsafeUrl)) fail(`Static-server path boundary accepted an unsafe URL: ${unsafeUrl}`);
  }
}

function createStaticServer() {
  return createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }
    const file = resolveStaticFile(request.url || "/");
    if (!file) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
      response.end("Not found");
      return;
    }
    const size = statSync(file).size;
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": size,
      "Content-Type": MIME_TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).on("error", () => response.destroy()).pipe(response);
  });
}

function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") reject(new Error("Could not determine browser harness server address"));
      else resolveListen(`http://127.0.0.1:${address.port}`);
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

function safeRemoveProfile(profilePath) {
  const tempRoot = resolve(tmpdir());
  const resolvedProfile = resolve(profilePath);
  if (!isInside(tempRoot, resolvedProfile) || dirname(resolvedProfile) !== tempRoot || !basename(resolvedProfile).startsWith(PROFILE_PREFIX)) {
    fail(`Refusing to remove unexpected browser profile path: ${resolvedProfile}`);
  }
  rmSync(resolvedProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}

function runBrowser(browserPath, url, viewport) {
  const profilePath = mkdtempSync(join(tmpdir(), PROFILE_PREFIX));
  const argumentsForBrowser = [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-features=Translate,MediaRouter,OptimizationHints",
    "--disable-gpu",
    "--disable-sync",
    "--force-device-scale-factor=1",
    "--metrics-recording-only",
    "--no-default-browser-check",
    "--no-first-run",
    `--user-data-dir=${profilePath}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "--virtual-time-budget=8000",
    "--dump-dom",
    url,
  ];
  // Some containerized CI hosts block Chromium's own sandbox. Keep the secure
  // default, but allow an explicit local-CI escape hatch for this loopback-only
  // harness server rather than silently weakening every invocation.
  if (process.env.ANNUNCIATOR_BROWSER_NO_SANDBOX === "1") argumentsForBrowser.unshift("--no-sandbox");

  return new Promise((resolveRun) => {
    const child = spawn(browserPath, argumentsForBrowser, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let failure = "";
    let settled = false;
    let terminationRequested = false;
    const terminate = () => {
      if (terminationRequested) return;
      terminationRequested = true;
      if (process.platform === "win32" && child.pid) {
        const killed = spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        if (killed.status !== 0) child.kill("SIGKILL");
      } else child.kill("SIGKILL");
    };
    const timeout = setTimeout(() => {
      if (!failure) failure = `browser timed out after ${DEFAULT_TIMEOUT_MS} ms`;
      terminate();
    }, DEFAULT_TIMEOUT_MS);

    const capture = (target, chunk, streamName) => {
      const bytes = Buffer.byteLength(chunk);
      if (streamName === "stdout") stdoutBytes += bytes;
      else stderrBytes += bytes;
      if (stdoutBytes + stderrBytes > MAX_CAPTURE_BYTES) {
        failure = `browser output exceeded ${MAX_CAPTURE_BYTES} bytes`;
        terminate();
        return;
      }
      target.push(chunk);
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => capture(stdout, chunk, "stdout"));
    child.stderr.on("data", (chunk) => capture(stderr, chunk, "stderr"));
    child.on("error", (error) => {
      failure = `could not launch browser: ${error.message}`;
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      let cleanupError = "";
      try { safeRemoveProfile(profilePath); } catch (error) { cleanupError = error.message; }
      resolveRun({
        code,
        signal,
        stdout: stdout.join(""),
        stderr: stderr.join(""),
        failure: failure || cleanupError || (code === 0 ? "" : `browser exited with code ${code}${signal ? ` (${signal})` : ""}`),
      });
    });
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readAttribute(source, name) {
  const match = String(source || "").match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return match ? (match[1] ?? match[2] ?? "") : "";
}

function inspectDump(result) {
  if (result.failure) return { passed: false, reason: result.failure, audit: "" };
  const body = result.stdout.match(/<body\b([^>]*)>/i);
  if (!body) return { passed: false, reason: "browser dump did not contain a body element", audit: "" };
  const ready = readAttribute(body[1], "data-ready");
  const status = readAttribute(body[1], "data-status");
  const auditMatch = result.stdout.match(/<[^>]*\bid=(?:"audit"|'audit')[^>]*>([\s\S]*?)<\/[^>]+>/i);
  const audit = decodeHtml(auditMatch?.[1] || "");
  if (ready !== "true") return { passed: false, reason: `harness did not finish (data-ready=${ready || "missing"})`, audit };
  if (status !== "pass") return { passed: false, reason: `harness reported data-status=${status || "missing"}`, audit };
  if (!audit) return { passed: false, reason: "harness did not provide #audit output", audit };
  if (!/\bpassed\b/i.test(audit) || /\bfailed\b/i.test(audit)) return { passed: false, reason: "#audit output did not report a pass", audit };
  return { passed: true, reason: "", audit };
}

async function main() {
  validateManifest();
  validateStaticBoundary();
  const options = parseArguments(process.argv.slice(2));
  const chosenHarnesses = options.filter
    ? HARNESS_MANIFEST.filter((entry) => entry.file.toLowerCase().includes(options.filter) || entry.label.toLowerCase().includes(options.filter))
    : [...HARNESS_MANIFEST];
  if (!chosenHarnesses.length) fail(`No browser harness matched: ${options.filter}`);
  const chosenViewports = VIEWPORTS.filter((viewport) => options.viewport === "all" || viewport.name === options.viewport);

  if (options.list) {
    for (const entry of chosenHarnesses) console.log(`${entry.file} — ${entry.label}`);
    return;
  }

  const browserPath = findBrowser();
  const server = createStaticServer();
  const baseUrl = await listen(server);
  const results = [];
  console.log(`Browser: ${browserPath}`);
  console.log(`Running ${chosenHarnesses.length} harnesses across ${chosenViewports.length} viewport${chosenViewports.length === 1 ? "" : "s"}…`);

  try {
    for (const entry of chosenHarnesses) {
      for (const viewport of chosenViewports) {
        const query = new URLSearchParams({
          runner: "1",
          run: `${viewport.name}-${Date.now()}-${results.length}`,
          ...(viewport.mobile ? { mobile: "1" } : {}),
        });
        const url = `${baseUrl}/tests/${encodeURIComponent(entry.file)}?${query}`;
        const browserResult = await runBrowser(browserPath, url, viewport);
        const inspection = inspectDump(browserResult);
        results.push({ entry, viewport, inspection, stderr: browserResult.stderr });
        const prefix = inspection.passed ? "PASS" : "FAIL";
        console.log(`${prefix}  ${viewport.name.padEnd(7)} ${entry.file}${inspection.audit ? ` — ${inspection.audit}` : ` — ${inspection.reason}`}`);
        if (!inspection.passed && browserResult.stderr.trim()) {
          const useful = browserResult.stderr.split(/\r?\n/).filter((line) => line.trim() && !line.includes("DevTools listening")).slice(-8).join("\n");
          if (useful) console.error(useful);
        }
      }
    }
  } finally {
    await closeServer(server);
  }

  const failures = results.filter((result) => !result.inspection.passed);
  console.log(`\nBrowser harness result: ${results.length - failures.length}/${results.length} passed.`);
  if (failures.length) {
    for (const failure of failures) console.error(`- ${failure.viewport.name}/${failure.entry.file}: ${failure.inspection.reason}${failure.inspection.audit ? ` — ${failure.inspection.audit}` : ""}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Browser harness runner failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
