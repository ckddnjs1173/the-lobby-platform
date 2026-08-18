const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function normalizeRoute(value) {
  return value
    .replace(/\\/g, "/")
    .replace(/^.*src\/app\/api/, "/api")
    .replace(/\/route\.ts$/, "")
    .replace(/\[[^/]+\]/g, "*")
    .replace(/\/+/g, "/");
}

function normalizeClientEndpoint(value) {
  return value
    .replace(/\$\{[^}]+\}/g, "*")
    .split("?")[0]
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

const apiRoot = path.join(root, "src", "app", "api");
const routePatterns = new Set(
  walk(apiRoot)
    .filter((file) => file.endsWith(`${path.sep}route.ts`))
    .map(normalizeRoute)
);

const clientFiles = walk(path.join(root, "src", "lib"))
  .filter((file) => /Api\.ts$/.test(file) && !file.includes(`${path.sep}server${path.sep}`));

const discovered = [];
const missing = [];
const endpointRegex = /(?:"|'|`)(\/api\/[A-Za-z0-9_\-./\[\]${}]+)(?:"|'|`)/g;

for (const file of clientFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(endpointRegex)) {
    const endpoint = normalizeClientEndpoint(match[1]);
    if (!endpoint.startsWith("/api/")) continue;
    discovered.push({ file: path.relative(root, file), endpoint });
    if (!routePatterns.has(endpoint)) missing.push({ file: path.relative(root, file), endpoint });
  }
}

if (discovered.length < 10) {
  throw new Error(`FRONTEND_BACKEND_CONTRACT_DISCOVERY_TOO_SMALL:${discovered.length}`);
}

if (missing.length > 0) {
  console.error("Missing API route handlers:");
  for (const item of missing) console.error(`- ${item.file}: ${item.endpoint}`);
  throw new Error("FRONTEND_BACKEND_ROUTE_CONTRACT_FAILED");
}

const requiredRoutes = [
  "/api/public/jobs",
  "/api/public/jobs/*",
  "/api/applications/apply",
  "/api/candidate/me",
  "/api/candidate/applications",
  "/api/candidate/applications/*/cancel",
  "/api/b2b/session",
  "/api/b2b/applications",
  "/api/b2b/candidates",
  "/api/b2b/jobs",
  "/api/b2b/analytics",
  "/api/b2b/organizations",
  "/api/health",
  "/api/readiness",
];

for (const route of requiredRoutes) {
  if (!routePatterns.has(route)) throw new Error(`CRITICAL_ROUTE_MISSING:${route}`);
}

console.log(`FRONTEND_BACKEND_CONTRACTS_DISCOVERED:${discovered.length}`);
console.log(`APP_ROUTER_API_ROUTES_DISCOVERED:${routePatterns.size}`);
console.log("FINAL_FRONTEND_BACKEND_CONTRACT_CHECK_PASSED");
